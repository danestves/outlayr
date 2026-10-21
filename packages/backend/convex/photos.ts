import { R2 } from "@convex-dev/r2";
import { ConvexError, v } from "convex/values";

import { components, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, internalMutation, internalQuery, mutation } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { requireUserId } from "./lib/auth";
import { isPhotoName, ownsPhotoKey, photoKeyFor, photoOwnerFromKey } from "./lib/photoKeys";
import { requirePro } from "./revenuecat";

// Photo bytes travel outside sync.ts, to R2 when all four R2_* vars are set and Convex storage otherwise. The key
// is the same either way, so a row resolves through whichever backend stored it and turning R2 on later is safe.
const r2 = new R2(components.r2);

// Read per call, so a deployment that gains its R2 variables uses them on the next call, not the next cold start.
export function usingR2(): boolean {
    return (
        !!process.env.R2_BUCKET &&
        !!process.env.R2_ENDPOINT &&
        !!process.env.R2_ACCESS_KEY_ID &&
        !!process.env.R2_SECRET_ACCESS_KEY
    );
}

async function photoUrl(ctx: QueryCtx, key: string): Promise<string | null> {
    const storageId = await storageIdFor(ctx, key);
    if (storageId) {
        return await ctx.storage.getUrl(storageId);
    }
    return usingR2() ? await r2.getUrl(key, { expiresIn: PHOTO_URL_TTL_SECONDS }) : null;
}

async function storageIdFor(ctx: QueryCtx, key: string): Promise<Id<"_storage"> | null> {
    const row = await ctx.db
        .query("photoObjects")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique();
    return row ? row.storageId : null;
}

// Above the 900s default so a backlog download outlives no url; far below 7 days, as the url guards a leaked link.
export const PHOTO_URL_TTL_SECONDS = 3600;

export const PHOTO_URL_BATCH_LIMIT = 100;

// Only ever raise this: lowering it strands accounts already above the line.
export const PHOTO_QUOTA_BYTES = 2 * 1024 * 1024 * 1024;

// Refused before a url is minted: once a client holds a signed PUT the bytes are R2's problem. It bounds what is
// already stored, because this upload's size is unknown until the bytes exist.
async function checkPhotoQuota(ctx: QueryCtx, userId: string): Promise<void> {
    const stored = await ctx.db
        .query("photoSizes")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
    const used = stored.reduce((total, row) => total + row.bytes, 0);
    if (used >= PHOTO_QUOTA_BYTES) {
        throw new ConvexError({
            code: "PHOTO_QUOTA_EXCEEDED",
            limit: PHOTO_QUOTA_BYTES,
            used,
        });
    }
}

// A retry reuses its key, so a device crashing repeatedly on one photo occupies one slot.
const UNCONFIRMED_UPLOAD_LIMIT = 50;

// The key derives from the file name, so a retried PUT lands on the same key: R2 has nothing to roll back. It is
// recorded at 0 bytes before the url goes out, so a never-confirmed upload stays findable for purge and quota.
export const requestUpload = mutation({
    args: { name: v.string() },
    handler: async (ctx, args) => {
        const userId = await requireUserId(ctx);
        await requirePro(ctx, userId);
        if (!isPhotoName(args.name)) {
            throw new ConvexError(`Not a photo file name: ${args.name}`);
        }
        await checkPhotoQuota(ctx, userId);
        const key = photoKeyFor(userId, args.name);
        await reserveUploadKey(ctx, userId, key);
        if (usingR2()) {
            return await r2.generateUploadUrl(key);
        }
        return { key, url: await ctx.storage.generateUploadUrl() };
    },
    returns: v.object({ key: v.string(), url: v.string() }),
});

// An unconfirmed object has no size for the quota to count, so without this cap an account could mint urls forever.
async function reserveUploadKey(ctx: MutationCtx, userId: string, key: string): Promise<void> {
    const existing = await ctx.db
        .query("photoSizes")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique();
    if (existing) {
        return;
    }
    const unweighed = await ctx.db
        .query("photoSizes")
        .withIndex("by_user_and_bytes", (q) => q.eq("userId", userId).eq("bytes", 0))
        .take(UNCONFIRMED_UPLOAD_LIMIT);
    if (unweighed.length >= UNCONFIRMED_UPLOAD_LIMIT) {
        throw new ConvexError({
            code: "PHOTO_UPLOADS_UNCONFIRMED",
            limit: UNCONFIRMED_UPLOAD_LIMIT,
        });
    }
    await ctx.db.insert("photoSizes", { bytes: 0, key, userId });
}

export const callerId = internalQuery({
    args: {},
    handler: async (ctx) => await requireUserId(ctx),
    returns: v.string(),
});

// An action because `syncMetadata` reads the object back out of R2. A crash before this call leaves a durable photo
// with no accounting, which the next upload of the same key repairs.
export const confirmUpload = action({
    args: { key: v.string(), storageId: v.optional(v.id("_storage")) },
    handler: async (ctx, args) => {
        const userId: string = await ctx.runQuery(internal.photos.callerId, {});
        if (!ownsPhotoKey(userId, args.key)) {
            throw new ConvexError("That photo does not belong to this account");
        }
        if (args.storageId) {
            await ctx.runMutation(internal.photos.mapStorageId, {
                key: args.key,
                storageId: args.storageId,
            });
            return null;
        }
        await r2.syncMetadata(ctx, args.key);
        // Read after the sync, or there is no metadata row. A missing size records zero: losing a photo is worse.
        const metadata = await r2.getMetadata(ctx, args.key);
        await ctx.runMutation(internal.photos.recordPhotoSize, {
            bytes: metadata?.size ?? 0,
            key: args.key,
        });
        return null;
    },
    returns: v.null(),
});

