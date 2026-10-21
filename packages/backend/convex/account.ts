import { R2 } from "@convex-dev/r2";

import { components } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";
import { SYNCED_TABLES } from "./lib/syncTables";
import { usingR2 } from "./photos";

const r2 = new R2(components.r2);

/** Bounded by a mutation's document budget; the caller re-runs until done. */
export const PURGE_BATCH = 200;

/** Photos first: they live outside Convex, so a half-finished purge could orphan one forever. */
export async function purgeUserBatch(ctx: MutationCtx, userId: string): Promise<{ done: boolean; removed: number }> {
    const photos = await ctx.db
        .query("photoSizes")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .take(PURGE_BATCH);
    if (photos.length > 0) {
        await Promise.all(
            photos.map(async (photo) => {
                await releaseObject(ctx, photo.key);
                await ctx.db.delete(photo._id);
            })
        );
        return { done: false, removed: photos.length };
    }

    const suggestions = await ctx.db
        .query("enrichmentJobs")
        .withIndex("by_user_and_status", (q) => q.eq("userId", userId))
        .take(PURGE_BATCH);
    if (suggestions.length > 0) {
        await Promise.all(suggestions.map((row) => ctx.db.delete(row._id)));
        return { done: false, removed: suggestions.length };
    }

    /* oxlint-disable no-await-in-loop -- the loop stops at the first table that still holds rows; hoisting would read every synced table on every pass, past PURGE_BATCH's budget. */
    for (const table of SYNCED_TABLES) {
        const rows = await ctx.db
            .query(table)
            .withIndex("by_user_and_seq", (q) => q.eq("userId", userId))
            .take(PURGE_BATCH);
        if (rows.length === 0) {
            continue;
        }
        await Promise.all(rows.map((row) => ctx.db.delete(row._id)));
        return { done: false, removed: rows.length };
    }
    /* oxlint-enable no-await-in-loop */

    // Last: it stamps `seq`, so removing it early restarts numbering under higher seqs.
    const state = await ctx.db
        .query("syncState")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .unique();
    if (state) {
        await ctx.db.delete(state._id);
        return { done: true, removed: 1 };
    }
    return { done: true, removed: 0 };
}
/** No ownership check: every row that could name the object is going too. */
async function releaseObject(ctx: MutationCtx, key: string): Promise<void> {
    const mapping = await ctx.db
        .query("photoObjects")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique();
    if (mapping) {
        await ctx.db.delete(mapping._id);
        await ctx.storage.delete(mapping.storageId);
        return;
    }
    if (usingR2()) {
        await r2.deleteObject(ctx, key);
    }
}
