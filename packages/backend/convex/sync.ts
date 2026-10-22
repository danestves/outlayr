import type { WithoutSystemFields } from "convex/server";
import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { requireUserId } from "./lib/auth";
import {
    accountFields,
    appMetaFields,
    budgetFields,
    categoryFields,
    FIELDS_BY_TABLE,
    incomingWins,
    installmentFields,
    installmentPlanFields,
    outsideMoveFields,
    outsidePaymentFields,
    mainBudgetFields,
    SYNCED_TABLES,
    savingsGoalFields,
    tagFields,
    transactionFields,
    transactionPhotoFields,
    transactionSplitFields,
    transactionTagFields,
    transferFields,
} from "./lib/syncTables";
import type { SyncedTable, WireFields, WireValue } from "./lib/syncTables";
import { requirePro } from "./revenuecat";

// Convex reads at most 4,096 index ranges per transaction and push does one lookup per row, so 500 is an 8x margin.
export const PUSH_BATCH_LIMIT = 500;

export const PULL_PAGE_LIMIT = 1000;

const tombstone = {
    deletedAt: v.union(v.number(), v.null()),
    restoredAt: v.optional(v.union(v.number(), v.null())),
    updatedAt: v.number(),
};

// A row names its own table so a batch keeps the outbox's edit order across tables; sorting by table breaks causality.
const pushRow = v.union(
    v.object({
        localId: v.string(),
        table: v.literal("categories"),
        ...tombstone,
        fields: v.object(categoryFields),
    }),
    v.object({
        localId: v.string(),
        table: v.literal("transactions"),
        ...tombstone,
        fields: v.object(transactionFields),
    }),
    v.object({
        localId: v.string(),
        table: v.literal("budgets"),
        ...tombstone,
        fields: v.object(budgetFields),
    }),
    v.object({
        localId: v.string(),
        table: v.literal("mainBudget"),
        ...tombstone,
        fields: v.object(mainBudgetFields),
    }),
    v.object({
        localId: v.string(),
        table: v.literal("savingsGoals"),
        ...tombstone,
        fields: v.object(savingsGoalFields),
    }),
    v.object({
        localId: v.string(),
        table: v.literal("tags"),
        ...tombstone,
        fields: v.object(tagFields),
    }),
    v.object({
        localId: v.string(),
        table: v.literal("transactionTags"),
        ...tombstone,
        fields: v.object(transactionTagFields),
    }),
    v.object({
        localId: v.string(),
        table: v.literal("transactionPhotos"),
        ...tombstone,
        fields: v.object(transactionPhotoFields),
    }),
    v.object({
        localId: v.string(),
        table: v.literal("transactionSplits"),
        ...tombstone,
        fields: v.object(transactionSplitFields),
    }),
    v.object({
        localId: v.string(),
        table: v.literal("accounts"),
        ...tombstone,
        fields: v.object(accountFields),
    }),
    v.object({
        localId: v.string(),
        table: v.literal("transfers"),
        ...tombstone,
        fields: v.object(transferFields),
    }),
    v.object({
        localId: v.string(),
        table: v.literal("installmentPlans"),
        ...tombstone,
        fields: v.object(installmentPlanFields),
    }),
    v.object({
        localId: v.string(),
        table: v.literal("installments"),
        ...tombstone,
        fields: v.object(installmentFields),
    }),
    v.object({
        localId: v.string(),
        table: v.literal("outsidePayments"),
        ...tombstone,
        fields: v.object(outsidePaymentFields),
    }),
    v.object({
        localId: v.string(),
        table: v.literal("outsideMoves"),
        ...tombstone,
        fields: v.object(outsideMoveFields),
    }),
    v.object({
        deletedAt: v.null(),
        fields: v.object(appMetaFields),
        localId: v.string(),
        table: v.literal("appMeta"),
        updatedAt: v.number(),
    })
);

