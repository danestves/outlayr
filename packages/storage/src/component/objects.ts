import type { Infer } from "convex/values";
import { v } from "convex/values";
import { FilesError } from "files-sdk";

import { internal } from "./_generated/api.js";
import type { Id } from "./_generated/dataModel.js";
import type { MutationCtx, QueryCtx } from "./_generated/server.js";
import { action, internalAction, internalMutation, mutation } from "./_generated/server.js";
import { bucketFor } from "./bucket";
import { provider } from "./provider";

const DEFAULT_UPLOAD_TTL_SECONDS = 900;
const MAX_REMOVE_ATTEMPTS = 5;
const REMOVE_RETRY_BASE_MS = 30_000;

const confirmation = v.union(
    v.object({ bytes: v.number(), kind: v.literal("stored") }),
    v.object({ kind: v.literal("missing") }),
    v.object({ kind: v.literal("boundElsewhere") })
);

type Confirmation = Infer<typeof confirmation>;

const objectFor = (ctx: QueryCtx, key: string) =>
    ctx.db
        .query("objects")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique();

const deleteBlob = async (ctx: MutationCtx, storageId: Id<"_storage">) => {
    if (await ctx.db.system.get("_storage", storageId)) {
        await ctx.storage.delete(storageId);
    }
};

// Convex file storage only accepts POST and a presigned bucket url only PUT, so the method travels with the url.
export const uploadUrl = mutation({
    args: { expiresIn: v.optional(v.number()), key: v.string(), provider },
    returns: v.object({ method: v.union(v.literal("POST"), v.literal("PUT")), url: v.string() }),
    handler: async (ctx, args) => {
        const bucket = bucketFor(args.provider);
        if (!bucket) {
            return { method: "POST" as const, url: await ctx.storage.generateUploadUrl() };
        }
        const upload = await bucket.signedUploadUrl(args.key, {
            expiresIn: args.expiresIn ?? DEFAULT_UPLOAD_TTL_SECONDS,
        });
        return { method: "PUT" as const, url: upload.url };
    },
});

// Convex file storage answers the upload with the id it allocated, which the client hands back as `storageId`.
export const confirmUpload = action({
    args: { key: v.string(), provider, storageId: v.optional(v.string()) },
    returns: confirmation,
    handler: async (ctx, args): Promise<Confirmation> => {
        if (args.storageId !== undefined) {
            return await ctx.runMutation(internal.objects.bind, { key: args.key, storageId: args.storageId });
        }
        const bucket = bucketFor(args.provider);
        if (!bucket) {
            return { kind: "missing" as const };
        }
        try {
            const meta = await bucket.head(args.key);
            return { bytes: meta.size, kind: "stored" as const };
        } catch (error) {
            if (error instanceof FilesError && error.code === "NotFound") {
                return { kind: "missing" as const };
            }
            throw error;
        }
    },
});

export const bind = internalMutation({
    args: { key: v.string(), storageId: v.string() },
    returns: confirmation,
    handler: async (ctx, args) => {
        const storageId = ctx.db.system.normalizeId("_storage", args.storageId);
        const file = storageId ? await ctx.db.system.get("_storage", storageId) : null;
        if (!storageId || !file) {
            return { kind: "missing" as const };
        }
        const bound = await ctx.db
            .query("objects")
            .withIndex("by_storageId", (q) => q.eq("storageId", storageId))
            .first();
        if (bound && bound.key !== args.key) {
            return { kind: "boundElsewhere" as const };
        }
        const existing = await objectFor(ctx, args.key);
        if (!existing) {
            await ctx.db.insert("objects", { key: args.key, storageId });
        } else if (existing.storageId !== storageId) {
            await deleteBlob(ctx, existing.storageId);
            await ctx.db.patch("objects", existing._id, { storageId });
        }
        return { bytes: file.size, kind: "stored" as const };
    },
});

// A mutation though it writes nothing, so a caller's mutation can mint fresh urls instead of a cached query's.
export const urls = mutation({
    args: { expiresIn: v.number(), keys: v.array(v.string()), provider },
    returns: v.array(v.object({ key: v.string(), url: v.string() })),
    handler: async (ctx, args) => {
        const bucket = bucketFor(args.provider);
        const minted = await Promise.all(
            args.keys.map(async (key) => {
                const row = await objectFor(ctx, key);
                if (row) {
                    const url = await ctx.storage.getUrl(row.storageId);
                    return url === null ? null : { key, url };
                }
                return bucket ? { key, url: await bucket.url(key, { expiresIn: args.expiresIn }) } : null;
            })
        );
        return minted.filter((entry) => entry !== null);
    },
});

// A bucket delete is a network call, which a mutation cannot make, so it runs in a scheduled action.
export const remove = mutation({
    args: { key: v.string(), provider },
    returns: v.null(),
    handler: async (ctx, args) => {
        const row = await objectFor(ctx, args.key);
        if (row) {
            await ctx.db.delete("objects", row._id);
            await deleteBlob(ctx, row.storageId);
            return null;
        }
        if (args.provider.kind !== "convex") {
            await ctx.scheduler.runAfter(0, internal.objects.removeFromBucket, {
                attempt: 1,
                key: args.key,
                provider: args.provider,
            });
        }
        return null;
    },
});

export const removeFromBucket = internalAction({
    args: { attempt: v.number(), key: v.string(), provider },
    returns: v.null(),
    handler: async (ctx, args) => {
        const bucket = bucketFor(args.provider);
        if (!bucket) {
            return null;
        }
        try {
            await bucket.delete(args.key);
        } catch (error) {
            if (args.attempt >= MAX_REMOVE_ATTEMPTS) {
                throw error;
            }
            await ctx.scheduler.runAfter(REMOVE_RETRY_BASE_MS * 2 ** args.attempt, internal.objects.removeFromBucket, {
                ...args,
                attempt: args.attempt + 1,
            });
        }
        return null;
    },
});
