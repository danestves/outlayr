import { FunctionImpl, GroupImpl } from "@confect/server";
import type { Document } from "@confect/server";
import { ConvexError } from "convex/values";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import type { Docs } from "./_generated/docs";
import type { Id } from "./_generated/id";
import databaseSchema from "./_generated/schema";
import { DatabaseReader, DatabaseWriter, MutationCtx, QueryCtx } from "./_generated/services";
import { requireUserId } from "./lib/auth";
import { dieAsConvexError } from "./lib/convexError";
import { refuseWhileDeleting, seqCounter } from "./lib/syncGuards";
import { incomingWins, SYNCED_TABLES } from "./lib/syncTables";
import type { SyncedTable } from "./lib/syncTables";
import { requirePro } from "./revenuecat";
import {
    PULL_PAGE_LIMIT,
    PUSH_BATCH_LIMIT,
    PushTooLarge,
    toWire,
    transactionPolicyTieDecision,
    versioned,
} from "./sync";
import type { PushRow, SyncedDoc } from "./sync";
import spec from "./sync.spec";

const findExisting = Effect.fn("Sync.findExisting")(function* findExisting(userId: string, row: PushRow) {
    const reader = yield* DatabaseReader;
    if (row.table === "appMeta") {
        return yield* reader
            .table("appMeta")
            .get("by_user_and_key", userId, row.localId)
            .pipe(Effect.catchTags({ GetByIndexFailure: () => Effect.succeed(null) }));
    }
    return yield* reader
        .table(row.table)
        .get("by_user_and_localId", userId, row.localId)
        .pipe(Effect.catchTags({ GetByIndexFailure: () => Effect.succeed(null) }));
});

const writeRow = Effect.fn("Sync.writeRow")(function* writeRow<T extends SyncedTable>(
    table: T,
    existing: SyncedDoc | null,
    doc: Document.WithoutSystemFields<Docs[T]>
) {
    const rows = (yield* DatabaseWriter).table<SyncedTable>(table);
    yield* existing ? rows.patch(existing._id, doc) : rows.insert(doc);
});

// A switch: a runtime table name erases the per-table type that catches a payload drifting from tables/.
const upsert = Effect.fn("Sync.upsert")(function* upsert(
    row: PushRow,
    existing: SyncedDoc | null,
    stamp: { userId: string; deviceId: string; seq: number }
) {
    if (row.table === "appMeta") {
        const writer = yield* DatabaseWriter;
        const doc = {
            deviceId: stamp.deviceId,
            key: row.localId,
            seq: stamp.seq,
            updatedAt: row.updatedAt,
            userId: stamp.userId,
            value: row.fields.value,
        };
        // SAFETY: `existing` was looked up by `row.table`, which this case matched against "appMeta".
        yield* existing
            ? writer.table("appMeta").patch(existing._id as Id<"appMeta">, doc)
            : writer.table("appMeta").insert(doc);
        return;
    }

    const envelope = {
        deletedAt: row.deletedAt,
        deviceId: stamp.deviceId,
        localId: row.localId,
        restoredAt: row.restoredAt ?? null,
        seq: stamp.seq,
        updatedAt: row.updatedAt,
        userId: stamp.userId,
    };

    const { fields, table } = row;

    switch (table) {
        case "categories": {
            return yield* writeRow("categories", existing, { ...envelope, ...fields });
        }
        case "transactions": {
            return yield* writeRow("transactions", existing, { ...envelope, ...fields });
        }
        case "budgets": {
            return yield* writeRow("budgets", existing, { ...envelope, ...fields });
        }
        case "mainBudget": {
            return yield* writeRow("mainBudget", existing, { ...envelope, ...fields });
        }
        case "budgetPlans": {
            return yield* writeRow("budgetPlans", existing, { ...envelope, ...fields });
        }
        case "tags": {
            return yield* writeRow("tags", existing, { ...envelope, ...fields });
        }
        case "transactionTags": {
            return yield* writeRow("transactionTags", existing, { ...envelope, ...fields });
        }
        case "transactionAttachments": {
            return yield* writeRow("transactionAttachments", existing, { ...envelope, ...fields });
        }
        case "transactionPhotos": {
            return yield* writeRow("transactionPhotos", existing, { ...envelope, ...fields });
        }
        case "transactionSplits": {
            return yield* writeRow("transactionSplits", existing, { ...envelope, ...fields });
        }
        case "accounts": {
            return yield* writeRow("accounts", existing, { ...envelope, ...fields });
        }
        case "transfers": {
            return yield* writeRow("transfers", existing, { ...envelope, ...fields });
        }
        case "installmentPlans": {
            return yield* writeRow("installmentPlans", existing, { ...envelope, ...fields });
        }
        case "installments": {
            return yield* writeRow("installments", existing, { ...envelope, ...fields });
        }
        case "outsidePayments": {
            return yield* writeRow("outsidePayments", existing, { ...envelope, ...fields });
        }
        case "outsideMoves": {
            return yield* writeRow("outsideMoves", existing, { ...envelope, ...fields });
        }
        case "savingsGoals": {
            // An older client omits `exchangeRate` but values a moved target at the edit date, so the stale rate is
            // cleared. A rename leaves the target alone and keeps the precise rate.
            // SAFETY: this branch is reached only for `savingsGoals`, whose fields declare both targets.
            const priced = existing as { targetAmount?: number; targetAmountUsd?: number | null } | null;
            const targetMoved =
                priced == null ||
                priced.targetAmount !== fields.targetAmount ||
                priced.targetAmountUsd !== fields.targetAmountUsd;
            const rateless = !("exchangeRate" in fields) && fields.targetAmountUsd != null && targetMoved;
            return yield* writeRow("savingsGoals", existing, {
                ...envelope,
                ...fields,
                ...(rateless && { exchangeRate: null }),
            });
        }
        default: {
            return yield* Effect.die(new ConvexError(`Unknown sync table: ${String(table)}`));
        }
    }
});