interface PushRow {
    deletedAt: number | null;
    fields: WireFields;
    localId: string;
    restoredAt?: number | null;
    table: SyncedTable;
    updatedAt: number;
}

const syncedTable = v.union(...SYNCED_TABLES.map((table) => v.literal(table)));

const pulledRow = v.object({
    deletedAt: v.union(v.number(), v.null()),
    deviceId: v.string(),
    fields: v.record(v.string(), v.any()),
    localId: v.string(),
    restoredAt: v.union(v.number(), v.null()),
    seq: v.number(),
    table: syncedTable,
    updatedAt: v.number(),
});

async function findExisting(ctx: MutationCtx, userId: string, row: PushRow): Promise<Doc<SyncedTable> | null> {
    if (row.table === "appMeta") {
        return await ctx.db
            .query("appMeta")
            .withIndex("by_user_and_key", (q) => q.eq("userId", userId).eq("key", row.localId))
            .unique();
    }
    return await ctx.db
        .query(row.table)
        .withIndex("by_user_and_localId", (q) => q.eq("userId", userId).eq("localId", row.localId))
        .unique();
}

function versioned(doc: Doc<SyncedTable>) {
    return {
        deletedAt: "deletedAt" in doc ? doc.deletedAt : null,
        deviceId: doc.deviceId,
        restoredAt: "restoredAt" in doc ? doc.restoredAt : null,
        updatedAt: doc.updatedAt,
    };
}

const TRANSACTION_VALUATION_FIELDS = new Set(["amountUsd", "exchangeRate", "exchangeRateType"]);
const TRANSACTION_LEGACY_OPTIONAL_NULLABLE_FIELDS = new Set<keyof typeof transactionFields>([
    "accountId",
    "recurringAnchorDay",
    "transferId",
    "feeForId",
    "feeRate",
    "paidVia",
    "installmentId",
]);

function transactionFieldsEqual(
    field: keyof typeof transactionFields,
    stored: WireValue | undefined,
    incoming: WireValue | undefined
): boolean {
    if (TRANSACTION_LEGACY_OPTIONAL_NULLABLE_FIELDS.has(field)) {
        return Object.is(stored ?? null, incoming ?? null);
    }
    return Object.is(stored, incoming);
}

function transactionPolicyTieDecision(row: PushRow, existing: Doc<SyncedTable> | null): "existing" | "incoming" | null {
    if (
        row.table !== "transactions" ||
        existing === null ||
        row.deletedAt !== null ||
        !("deletedAt" in existing) ||
        existing.deletedAt !== null ||
        row.updatedAt !== existing.updatedAt ||
        (row.restoredAt ?? null) !== (existing.restoredAt ?? null)
    ) {
        return null;
    }
    // SAFETY: the guard above returned unless `row.table` is "transactions", the table `existing` came from.
    const stored = existing as Doc<"transactions">;
    const incoming = fieldsFor<"transactions">(row);
    // SAFETY: `Object.keys` widens to string[]; the keys are this object's own.
    for (const field of Object.keys(transactionFields) as (keyof typeof transactionFields)[]) {
        if (
            !(TRANSACTION_VALUATION_FIELDS.has(field) || transactionFieldsEqual(field, stored[field], incoming[field]))
        ) {
            return null;
        }
    }
    const storedPendingCustom =
        stored.exchangeRateType === "custom" && stored.exchangeRate === null && stored.amountUsd === null;
    const incomingPendingCustom =
        incoming.exchangeRateType === "custom" && incoming.exchangeRate === null && incoming.amountUsd === null;
    if (storedPendingCustom === incomingPendingCustom) {
        return null;
    }
    const otherPolicy = storedPendingCustom ? incoming.exchangeRateType : stored.exchangeRateType;
    if (otherPolicy !== "official") {
        return null;
    }
    return incomingPendingCustom ? "incoming" : "existing";
}

