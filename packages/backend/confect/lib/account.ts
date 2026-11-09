import { R2 } from "@convex-dev/r2";
import * as Effect from "effect/Effect";

import { components } from "../../convex/_generated/api";
import type { MutationCtx } from "../../convex/_generated/server";
import { usingR2 } from "../photos";
import { SYNCED_TABLES } from "./syncTables";

const r2 = new R2(components.r2);

/** Bounded by a mutation's document budget; the caller re-runs until done. */
export const PURGE_BATCH = 200;

/** Photos first: they live outside Convex, so a half-finished purge could orphan one forever. */
export const purgeUserBatch = Effect.fn("Account.purgeUserBatch")(function* purgeUserBatch(
    ctx: MutationCtx,
    userId: string
) {
    const photos = yield* Effect.promise(() =>
        ctx.db
            .query("photoSizes")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .take(PURGE_BATCH)
    );
    if (photos.length > 0) {
        yield* Effect.all(
            photos.map((photo) =>
                releaseObject(ctx, photo.key).pipe(Effect.andThen(Effect.promise(() => ctx.db.delete(photo._id))))
            ),
            { concurrency: "unbounded", discard: true }
        );
        return { done: false, removed: photos.length };
    }

    const suggestions = yield* Effect.promise(() =>
        ctx.db
            .query("enrichmentJobs")
            .withIndex("by_user_and_status", (q) => q.eq("userId", userId))
            .take(PURGE_BATCH)
    );
    if (suggestions.length > 0) {
        yield* Effect.all(
            suggestions.map((row) => Effect.promise(() => ctx.db.delete(row._id))),
            { concurrency: "unbounded", discard: true }
        );
        return { done: false, removed: suggestions.length };
    }

    // The loop stops at the first table that still holds rows; hoisting would read every synced table on every
    // pass, past PURGE_BATCH's budget.
    for (const table of SYNCED_TABLES) {
        const rows = yield* Effect.promise(() =>
            ctx.db
                .query(table)
                .withIndex("by_user_and_seq", (q) => q.eq("userId", userId))
                .take(PURGE_BATCH)
        );
        if (rows.length === 0) {
            continue;
        }
        yield* Effect.all(
            rows.map((row) => Effect.promise(() => ctx.db.delete(row._id))),
            { concurrency: "unbounded", discard: true }
        );
        return { done: false, removed: rows.length };
    }

    const invites = yield* Effect.promise(() =>
        ctx.db
            .query("referrals")
            .withIndex("by_referrerId_and_rewardedAt", (q) => q.eq("referrerId", userId))
            .take(PURGE_BATCH)
    );
    if (invites.length > 0) {
        yield* Effect.all(
            invites.map((row) => Effect.promise(() => ctx.db.delete(row._id))),
            { concurrency: "unbounded", discard: true }
        );
        return { done: false, removed: invites.length };
    }

    const [asFriend, ...owned] = yield* Effect.promise(() =>
        Promise.all([
            ctx.db
                .query("referrals")
                .withIndex("by_referredId", (q) => q.eq("referredId", userId))
                .unique(),
            ctx.db
                .query("referralCodes")
                .withIndex("by_userId", (q) => q.eq("userId", userId))
                .unique(),
            ctx.db
                .query("referralRewards")
                .withIndex("by_userId", (q) => q.eq("userId", userId))
                .unique(),
        ])
    );
    const countsTowardCap = asFriend !== null && asFriend.rewardedAt !== null;
    if (countsTowardCap) {
        yield* Effect.promise(() =>
            ctx.db.patch(asFriend._id, { referredId: `deleted:${asFriend._id}`, referredName: null })
        );
    }
    const referralDocs = [...owned, countsTowardCap ? null : asFriend].filter((row) => row !== null);
    yield* Effect.all(
        referralDocs.map((row) => Effect.promise(() => ctx.db.delete(row._id))),
        { concurrency: "unbounded", discard: true }
    );

    const pushRows = yield* Effect.promise(() =>
        ctx.db
            .query("webPushSubscriptions")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .collect()
    );
    yield* Effect.all(
        pushRows.map((row) => Effect.promise(() => ctx.db.delete(row._id))),
        { concurrency: "unbounded", discard: true }
    );

    const mail = yield* Effect.promise(() =>
        ctx.db
            .query("mailState")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .unique()
    );
    if (mail) {
        yield* Effect.promise(() => ctx.db.delete(mail._id));
    }
    const mailRemoved = (mail ? 1 : 0) + referralDocs.length;

    // Last: it stamps `seq`, so removing it early restarts numbering under higher seqs.
    const state = yield* Effect.promise(() =>
        ctx.db
            .query("syncState")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .unique()
    );
    if (state) {
        yield* Effect.promise(() => ctx.db.delete(state._id));
        return { done: true, removed: mailRemoved + 1 };
    }
    return { done: true, removed: mailRemoved };
});

/** No ownership check: every row that could name the object is going too. */
const releaseObject = Effect.fn("Account.releaseObject")(function* releaseObject(ctx: MutationCtx, key: string) {
    const mapping = yield* Effect.promise(() =>
        ctx.db
            .query("photoObjects")
            .withIndex("by_key", (q) => q.eq("key", key))
            .unique()
    );
    if (mapping) {
        yield* Effect.promise(() => ctx.db.delete(mapping._id));
        yield* Effect.promise(() => ctx.storage.delete(mapping.storageId));
        return;
    }
    if (yield* usingR2) {
        yield* Effect.promise(() => r2.deleteObject(ctx, key));
    }
});