const push = FunctionImpl.make(
    databaseSchema,
    spec,
    "push",
    Effect.fn("Sync.push")(
        function* push(args) {
            const ctx = yield* MutationCtx;
            const writer = yield* DatabaseWriter;
            const userId = yield* requireUserId(ctx);
            yield* requirePro(ctx, userId);
            yield* refuseWhileDeleting(userId);

            if (args.rows.length > PUSH_BATCH_LIMIT) {
                return yield* new PushTooLarge({ limit: PUSH_BATCH_LIMIT, rows: args.rows.length });
            }

            const counter = yield* seqCounter(userId);
            let { nextSeq } = counter;
            let accepted = 0;
            let skipped = 0;
            const reEmittedPolicyWinners = new Set<string>();

            // Rows are applied in order: `seq` is handed out one per accepted row, and two rows for the same localId
            // in one batch require the second lookup to observe the first row's upsert.
            for (const row of args.rows) {
                const existing = yield* findExisting(userId, row);
                const candidate = {
                    deletedAt: row.deletedAt,
                    deviceId: args.deviceId,
                    restoredAt: "restoredAt" in row ? row.restoredAt : undefined,
                    updatedAt: row.updatedAt,
                };
                const policyTieDecision = transactionPolicyTieDecision(row, existing);
                if (policyTieDecision === "existing") {
                    const key = `${row.table}:${row.localId}`;
                    if (!reEmittedPolicyWinners.has(key)) {
                        // SAFETY: the tie decision is null for every table but "transactions", where `existing`
                        // came from.
                        const winner = existing as Docs["transactions"];
                        yield* writer.table("transactions").patch(winner._id, { seq: nextSeq });
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

                yield* upsert(row, existing, {
                    deviceId: args.deviceId,
                    seq: nextSeq,
                    userId,
                });
                nextSeq += 1;
                accepted += 1;
            }

            yield* counter.advanceTo(nextSeq);

            return { accepted, nextSeq, skipped };
        },
        Effect.catchTags({
            AccountDeleting: dieAsConvexError,
            ProRequired: dieAsConvexError,
            PushTooLarge: dieAsConvexError,
            Unauthenticated: dieAsConvexError,
        }),
        Effect.orDie
    )
);

// Taking `limit` per table before the merge keeps truncation safe. Pages are in seq order, not foreign-key order,
// so the applier runs with foreign keys off. A `tables` walk's cursor cannot vouch for the tables it omits.
const pullSince = FunctionImpl.make(
    databaseSchema,
    spec,
    "pullSince",
    Effect.fn("Sync.pullSince")(
        function* pullSince(args) {
            const ctx = yield* QueryCtx;
            const reader = yield* DatabaseReader;
            const userId = yield* requireUserId(ctx);
            yield* requirePro(ctx, userId);
            const limit = Math.min(Math.max(Math.trunc(args.limit ?? PULL_PAGE_LIMIT), 1), PULL_PAGE_LIMIT);

            const tables: readonly SyncedTable[] = args.tables ?? SYNCED_TABLES;
            const pages = yield* Effect.all(
                tables.map((table) =>
                    reader
                        .table(table)
                        .index("by_user_and_seq", (q) => q.eq("userId", userId).gt("seq", args.cursor))
                        .take(limit)
                ),
                { concurrency: "unbounded" }
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
        Effect.catchTags({ ProRequired: dieAsConvexError, Unauthenticated: dieAsConvexError }),
        Effect.orDie
    )
);

const currentSeq = FunctionImpl.make(
    databaseSchema,
    spec,
    "currentSeq",
    Effect.fn("Sync.currentSeq")(
        function* currentSeq() {
            const ctx = yield* QueryCtx;
            const reader = yield* DatabaseReader;
            const userId = yield* requireUserId(ctx);
            const state = yield* reader
                .table("syncState")
                .get("by_user", userId)
                .pipe(Effect.catchTags({ GetByIndexFailure: () => Effect.succeed(null) }));
            return state?.nextSeq ?? 0;
        },
        Effect.catchTags({ Unauthenticated: dieAsConvexError }),
        Effect.orDie
    )
);

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(push),
    Layer.provide(pullSince),
    Layer.provide(currentSeq),
    GroupImpl.finalize
);