// `push`'s validator already checked `fields` against `row.table`'s columns; this restores the erased type.
function fieldsFor<T extends SyncedTable>(row: PushRow): Doc<T> {
    // SAFETY: the caller passes the table literal matching the case it is in.
    return row.fields as Doc<T>;
}

async function writeRow<T extends SyncedTable>(
    ctx: MutationCtx,
    table: T,
    existing: Doc<SyncedTable> | null,
    doc: WithoutSystemFields<Doc<T>>
): Promise<void> {
    // SAFETY: `existing` was looked up by `row.table`, the same `T` this call was given.
    await (existing ? ctx.db.patch(table, existing._id as Id<T>, doc) : ctx.db.insert(table, doc));
}

// A switch: a runtime table name erases the per-table type that catches a payload drifting from schema.ts.
async function upsert(
    ctx: MutationCtx,
    row: PushRow,
    existing: Doc<SyncedTable> | null,
    stamp: { userId: string; deviceId: string; seq: number }
): Promise<void> {
    const envelope = {
        deletedAt: row.deletedAt,
        deviceId: stamp.deviceId,
        localId: row.localId,
        restoredAt: row.restoredAt ?? null,
        seq: stamp.seq,
        updatedAt: row.updatedAt,
        userId: stamp.userId,
    };

    switch (row.table) {
        case "categories": {
            return await writeRow(ctx, "categories", existing, { ...envelope, ...fieldsFor<"categories">(row) });
        }
        case "transactions": {
            return await writeRow(ctx, "transactions", existing, {
                ...envelope,
                ...fieldsFor<"transactions">(row),
            });
        }
        case "budgets": {
            return await writeRow(ctx, "budgets", existing, { ...envelope, ...fieldsFor<"budgets">(row) });
        }
        case "mainBudget": {
            return await writeRow(ctx, "mainBudget", existing, { ...envelope, ...fieldsFor<"mainBudget">(row) });
        }
        case "tags": {
            return await writeRow(ctx, "tags", existing, { ...envelope, ...fieldsFor<"tags">(row) });
        }
        case "transactionTags": {
            return await writeRow(ctx, "transactionTags", existing, {
                ...envelope,
                ...fieldsFor<"transactionTags">(row),
            });
        }
        case "transactionPhotos": {
            return await writeRow(ctx, "transactionPhotos", existing, {
                ...envelope,
                ...fieldsFor<"transactionPhotos">(row),
            });
        }
        case "transactionSplits": {
            return await writeRow(ctx, "transactionSplits", existing, {
                ...envelope,
                ...fieldsFor<"transactionSplits">(row),
            });
        }
        case "accounts": {
            return await writeRow(ctx, "accounts", existing, { ...envelope, ...fieldsFor<"accounts">(row) });
        }
        case "transfers": {
            return await writeRow(ctx, "transfers", existing, { ...envelope, ...fieldsFor<"transfers">(row) });
        }
        case "installmentPlans": {
            return await writeRow(ctx, "installmentPlans", existing, {
                ...envelope,
                ...fieldsFor<"installmentPlans">(row),
            });
        }
        case "installments": {
            return await writeRow(ctx, "installments", existing, { ...envelope, ...fieldsFor<"installments">(row) });
        }
        case "outsidePayments": {
            return await writeRow(ctx, "outsidePayments", existing, {
                ...envelope,
                ...fieldsFor<"outsidePayments">(row),
            });
        }
        case "outsideMoves": {
            return await writeRow(ctx, "outsideMoves", existing, { ...envelope, ...fieldsFor<"outsideMoves">(row) });
        }
        case "savingsGoals": {
            const fields = fieldsFor<"savingsGoals">(row);
            // An older client omits `exchangeRate` but values a moved target at the edit date, so the stale rate is
            // cleared. A rename leaves the target alone and keeps the precise rate.
            // SAFETY: this branch is reached only for `savingsGoals`, whose fields declare both targets.
            const priced = existing as { targetAmount?: number; targetAmountUsd?: number | null } | null;
            const targetMoved =
                priced == null ||
                priced.targetAmount !== fields.targetAmount ||
                priced.targetAmountUsd !== fields.targetAmountUsd;
            const rateless = !("exchangeRate" in row.fields) && fields.targetAmountUsd != null && targetMoved;
            return await writeRow(ctx, "savingsGoals", existing, {
                ...envelope,
                ...fields,
                ...(rateless && { exchangeRate: null }),
            });
        }
        case "appMeta": {
            const doc = {
                deviceId: stamp.deviceId,
                key: row.localId,
                seq: stamp.seq,
                updatedAt: row.updatedAt,
                userId: stamp.userId,
                // SAFETY: `appMeta`'s payload is this single column, as declared in `syncTables.ts`.
                value: (row.fields as { value: string | null }).value,
            };
            // SAFETY: `existing` was looked up by `row.table`, which this case matched against "appMeta".
            await (existing
                ? ctx.db.patch("appMeta", existing._id as Id<"appMeta">, doc)
                : ctx.db.insert("appMeta", doc));
            return;
        }
        default: {
            throw new ConvexError(`Unknown sync table: ${String(row.table)}`);
        }
    }
}

