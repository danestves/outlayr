import { and, asc, eq, getTableColumns, inArray, isNull, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { Database } from "@/db/client";
import {
    accounts,
    appMeta,
    budgets,
    categories,
    installmentPlans,
    installments,
    outsideMoves,
    outsidePayments,
    mainBudget,
    outbox,
    savingsGoals,
    tags,
    transactionAttachments,
    transactionPhotos,
    transactionSplits,
    transactions,
    transactionTags,
    transfers,
} from "@/db/schema";
import { transaction } from "@/db/transaction";
import { chunkRows } from "@/lib/chunk";

import { getMeta, META_KEYS } from "./app-meta-core";
import {
    getOrCreateDeviceId,
    getSyncCursor,
    isSyncEnabled,
    setSyncCursor,
    SYNCED_META_KEYS,
    SYNCED_TABLES,
} from "./sync-outbox-core";

export type SyncedTable = (typeof SYNCED_TABLES)[number];

const SyncCoreStage = Schema.Literals(["read", "write", "push", "pull", "foreignKeys", "transaction"]);

export class SyncCoreError extends Schema.TaggedError<SyncCoreError>()("SyncCoreError", {
    cause: Schema.Defect(),
    message: Schema.String,
    stage: SyncCoreStage,
}) {}

const failedAt = (stage: typeof SyncCoreStage.Type) => (cause: unknown) =>
    new SyncCoreError({ cause, message: `Sync ${stage} failed`, stage });

const query = <A>(stage: typeof SyncCoreStage.Type, run: () => PromiseLike<A>) =>
    Effect.tryPromise({ catch: failedAt(stage), try: run });

/** Mirrors `PUSH_BATCH_LIMIT` in `packages/backend/confect/sync.ts`. */
export const PUSH_BATCH_LIMIT = 500;

/** Mirrors `PULL_PAGE_LIMIT` in `packages/backend/confect/sync.ts`. */
export const PULL_PAGE_LIMIT = 1000;

/** Chunked against SQLite's bound-variable limit; `outboxPending`'s lookups share it with `rowsById`. */
export const ID_CHUNK = 300;

/** No `Date`: `toWireFields` encodes `dates` to epoch ms, and a stray `Date` would come back as text. */
type WireValue = boolean | number | string | null;

type WireFields = Record<string, WireValue>;

export interface WireRow {
    deletedAt: number | null;
    fields: WireFields;
    localId: string;
    restoredAt?: number | null;
    table: SyncedTable;
    updatedAt: number;
}

export interface PulledRow extends WireRow {
    deviceId: string;
    seq: number;
}

export type PushFn = (args: {
    deviceId: string;
    rows: WireRow[];
}) => Promise<{ accepted: number; skipped: number; nextSeq: number }>;

export type PullFn = (args: {
    cursor: number;
    limit: number;
    tables?: readonly SyncedTable[];
}) => Promise<{ rows: PulledRow[]; cursor: number; hasMore: boolean }>;

interface TableSpec {
    dates: readonly string[];
    /**
     * Fallback when the wire omits a column (added after replication began) or sends null for a NOT NULL one.
     * Without it `toLocalFields` writes null, and a NOT NULL column then fails the whole pull transaction.
     */
    defaults?: Readonly<Record<string, WireValue>>;
    /**
     * Must name exactly the columns of the Convex table in `packages/backend/confect/lib/syncTables.ts`. A missing
     * column replicates as silently absent, so `sync-engine-core.test.ts` checks this list against the schema.
     */
    fields: readonly string[];
    id: SQLiteColumn;
    table: SQLiteTable;
}

const SPECS = {
    accounts: {
        dates: ["initialBalanceDate", "dateCreated"],
        defaults: { kind: "asset" },
        fields: [
            "name",
            "currency",
            "initialBalance",
            "initialBalanceUsd",
            "initialBalanceDate",
            "icon",
            "emoji",
            "customColor",
            "imageColor",
            "imageKey",
            "sortOrder",
            "dateCreated",
            "kind",
        ],
        id: accounts.id,
        table: accounts,
    },
    appMeta: {
        dates: [],
        fields: ["value"],
        id: appMeta.key,
        table: appMeta,
    },
    budgets: {
        dates: ["startDate", "dateCreated"],
        fields: [
            "name",
            "amount",
            "type",
            "startDate",
            "dateCreated",
            "currency",
            "amountUsd",
            "green",
            "rollover",
            "categoryId",
        ],
        id: budgets.id,
        table: budgets,
    },
    categories: {
        dates: ["dateCreated"],
        fields: ["name", "color", "icon", "emoji", "income", "sortOrder", "dateCreated", "parentId"],
        id: categories.id,
        table: categories,
    },
    installmentPlans: {
        dates: ["dateCreated"],
        fields: ["accountId", "transactionId", "dateCreated"],
        id: installmentPlans.id,
        table: installmentPlans,
    },
    installments: {
        dates: ["dueDate"],
        fields: ["planId", "sequence", "dueDate", "amount"],
        id: installments.id,
        table: installments,
    },
    outsidePayments: {
        dates: ["date"],
        fields: ["planId", "date", "amount", "amountUsd"],
        id: outsidePayments.id,
        table: outsidePayments,
    },
    outsideMoves: {
        dates: ["date"],
        fields: ["accountId", "date", "amount", "amountUsd", "note"],
        id: outsideMoves.id,
        table: outsideMoves,
    },
    mainBudget: {
        dates: ["startDate", "dateCreated"],
        fields: ["name", "amount", "type", "startDate", "dateCreated", "currency", "amountUsd", "green", "rollover"],
        id: mainBudget.id,
        table: mainBudget,
    },
    savingsGoals: {
        dates: ["targetDate", "dateCreated"],
        // Start amounts default to 0, never null: null means unconvertible and would withhold the goal's progress.
        // `targetDate: 0` only lets a dateless goal be written as a tombstone (see `writeRow`).
        defaults: { startAmount: 0, startAmountUsd: 0, targetDate: 0 },
        fields: [
            "name",
            "accountId",
            "startAmount",
            "startAmountUsd",
            "exchangeRate",
            "targetAmount",
            "targetAmountUsd",
            "currency",
            "targetDate",
            "sortOrder",
            "dateCreated",
        ],
        id: savingsGoals.id,
        table: savingsGoals,
    },
    tags: {
        dates: [],
        fields: ["name", "color", "sortOrder"],
        id: tags.id,
        table: tags,
    },
    transactionAttachments: {
        dates: [],
        fields: ["transactionId", "imageKey", "name", "sortOrder"],
        id: transactionAttachments.id,
        table: transactionAttachments,
    },
    transactionPhotos: {
        dates: [],
        fields: ["transactionId", "imageKey", "imageColor", "sortOrder"],
        id: transactionPhotos.id,
        table: transactionPhotos,
    },
    transactionSplits: {
        dates: [],
        fields: ["transactionId", "categoryId", "amount", "sortOrder"],
        id: transactionSplits.id,
        table: transactionSplits,
    },
    transactionTags: {
        dates: [],
        fields: ["transactionId", "tagId"],
        id: transactionTags.id,
        table: transactionTags,
    },
    transactions: {
        dates: ["date", "day", "month", "recurringEndDate"],
        fields: [
            "amount",
            "income",
            "currency",
            "note",
            "details",
            "date",
            "day",
            "month",
            "icon",
            "emoji",
            "customColor",
            "imageColor",
            // No `imageUri`: a peer cannot resolve the device-local path, nulls it, and pushes that null back over the
            // original photo. `imageKey` replicates; the bytes travel via `photos.ts`.
            "imageKey",
            "onceRecurring",
            "recurringType",
            "recurringCoefficient",
            "recurringEndDate",
            "recurringAnchorDay",
            "categoryId",
            "accountId",
            "amountUsd",
            "exchangeRate",
            "exchangeRateType",
            "transferId",
            "feeForId",
            "feeRate",
            "paidVia",
            "installmentId",
        ],
        id: transactions.id,
        table: transactions,
    },
    transfers: {
        dates: ["date", "day", "month", "dateCreated"],
        fields: [
            "fromAccountId",
            "toAccountId",
            "fromAmount",
            "fromCurrency",
            "fromAmountUsd",
            "toAmount",
            "toCurrency",
            "toAmountUsd",
            "exchangeRate",
            "exchangeRateType",
            "date",
            "day",
            "month",
            "note",
            "dateCreated",
            "installmentPlanId",
        ],
        id: transfers.id,
        table: transfers,
    },
} satisfies Record<SyncedTable, TableSpec>;

export function specFor(table: SyncedTable): TableSpec {
    return SPECS[table];
}

export type LocalValue = Date | WireValue;

// A runtime table name erases drizzle's row type; every read is keyed by a name checked against `SPECS`.
type Row = Record<string, LocalValue>;
interface AnyWriter {
    insert: (table: SQLiteTable) => {
        values: (row: Row) => {
            onConflictDoUpdate: (config: { target: SQLiteColumn; set: Row }) => Promise<void>;
        };
    };
    select: () => {
        from: (table: SQLiteTable) => {
            where: (clause: SQL) => Promise<Row[]>;
        };
    };
}

function anyWriter(db: Database): AnyWriter {
    // SAFETY: drizzle's per-table generics share no type; only insert/select run, on tables looked up in `SPECS`.
    return db as unknown as AnyWriter;
}

function toEpoch(value: LocalValue | undefined): number | null {
    return value instanceof Date ? value.getTime() : null;
}

function toWireValue(value: LocalValue | undefined): WireValue {
    return value instanceof Date ? value.getTime() : (value ?? null);
}

function toWireFields(spec: TableSpec, row: Row): WireFields {
    return Object.fromEntries(
        spec.fields.map((name) => {
            const value = row[name];
            return [name, spec.dates.includes(name) ? toEpoch(value) : toWireValue(value)];
        })
    );
}

const isWireEpoch = Schema.is(Schema.Finite);
const isWireId = Schema.is(Schema.String);

function toLocalDate(value: WireValue): Date | null {
    return isWireEpoch(value) ? new Date(value) : null;
}

function toLocalFields(spec: TableSpec, fields: WireFields): Row {
    const columns = getTableColumns(spec.table);
    return Object.fromEntries(
        spec.fields.map((name) => {
            const carried = Object.hasOwn(fields, name) && (fields[name] !== null || !columns[name].notNull);
            const value = carried ? fields[name] : (spec.defaults?.[name] ?? null);
            return [name, spec.dates.includes(name) ? toLocalDate(value) : value];
        })
    );
}

const rowsById = Effect.fn("SyncCore.rowsById")(function* rowsById(
    db: Database,
    table: SyncedTable,
    ids: readonly string[]
) {
    const spec = SPECS[table];
    const batches = yield* Effect.all(
        chunkRows(ids, ID_CHUNK).map((chunk) =>
            query("read", () =>
                anyWriter(db)
                    .select()
                    .from(spec.table)
                    .where(inArray(spec.id, [...chunk]))
            )
        ),
        { concurrency: "unbounded" }
    );
    const found = new Map<string, Row>();
    for (const rows of batches) {
        for (const row of rows) {
            found.set(String(row[spec.id.name]), row);
        }
    }
    return found;
});

function groupByTable<T extends { tableName: string; localId: string }>(entries: readonly T[]): Map<SyncedTable, T[]> {
    const grouped = new Map<SyncedTable, T[]>();
    for (const entry of entries) {
        // SAFETY: checked against `SPECS` on the next line.
        const table = entry.tableName as SyncedTable;
        if (!(table in SPECS)) {
            continue;
        }
        const bucket = grouped.get(table) ?? [];
        bucket.push(entry);
        grouped.set(table, bucket);
    }
    return grouped;
}

/**
 * Only rows of the pulled page can ask whether this device still owes them a push, so their queue entries are read
 * back through the `(tableName, localId)` index instead of copying the whole outbox inside every page's batch.
 */
const outboxPending = Effect.fn("SyncCore.outboxPending")(function* outboxPending(
    db: Database,
    grouped: ReadonlyMap<SyncedTable, PulledRow[]>
) {
    const batches = yield* Effect.all(
        [...grouped].flatMap(([table, rows]) =>
            chunkRows([...new Set(rows.map((row) => row.localId))], ID_CHUNK).map((chunk) =>
                query("read", () =>
                    db
                        .select({ localId: outbox.localId })
                        .from(outbox)
                        .where(and(eq(outbox.tableName, table), inArray(outbox.localId, chunk)))
                ).pipe(Effect.map((entries) => entries.map((entry) => `${table}\0${entry.localId}`)))
            )
        ),
        { concurrency: "unbounded" }
    );
    return new Set(batches.flat());
});

/**
 * Clears queue entries by `seq`, never by `(table, localId)`: an edit that lands mid-push re-queues the row
 * under a new seq, and deleting by identity would drop it.
 */
export const drainOutbox = Effect.fn("SyncCore.drainOutbox")(function* drainOutbox(db: Database, push: PushFn) {
    if (!(yield* isSyncEnabled(db))) {
        return 0;
    }
    const deviceId = yield* getOrCreateDeviceId(db);
    let pushed = 0;

    // Each pass reads the outbox left behind by the previous pass's push and delete, so the batches cannot overlap.
    for (;;) {
        const queued = yield* query("read", () =>
            db.select().from(outbox).orderBy(asc(outbox.seq)).limit(PUSH_BATCH_LIMIT)
        );
        if (queued.length === 0) {
            return pushed;
        }

        const grouped = groupByTable(queued);
        const loaded = new Map<SyncedTable, Map<string, Row>>(
            yield* Effect.all(
                [...grouped].map(([table, entries]) =>
                    rowsById(
                        db,
                        table,
                        entries.map((entry) => entry.localId)
                    ).pipe(Effect.map((found) => [table, found] as const))
                ),
                { concurrency: "unbounded" }
            )
        );

        const rows: WireRow[] = [];
        for (const entry of queued) {
            // SAFETY: an unknown table misses `loaded`, which `groupByTable` keyed by `SPECS` names.
            const table = entry.tableName as SyncedTable;
            const row = loaded.get(table)?.get(entry.localId);
            if (!row) {
                continue;
            }
            const spec = SPECS[table];
            const restoredAt = toEpoch(row.restoredAt);
            rows.push({
                deletedAt: table === "appMeta" ? null : toEpoch(row.deletedAt),
                fields: toWireFields(spec, row),
                localId: entry.localId,
                ...(restoredAt !== null && { restoredAt }),
                table,
                updatedAt: table === "appMeta" ? (toEpoch(entry.enqueuedAt) ?? 0) : (toEpoch(row.updatedAt) ?? 0),
            });
        }

        if (rows.length > 0) {
            yield* query("push", () => push({ deviceId, rows }));
            pushed += rows.length;
        }

        // Chunking only exists to stay under SQLite's bound-parameter limit, and one connection serialises writers
        // anyway, so overlapping these deletes buys contention rather than parallelism.
        for (const chunk of chunkRows(
            queued.map((entry) => entry.seq),
            ID_CHUNK
        )) {
            yield* query("write", () => db.delete(outbox).where(inArray(outbox.seq, chunk)));
        }

        if (queued.length < PUSH_BATCH_LIMIT) {
            return pushed;
        }
    }
});

interface LocalVersion {
    deletedAt: number | null;
    restoredAt?: number | null;
    updatedAt: number | null;
}

/** Mirrors `era` in `packages/backend/confect/lib/syncTables.ts`. */
function era(version: { deletedAt: number | null; restoredAt?: number | null }): number {
    const restoredAt = version.restoredAt ?? 0;
    return version.deletedAt === null ? restoredAt : Math.max(version.deletedAt, restoredAt);
}

/** Just past the tombstone's era when this clock lags the deleter's, so a restore beats the delete it undoes. */
export function restoreStamp(row: { deletedAt: Date | null; restoredAt: Date | null }, now: Date): Date {
    const lifted = era({ deletedAt: toEpoch(row.deletedAt), restoredAt: toEpoch(row.restoredAt) });
    return new Date(Math.max(now.getTime(), lifted + 1));
}

/**
 * R1 then R2 from `docs/internals/convex-sync.md` §4. An exact `updatedAt` tie breaks on whether this device
 * still owes the row a push: overwriting an unsent edit would push the peer's value back under the local id.
 */
export function incomingWinsLocally(
    incoming: { updatedAt: number; deletedAt: number | null; restoredAt?: number | null },
    local: LocalVersion | null,
    localIsPending: boolean
): boolean {
    if (local === null) {
        return true;
    }
    // `appMeta` has no clock, so whether the key is still owed a push is the only signal.
    if (local.updatedAt === null) {
        return !localIsPending;
    }
    if (era(incoming) !== era(local)) {
        return era(incoming) > era(local);
    }
    const incomingDeleted = incoming.deletedAt !== null;
    const localDeleted = local.deletedAt !== null;
    if (incomingDeleted !== localDeleted) {
        return incomingDeleted;
    }
    if (incoming.updatedAt !== local.updatedAt) {
        return incoming.updatedAt > local.updatedAt;
    }
    return !localIsPending;
}

/** Breaks R3 ties on the id (no local `deviceId`); both devices hold the same pair and pick the same survivor. */
function keepsTheSlot(
    incoming: { updatedAt: number; localId: string },
    rival: { updatedAt: number; id: string }
): boolean {
    if (incoming.updatedAt !== rival.updatedAt) {
        return incoming.updatedAt > rival.updatedAt;
    }
    return incoming.localId > rival.id;
}

export interface ApplyResult {
    applied: number;
    tables: SyncedTable[];
}

const nothingApplied = (): ApplyResult => ({ applied: 0, tables: [] });

/** A meta key this build no longer syncs is not applied, or a peer could reverse this device's choice. */
function isReplicated(row: PulledRow): boolean {
    if (!(row.table in SPECS)) {
        return false;
    }
    return row.table !== "appMeta" || SYNCED_META_KEYS.some((key) => key === row.localId);
}

const applyInTransaction = Effect.fn("SyncCore.applyInTransaction")(function* applyInTransaction(
    db: Database,
    page: { rows: readonly PulledRow[]; cursor: number },
    now: Date,
    keepCursor: boolean
) {
    const touched = new Set<SyncedTable>();
    let applied = 0;

    yield* transaction(
        db,
        Effect.gen(function* write() {
            const byTable = new Map<SyncedTable, PulledRow[]>();
            for (const row of page.rows) {
                if (!isReplicated(row)) {
                    continue;
                }
                const bucket = byTable.get(row.table) ?? [];
                bucket.push(row);
                byTable.set(row.table, bucket);
            }
            const pending = yield* outboxPending(db, byTable);

            const existing = new Map<SyncedTable, Map<string, Row>>(
                yield* Effect.all(
                    [...byTable].map(([table, rows]) =>
                        rowsById(
                            db,
                            table,
                            rows.map((row) => row.localId)
                        ).pipe(Effect.map((found) => [table, found] as const))
                    ),
                    { concurrency: "unbounded" }
                )
            );

            const winners: PulledRow[] = [];
            for (const row of page.rows) {
                if (!isReplicated(row)) {
                    continue;
                }
                const local = existing.get(row.table)?.get(row.localId);
                const localVersion =
                    local === undefined
                        ? null
                        : {
                              deletedAt: row.table === "appMeta" ? null : toEpoch(local.deletedAt),
                              restoredAt: toEpoch(local.restoredAt),
                              updatedAt: row.table === "appMeta" ? null : (toEpoch(local.updatedAt) ?? 0),
                          };
                const isPending = pending.has(`${row.table}\0${row.localId}`);
                if (incomingWinsLocally(row, localVersion, isPending)) {
                    winners.push(row);
                }
            }

            const replicatedVerbatim: PulledRow[] = [];
            // R3 resolution inside writeRow reads the budgets an earlier winner left live, so the winners must be
            // written one at a time.
            for (const row of winners) {
                const outcome = yield* writeRow(db, row, existing.get(row.table)?.get(row.localId), now);
                if (outcome === "unchanged") {
                    continue;
                }
                // An R3 rewrite is not what the server holds, so it stays queued and pushes the correction.
                if (outcome === "verbatim") {
                    replicatedVerbatim.push(row);
                }
                touched.add(row.table);
            }

            // Cleared in the same transaction, so a pulled row is never queued to echo back to the server.
            const cleared = groupByTable(
                replicatedVerbatim.map((row) => ({
                    localId: row.localId,
                    tableName: row.table,
                }))
            );
            for (const [table, entries] of cleared) {
                // These deletes run inside one SQLite transaction, which admits a single writer, so they cannot
                // overlap.
                for (const chunk of chunkRows(
                    entries.map((entry) => entry.localId),
                    ID_CHUNK
                )) {
                    yield* query("write", () =>
                        db.delete(outbox).where(and(eq(outbox.tableName, table), inArray(outbox.localId, chunk)))
                    );
                }
            }

            // After the outbox clear, so these tombstones stay queued and reach the other device.
            if (yield* reconcileMainBudget(db, now)) {
                touched.add("mainBudget");
            }

            applied = winners.length;
            if (!keepCursor) {
                yield* setSyncCursor(db, page.cursor);
            }
        }),
        failedAt("transaction")
    );

    return { applied, tables: [...touched] };
});

/**
 * `budgets.categoryId` is UNIQUE locally but not on the server, so R3 resolves at the write: both devices
 * tombstone the same loser, and R1 converges the account on one live budget per category.
 */
const resolveBudgetCategory = Effect.fn("SyncCore.resolveBudgetCategory")(function* resolveBudgetCategory(
    db: Database,
    row: PulledRow,
    now: Date
) {
    const { categoryId } = row.fields;
    if (row.deletedAt !== null || !isWireId(categoryId)) {
        return false;
    }

    const rivals = yield* query("read", () =>
        db
            .select({ id: budgets.id, updatedAt: budgets.updatedAt })
            .from(budgets)
            .where(and(eq(budgets.categoryId, categoryId), isNull(budgets.deletedAt)))
    );

    let incomingLoses = false;
    for (const rival of rivals) {
        if (rival.id === row.localId) {
            continue;
        }
        if (keepsTheSlot(row, { id: rival.id, updatedAt: rival.updatedAt.getTime() })) {
            // This runs inside the apply transaction, which admits a single writer, so the rival tombstones cannot
            // overlap.
            yield* query("write", () =>
                db
                    .update(budgets)
                    .set({ categoryId: null, deletedAt: now, updatedAt: now })
                    .where(eq(budgets.id, rival.id))
            );
        } else {
            incomingLoses = true;
        }
    }
    return incomingLoses;
});

const resolveTagLink = Effect.fn("SyncCore.resolveTagLink")(function* resolveTagLink(
    db: Database,
    row: PulledRow,
    now: Date
) {
    const { tagId, transactionId } = row.fields;
    if (row.deletedAt !== null || !(isWireId(tagId) && isWireId(transactionId))) {
        return false;
    }

    const rivals = yield* query("read", () =>
        db
            .select({ id: transactionTags.id, updatedAt: transactionTags.updatedAt })
            .from(transactionTags)
            .where(
                and(
                    eq(transactionTags.transactionId, transactionId),
                    eq(transactionTags.tagId, tagId),
                    isNull(transactionTags.deletedAt)
                )
            )
    );

    let incomingLoses = false;
    for (const rival of rivals) {
        if (rival.id === row.localId) {
            continue;
        }
        if (keepsTheSlot(row, { id: rival.id, updatedAt: rival.updatedAt.getTime() })) {
            // This runs inside the apply transaction, which admits a single writer, so the rival tombstones cannot
            // overlap.
            yield* query("write", () =>
                db
                    .update(transactionTags)
                    .set({ deletedAt: now, updatedAt: now })
                    .where(eq(transactionTags.id, rival.id))
            );
        } else {
            incomingLoses = true;
        }
    }
    return incomingLoses;
});

function retiresSchedule(values: Row): boolean {
    return values.deletedAt != null || values.recurringType === 0;
}

function changesNothing(local: Row | undefined, values: Row): boolean {
    return (
        local !== undefined &&
        Object.entries(values).every(([name, value]) => Object.is(toWireValue(value), toWireValue(local[name])))
    );
}

const writeRow = Effect.fn("SyncCore.writeRow")(function* writeRow(
    db: Database,
    row: PulledRow,
    local: Row | undefined,
    now: Date
) {
    const spec = SPECS[row.table];

    if (row.table === "appMeta") {
        // Not `setMeta`: it cannot store null, and a null value must not arrive as an empty string.
        // SAFETY: `syncTables.ts` declares `appMeta.value` as a nullable string.
        const value = (row.fields.value ?? null) as string | null;
        if (changesNothing(local, { key: row.localId, value })) {
            return "unchanged" as const;
        }
        yield* query("write", () =>
            db
                .insert(appMeta)
                .values({ key: row.localId, value })
                .onConflictDoUpdate({ set: { value }, target: appMeta.key })
        );
        return "verbatim" as const;
    }

    const lostCategory = row.table === "budgets" && (yield* resolveBudgetCategory(db, row, now));
    // A NOT NULL `targetDate` an older peer cleared is written as a queued tombstone, converging both on deleted.
    const datelessGoal = row.table === "savingsGoals" && row.deletedAt === null && row.fields.targetDate == null;
    const lostTagPair = row.table === "transactionTags" && (yield* resolveTagLink(db, row, now));
    const rewritten = lostCategory || datelessGoal || lostTagPair;

    const values = {
        ...toLocalFields(spec, row.fields),
        [spec.id.name]: row.localId,
        deletedAt: rewritten ? now : toLocalDate(row.deletedAt),
        // Dropped by drizzle on a table without the column.
        restoredAt: toLocalDate(row.restoredAt ?? null),
        updatedAt: rewritten ? now : new Date(row.updatedAt),
    } satisfies Row;
    if (lostCategory) {
        values.categoryId = null;
    }
    if (row.table === "transactions" && retiresSchedule(values)) {
        // Device-local and absent from the wire, so the upsert would keep a reminder on a charge a peer settled.
        values.reminderLeadDays = null;
    }
    if (!rewritten && changesNothing(local, values)) {
        return "unchanged" as const;
    }

    yield* query("write", () =>
        anyWriter(db).insert(spec.table).values(values).onConflictDoUpdate({ set: values, target: spec.id })
    );
    return rewritten ? ("rewritten" as const) : ("verbatim" as const);
});

/** A singleton by convention, not constraint, so unlike `budgets` it can hold two live rows. */
const reconcileMainBudget = Effect.fn("SyncCore.reconcileMainBudget")(function* reconcileMainBudget(
    db: Database,
    now: Date
) {
    const live = yield* query("read", () =>
        db
            .select({ id: mainBudget.id, updatedAt: mainBudget.updatedAt })
            .from(mainBudget)
            .where(isNull(mainBudget.deletedAt))
    );
    if (live.length < 2) {
        return false;
    }

    const survivor = live.reduce((best, row) =>
        keepsTheSlot(
            { localId: row.id, updatedAt: row.updatedAt.getTime() },
            { id: best.id, updatedAt: best.updatedAt.getTime() }
        )
            ? row
            : best
    );

    // This runs inside the apply transaction, which admits a single writer, so the tombstones cannot overlap.
    for (const row of live) {
        if (row.id === survivor.id) {
            continue;
        }
        yield* query("write", () =>
            db.update(mainBudget).set({ deletedAt: now, updatedAt: now }).where(eq(mainBudget.id, row.id))
        );
    }
    return true;
});

/**
 * Foreign keys go off for the batch: `seq` is last-modified order, so no page ordering resolves every reference.
 * Enforcement returns only if it was on, since `db/client.ts` leaves it off for a store holding orphans.
 */
export const applyPulledRows = Effect.fn("SyncCore.applyPulledRows")(function* applyPulledRows(
    db: Database,
    page: { rows: readonly PulledRow[]; cursor: number },
    now: Date = new Date(),
    { keepCursor = false }: { keepCursor?: boolean } = {}
) {
    if (page.rows.length === 0) {
        return nothingApplied();
    }

    return yield* Effect.uninterruptible(
        Effect.gen(function* guarded() {
            const before = yield* Effect.try({
                catch: failedAt("foreignKeys"),
                try: () => db.all<{ foreign_keys: number }>(sql`PRAGMA foreign_keys`),
            });
            const wasOn = before[0]?.foreign_keys === 1;

            // A no-op inside a transaction, which is why it is issued out here.
            if (wasOn) {
                yield* Effect.try({
                    catch: failedAt("foreignKeys"),
                    try: () => db.run(sql`PRAGMA foreign_keys = OFF`),
                });
            }
            const applying = yield* Effect.exit(applyInTransaction(db, page, now, keepCursor));
            if (wasOn) {
                yield* Effect.try({ catch: failedAt("foreignKeys"), try: () => db.run(sql`PRAGMA foreign_keys = ON`) });
            }
            return yield* applying;
        })
    );
});

/** The cursor check stops a page that returns rows without advancing the watermark from replaying forever. */
const walkLog = Effect.fn("SyncCore.walkLog")(function* walkLog(
    db: Database,
    pull: PullFn,
    from: number,
    now: Date,
    scope?: RereadScope
) {
    const tables = scope?.tables;
    let cursor = from;
    let applied = 0;
    const touched = new Set<SyncedTable>();
    const fetchPage = (after: number) =>
        query("pull", () => pull({ cursor: after, limit: PULL_PAGE_LIMIT, ...(tables && { tables }) }));

    // Each page is fetched from the cursor the previous page returned, so the walk is inherently sequential.
    for (;;) {
        const page = yield* fetchPage(cursor);
        if (page.rows.length === 0) {
            break;
        }
        if (scope?.repair) {
            for (const table of yield* repairUnsyncedRestores(db, page.rows)) {
                touched.add(table);
            }
        }
        const rows = page.rows.filter((row) => !scope?.markersOnly.has(row.table) || row.restoredAt != null);
        const result = yield* applyPulledRows(db, { ...page, rows }, now, { keepCursor: tables !== undefined });
        applied += result.applied;
        for (const table of result.tables) {
            touched.add(table);
        }
        if (page.cursor <= cursor) {
            break;
        }
        ({ cursor } = page);
        if (!page.hasMore) {
            break;
        }
    }
    return { applied, tables: [...touched] };
});

interface RereadScope {
    markersOnly: ReadonlySet<SyncedTable>;
    repair: boolean;
    tables: readonly SyncedTable[];
}

/** Where a build before `restoredAt` could restore, and so reject a peer's restore. */
const LEGACY_RESTORABLE = ["transactions", "transactionTags"] as const satisfies readonly SyncedTable[];

/**
 * Walks the log from this device's cursor, then any one-time re-read the migrations asked for. Never a cursor
 * reset: a full re-read would serve the server's tombstone for every row restored here before restores synced.
 */
export const pullAndApply = Effect.fn("SyncCore.pullAndApply")(function* pullAndApply(
    db: Database,
    pull: PullFn,
    now: Date = new Date()
) {
    if (!(yield* isSyncEnabled(db))) {
        return nothingApplied();
    }
    const main = yield* walkLog(db, pull, yield* getSyncCursor(db), now);
    const reread = yield* query("read", () => getMeta(db, META_KEYS.syncReread));
    const restores = (yield* query("read", () => getMeta(db, META_KEYS.syncRestoresReread))) !== null;
    if (reread === null && !restores) {
        return main;
    }
    const named = reread?.split(",") ?? [];
    const whole = SYNCED_TABLES.filter((table) => named.includes(table));
    const markersOnly = restores ? LEGACY_RESTORABLE.filter((table) => !whole.includes(table)) : [];
    const tables = [...whole, ...markersOnly];
    const extra =
        tables.length === 0
            ? nothingApplied()
            : yield* walkLog(db, pull, 0, now, { markersOnly: new Set(markersOnly), repair: restores, tables });
    yield* query("write", () =>
        db.delete(appMeta).where(inArray(appMeta.key, [META_KEYS.syncReread, META_KEYS.syncRestoresReread]))
    );
    return { applied: main.applied + extra.applied, tables: [...new Set([...main.tables, ...extra.tables])] };
});

const RESTORABLE = { installmentPlans, installments, outsidePayments, transactionTags, transactions } as const;

/**
 * Stamps restores made here before restores synced (live here, tombstoned on the server) so the next push carries
 * them. A row whose `updatedAt` never passed the delete came back via archive restore and is left alone.
 */
const repairUnsyncedRestores = Effect.fn("SyncCore.repairUnsyncedRestores")(function* repairUnsyncedRestores(
    db: Database,
    read: readonly PulledRow[]
) {
    const repaired: SyncedTable[] = [];
    yield* transaction(
        db,
        Effect.gen(function* write() {
            // One SQLite transaction admits a single writer, so these reads and updates cannot overlap.
            for (const [name, table] of Object.entries(RESTORABLE)) {
                // SAFETY: `RESTORABLE` is keyed by the synced table names it holds.
                const tableName = name as keyof typeof RESTORABLE;
                const tombstones = new Map(
                    read
                        .filter((row) => row.table === tableName && row.deletedAt !== null)
                        .map((row) => [row.localId, row])
                );
                if (tombstones.size === 0) {
                    continue;
                }
                const locals = yield* rowsById(db, tableName, [...tombstones.keys()]);
                for (const [id, served] of tombstones) {
                    const local = locals.get(id);
                    const updatedAt = toEpoch(local?.updatedAt);
                    if (
                        local === undefined ||
                        local.deletedAt != null ||
                        updatedAt === null ||
                        served.deletedAt === null ||
                        updatedAt <= served.deletedAt ||
                        era({ deletedAt: null, restoredAt: toEpoch(local.restoredAt) }) > era(served)
                    ) {
                        continue;
                    }
                    const stamp = restoreStamp(
                        {
                            deletedAt: toLocalDate(served.deletedAt),
                            restoredAt: toLocalDate(served.restoredAt ?? null),
                        },
                        new Date(updatedAt)
                    );
                    yield* query("write", () => db.update(table).set({ restoredAt: stamp }).where(eq(table.id, id)));
                    repaired.push(tableName);
                }
            }
        }),
        failedAt("transaction")
    );
    return repaired;
});

/** Push first, so a local edit reaches the server before the pull can hand back a peer's version of the row. */
export const runSync = Effect.fn("SyncCore.runSync")(function* runSync(
    db: Database,
    transport: { push: PushFn; pull: PullFn },
    now: Date = new Date()
) {
    const pushed = yield* drainOutbox(db, transport.push);
    const { applied, tables } = yield* pullAndApply(db, transport.pull, now);
    return { applied, pushed, tables };
});