export const recordPhotoSize = internalMutation({
    args: { bytes: v.number(), key: v.string() },
    handler: async (ctx, args) => {
        await writePhotoSize(ctx, args.key, args.bytes);
        return null;
    },
    returns: v.null(),
});

// A malformed key records nothing rather than throwing, which would fail an upload whose bytes are safely stored.
async function writePhotoSize(ctx: MutationCtx, key: string, bytes: number): Promise<void> {
    const userId = photoOwnerFromKey(key);
    if (userId === null) {
        return;
    }
    const existing = await ctx.db
        .query("photoSizes")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique();
    if (existing) {
        await ctx.db.patch(existing._id, { bytes });
        return;
    }
    await ctx.db.insert("photoSizes", { bytes, key, userId });
}

async function forgetPhotoSize(ctx: MutationCtx, key: string): Promise<void> {
    const row = await ctx.db
        .query("photoSizes")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique();
    if (row) {
        await ctx.db.delete(row._id);
    }
}

export const mapStorageId = internalMutation({
    args: { key: v.string(), storageId: v.id("_storage") },
    handler: async (ctx, args) => {
        const boundElsewhere = await ctx.db
            .query("photoObjects")
            .withIndex("by_storageId", (q) => q.eq("storageId", args.storageId))
            .first();
        if (boundElsewhere && boundElsewhere.key !== args.key) {
            throw new ConvexError("That upload does not belong to this photo");
        }
        const existing = await ctx.db
            .query("photoObjects")
            .withIndex("by_key", (q) => q.eq("key", args.key))
            .unique();
        const stored = await ctx.db.system.get(args.storageId);
        await writePhotoSize(ctx, args.key, stored?.size ?? 0);
        if (existing) {
            if (existing.storageId !== args.storageId) {
                await ctx.storage.delete(existing.storageId);
                await ctx.db.patch(existing._id, { storageId: args.storageId });
            }
            return null;
        }
        await ctx.db.insert("photoObjects", {
            key: args.key,
            storageId: args.storageId,
        });
        return null;
    },
    returns: v.null(),
});

// A mutation though it writes nothing: Convex caches a query until its read set changes, so an expired url would
// be served forever. An unowned key is dropped, not refused, so one stale key does not cost the whole batch.
export const readUrls = mutation({
    args: { keys: v.array(v.string()) },
    handler: async (ctx, args) => {
        const userId = await requireUserId(ctx);
        if (args.keys.length > PHOTO_URL_BATCH_LIMIT) {
            throw new ConvexError(`A read asks for at most ${PHOTO_URL_BATCH_LIMIT} urls; got ${args.keys.length}`);
        }

        const owned = args.keys.filter((key) => ownsPhotoKey(userId, key));
        const minted = await Promise.all(
            owned.map(async (key) => {
                const url = await photoUrl(ctx, key);
                return url === null ? null : { key, url };
            })
        );
        return minted.filter((entry): entry is { key: string; url: string } => Boolean(entry));
    },
    returns: v.array(v.object({ key: v.string(), url: v.string() })),
});

// Must match apps/native/src/data/photo-store-core.ts: a table left out reads as unreferenced and its bytes are
// freed while a row still points at them.
const IMAGE_KEY_TABLES = ["transactions", "accounts", "transactionPhotos"] as const;

// Tombstoned rows count: undo restores from them and a device that has not pulled yet still renders them.
async function isReferenced(ctx: MutationCtx, userId: string, key: string): Promise<boolean> {
    /* oxlint-disable no-await-in-loop -- the first table that names the key answers the question; running all three would read rows nobody needs */
    for (const table of IMAGE_KEY_TABLES) {
        const row = await ctx.db
            .query(table)
            .withIndex("by_user_and_imageKey", (q) => q.eq("userId", userId).eq("imageKey", key))
            .first();
        if (row) {
            return true;
        }
    }
    /* oxlint-enable no-await-in-loop */
    return false;
}

// R2 cannot share a transaction with the tombstone, so the reference goes before the bytes: a crash leaks a
// reclaimable object instead of leaving a row naming missing bytes. A device mid-download gets a 404 and retries.
export const releaseUnreferenced = mutation({
    args: { key: v.string() },
    handler: async (ctx, args) => {
        const userId = await requireUserId(ctx);
        if (!ownsPhotoKey(userId, args.key)) {
            throw new ConvexError("That photo does not belong to this account");
        }
        if (await isReferenced(ctx, userId, args.key)) {
            return { released: false };
        }
        const mapping = await ctx.db
            .query("photoObjects")
            .withIndex("by_key", (q) => q.eq("key", args.key))
            .unique();
        if (mapping) {
            await ctx.db.delete(mapping._id);
            await ctx.storage.delete(mapping.storageId);
            await forgetPhotoSize(ctx, args.key);
            return { released: true };
        }
        if (usingR2()) {
            await r2.deleteObject(ctx, args.key);
        }
        await forgetPhotoSize(ctx, args.key);
        return { released: true };
    },
    returns: v.object({ released: v.boolean() }),
});