// The session and Pro outlive `purgeUserBatch` by up to a retried RevenueCat call, and a push in that window writes
// rows for a user id no purge path can find again. `prepared` is allowed: the owner may yet cancel.
export async function refuseWhileDeleting(ctx: QueryCtx, userId: string): Promise<void> {
    // Every job, not a page: a page could bury the refusing job. `accountDeletion.prepare` caps the set per user.
    const jobs = await ctx.db
        .query("accountDeletionJobs")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect();
    if (jobs.some((job) => job.phase !== "prepared")) {
        throw new ConvexError("This account is being deleted and can no longer accept changes");
    }
}

export async function seqCounter(ctx: MutationCtx, userId: string) {
    const state = await ctx.db
        .query("syncState")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .unique();
    // Starts at 1 so a cursor of 0 means "nothing read yet".
    const nextSeq = state?.nextSeq ?? 1;
    return {
        advanceTo: async (next: number) => {
            if (next <= nextSeq) {
                return;
            }
            await (state
                ? ctx.db.patch("syncState", state._id, { nextSeq: next })
                : ctx.db.insert("syncState", { nextSeq: next, userId }));
        },
        nextSeq,
    };
}

export const push = mutation({
    args: {
        deviceId: v.string(),
        rows: v.array(pushRow),
    },
    handler: async (ctx, args) => {
        const userId = await requireUserId(ctx);
        await requirePro(ctx, userId);
        await refuseWhileDeleting(ctx, userId);

        if (args.rows.length > PUSH_BATCH_LIMIT) {
            throw new ConvexError(`A push carries at most ${PUSH_BATCH_LIMIT} rows; got ${args.rows.length}`);
        }

        const counter = await seqCounter(ctx, userId);
        let { nextSeq } = counter;
        let accepted = 0;
        let skipped = 0;
        const reEmittedPolicyWinners = new Set<string>();

        /* oxlint-disable no-await-in-loop -- rows are applied in order: `seq` is handed out one per accepted row, and two rows for the same localId in one batch require the second lookup to observe the first row's upsert. */
        // SAFETY: `pushRow` above validates each row into this shape; `PushRow` is that union flattened.
        for (const row of args.rows as PushRow[]) {
            const existing = await findExisting(ctx, userId, row);
            const candidate = {
                deletedAt: row.deletedAt,
                deviceId: args.deviceId,
                restoredAt: row.restoredAt,
                updatedAt: row.updatedAt,
            };
            const policyTieDecision = transactionPolicyTieDecision(row, existing);
            if (policyTieDecision === "existing") {
                const key = `${row.table}:${row.localId}`;
                if (!reEmittedPolicyWinners.has(key)) {
                    // SAFETY: the tie decision is null for every table but "transactions", where `existing` came from.
                    await ctx.db.patch("transactions", (existing as Doc<"transactions">)._id, { seq: nextSeq });
                    nextSeq += 1;
                    reEmittedPolicyWinners.add(key);
                }
                skipped += 1;
                continue;
            }
            if (policyTieDecision === null && !incomingWins(candidate, existing ? versioned(existing) : null)) {
                // The pull hands the winner back, so the losing device converges without pushing again.
                skipped += 1;
                continue;
            }

            await upsert(ctx, row, existing, {
                deviceId: args.deviceId,
                seq: nextSeq,
                userId,
            });
            nextSeq += 1;
            accepted += 1;
        }
        /* oxlint-enable no-await-in-loop */

        await counter.advanceTo(nextSeq);

        return { accepted, nextSeq, skipped };
    },
    returns: v.object({
        accepted: v.number(),
        nextSeq: v.number(),
        skipped: v.number(),
    }),
});

