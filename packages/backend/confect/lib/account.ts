import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";

import { components } from "../../convex/_generated/api";
import type { MutationCtx } from "../../convex/_generated/server";
import { COPY_BATCH } from "../sharedReports";
import { componentProvider, storageSetup } from "./storageSetup";
import { SYNCED_TABLES } from "./syncTables";

/** Bounded by a mutation's document budget; the caller re-runs until done. */
export const PURGE_BATCH = 200;

const CELLS_PURGE_BATCH = 8;

const FORGOTTEN_LOOK = { customColor: null, emoji: null, icon: null, imageColor: null, imageKey: null, name: "" };

/** Webhooks first, so nothing is sent while the rest goes; then photos, which live outside Convex. */
export const purgeUserBatch = Effect.fn("Account.purgeUserBatch")(function* purgeUserBatch(
    ctx: MutationCtx,
    userId: string
) {
    for (const table of ["webhookDeliveries", "webhookEvents", "inboundWrites", "bankAccounts"] as const) {
        const queued = yield* Effect.promise(() =>
            ctx.db
                .query(table)
                .withIndex("by_userId", (q) => q.eq("userId", userId))
                .take(PURGE_BATCH)
        );
        if (queued.length > 0) {
            yield* Effect.all(
                queued.map((row) => Effect.promise(() => ctx.db.delete(row._id))),
                { concurrency: "unbounded", discard: true }
            );
            return { done: false, removed: queued.length };
        }
    }
    for (const table of ["webhookEndpoints", "webhookTokens"] as const) {
        const rows = yield* Effect.promise(() =>
            ctx.db
                .query(table)
                .withIndex("by_userId", (q) => q.eq("userId", userId))
                .collect()
        );
        yield* Effect.all(
            rows.map((row) => Effect.promise(() => ctx.db.delete(row._id))),
            { concurrency: "unbounded", discard: true }
        );
    }

    // Before the ledger rows. An owner's memberships stay as anonymous markers so a member's device is refused
    // rather than reading an empty ledger under the same id; the person's own memberships and invites go.
    const [ownedShares, joinedShares, sentInvites] = yield* Effect.promise(() =>
        Promise.all([
            ctx.db
                .query("profileMembers")
                .withIndex("by_ownerId_and_leftAt", (q) => q.eq("ownerId", userId))
                .take(PURGE_BATCH),
            ctx.db
                .query("profileMembers")
                .withIndex("by_memberId_and_leftAt", (q) => q.eq("memberId", userId))
                .take(PURGE_BATCH),
            ctx.db
                .query("profileInvites")
                .withIndex("by_ownerId", (q) => q.eq("ownerId", userId))
                .take(PURGE_BATCH),
        ])
    );
    if (ownedShares.length + joinedShares.length + sentInvites.length > 0) {
        const now = yield* Clock.currentTimeMillis;
        yield* Effect.all(
            [
                ...ownedShares.map((row) =>
                    Effect.promise(() =>
                        ctx.db.patch(row._id, {
                            leftAt: row.leftAt ?? now,
                            look: FORGOTTEN_LOOK,
                            ownerId: `deleted:${row._id}`,
                        })
                    )
                ),
                ...[...joinedShares, ...sentInvites].map((row) => Effect.promise(() => ctx.db.delete(row._id))),
            ],
            { concurrency: "unbounded", discard: true }
        );
        return { done: false, removed: ownedShares.length + joinedShares.length + sentInvites.length };
    }

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
            .withIndex("by_user_device_and_status", (q) => q.eq("userId", userId))
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

    // After the rows: a refresh still queued then finds no rows and writes nothing back.
    const ownCells = yield* Effect.promise(() =>
        ctx.db
            .query("ledgerCells")
            .withIndex("by_user_and_month", (q) => q.eq("userId", userId))
            .take(CELLS_PURGE_BATCH)
    );
    const cells =
        ownCells.length > 0
            ? ownCells
            : yield* Effect.promise(() =>
                  ctx.db
                      .query("ledgerCells")
                      .withIndex("by_user_and_month", (q) => q.gt("userId", `${userId}:`).lt("userId", `${userId};`))
                      .take(CELLS_PURGE_BATCH)
              );
    if (cells.length > 0) {
        yield* Effect.all(
            cells.map((row) => Effect.promise(() => ctx.db.delete(row._id))),
            { concurrency: "unbounded", discard: true }
        );
        return { done: false, removed: cells.length };
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

    const captureKeys = yield* Effect.promise(() =>
        ctx.db
            .query("captureKeys")
            .withIndex("by_user_and_device", (q) => q.eq("userId", userId))
            .collect()
    );
    yield* Effect.all(
        captureKeys.map((row) => Effect.promise(() => ctx.db.delete(row._id))),
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

    const sharedRows = yield* Effect.promise(() =>
        ctx.db
            .query("sharedReports")
            .withIndex("by_userId_and_reportId", (q) => q.eq("userId", userId))
            .take(COPY_BATCH)
    );
    if (sharedRows.length > 0) {
        yield* Effect.all(
            sharedRows.map((row) => Effect.promise(() => ctx.db.delete(row._id))),
            { concurrency: "unbounded", discard: true }
        );
        return { done: false, removed: sharedRows.length };
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
    const setup = yield* storageSetup;
    yield* Effect.promise(() =>
        ctx.runMutation(components.storage.objects.remove, { key, provider: componentProvider(setup) })
    );
});
