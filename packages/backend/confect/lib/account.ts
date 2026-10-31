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
        const own = yield* Effect.promise(() =>
            ctx.db
                .query(table)
                .withIndex("by_user_and_seq", (q) => q.eq("userId", userId))
                .take(PURGE_BATCH)
        );
        const rows =
            own.length > 0
                ? own
                : yield* Effect.promise(() =>
                      ctx.db
                          .query(table)
                          .withIndex("by_user_and_seq", (q) => q.gt("userId", `${userId}:`).lt("userId", `${userId};`))
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

    const profileStates = yield* Effect.promise(() =>
        ctx.db
            .query("syncState")
            .withIndex("by_user", (q) => q.gt("userId", `${userId}:`).lt("userId", `${userId};`))
            .take(PURGE_BATCH)
    );
    if (profileStates.length > 0) {
        yield* Effect.all(
            profileStates.map((row) => Effect.promise(() => ctx.db.delete(row._id))),
            { concurrency: "unbounded", discard: true }
        );
        return { done: false, removed: profileStates.length };
    }

    const mail = yield* Effect.promise(() =>
        ctx.db
            .query("mailState")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .unique()
    );
    if (mail) {
        yield* Effect.promise(() => ctx.db.delete(mail._id));
    }
    const mailRemoved = mail ? 1 : 0;

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