type StoredDocument = Record<string, WireValue | undefined> & {
    deletedAt?: number | null;
    restoredAt?: number | null;
    key?: string;
    localId?: string;
};

function toWire(table: SyncedTable, doc: Doc<SyncedTable>) {
    const fieldNames = Object.keys(FIELDS_BY_TABLE[table]);
    const source: StoredDocument = doc;
    const fields: WireFields = {};
    for (const name of fieldNames) {
        const value = source[name];
        if (value !== undefined) {
            fields[name] = value;
        }
    }
    const localId = source.localId ?? source.key;
    if (localId === undefined) {
        // Schema drift, not bad data: a stand-in id would have the client adopt the row afresh on every pull.
        throw new Error(`Synced row in ${table} carries neither localId nor key`);
    }
    return {
        deletedAt: source.deletedAt ?? null,
        deviceId: doc.deviceId,
        fields,
        localId,
        restoredAt: source.restoredAt ?? null,
        seq: doc.seq,
        table,
        updatedAt: doc.updatedAt,
    };
}

// Taking `limit` per table before the merge keeps truncation safe. Pages are in seq order, not foreign-key order,
// so the applier runs with foreign keys off. A `tables` walk's cursor cannot vouch for the tables it omits.
export const pullSince = query({
    args: {
        cursor: v.number(),
        limit: v.optional(v.number()),
        tables: v.optional(v.array(syncedTable)),
    },
    handler: async (ctx, args) => {
        const userId = await requireUserId(ctx);
        await requirePro(ctx, userId);
        const limit = Math.min(Math.max(Math.trunc(args.limit ?? PULL_PAGE_LIMIT), 1), PULL_PAGE_LIMIT);

        const tables: readonly SyncedTable[] = args.tables ?? SYNCED_TABLES;
        const pages = await Promise.all(
            tables.map((table) =>
                ctx.db
                    .query(table)
                    .withIndex("by_user_and_seq", (q) => q.eq("userId", userId).gt("seq", args.cursor))
                    .take(limit)
            )
        );

        const merged = pages
            .flatMap((docs, index) => docs.map((doc) => toWire(tables[index], doc)))
            .sort((a, b) => a.seq - b.seq);

        const rows = merged.slice(0, limit);
        const last = rows[rows.length - 1];

        return {
            cursor: last ? last.seq : args.cursor,
            hasMore: merged.length >= limit,
            rows,
        };
    },
    returns: v.object({
        cursor: v.number(),
        hasMore: v.boolean(),
        rows: v.array(pulledRow),
    }),
});

export const currentSeq = query({
    args: {},
    handler: async (ctx) => {
        const userId = await requireUserId(ctx);
        const state = await ctx.db
            .query("syncState")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .unique();
        return state?.nextSeq ?? 0;
    },
    returns: v.number(),
});
