import { and, asc, eq, getTableColumns, inArray, isNull, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";
import { z } from "zod";

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
    transactionPhotos,
    transactionSplits,
    transactions,
    transactionTags,
    transfers,
} from "@/db/schema";
import { withTransaction } from "@/db/transaction";
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

/** Mirrors `PUSH_BATCH_LIMIT` in `packages/backend/convex/sync.ts`. */
export const PUSH_BATCH_LIMIT = 500;

/** Mirrors `PULL_PAGE_LIMIT` in `packages/backend/convex/sync.ts`. */
export const PULL_PAGE_LIMIT = 1000;

const ID_CHUNK = 300;

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
     * Must name exactly the columns of the Convex table in `packages/backend/convex/lib/syncTables.ts`. A missing
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

const wireEpoch = z.number();
const wireId = z.string();

function toLocalDate(value: WireValue): Date | null {
    const epoch = wireEpoch.safeParse(value);
    return epoch.success ? new Date(epoch.data) : null;
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

async function rowsById(db: Database, table: SyncedTable, ids: readonly string[]): Promise<Map<string, Row>> {
    const spec = SPECS[table];
    const batches = await Promise.all(
        chunkRows(ids, ID_CHUNK).map((chunk) =>
            anyWriter(db)
                .select()
                .from(spec.table)
                .where(inArray(spec.id, [...chunk]))
        )
    );
    const found = new Map<string, Row>();
    for (const rows of batches) {
        for (const row of rows) {
            found.set(String(row[spec.id.name]), row);
        }
    }
    return found;
}

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
 * Clears queue entries by `seq`, never by `(table, localId)`: an edit that lands mid-push re-queues the row
 * under a new seq, and deleting by identity would drop it.
 */
export async function drainOutbox(db: Database, push: PushFn): Promise<number> {
    if (!(await isSyncEnabled(db))) {
        return 0;
    }
    const deviceId = await getOrCreateDeviceId(db);
    let pushed = 0;

    /* oxlint-disable no-await-in-loop -- each pass reads the outbox left behind by the previous pass's push and delete, so the batches cannot overlap */
    for (;;) {
        const queued = await db.select().from(outbox).orderBy(asc(outbox.seq)).limit(PUSH_BATCH_LIMIT);
        if (queued.length === 0) {
            return pushed;
        }

        const grouped = groupByTable(queued);
        const loaded = new Map<SyncedTable, Map<string, Row>>(
            await Promise.all(
                [...grouped].map(
                    async ([table, entries]) =>
                        [
                            table,
                            await rowsById(
                                db,
                                table,
                                entries.map((entry) => entry.localId)
                            ),
                        ] as const
                )
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
            await push({ deviceId, rows });
            pushed += rows.length;
        }

        /* oxlint-disable no-await-in-loop -- chunking only exists to stay under SQLite's bound-parameter limit, and one connection serialises writers anyway, so overlapping these deletes buys contention rather than parallelism */
        for (const chunk of chunkRows(
            queued.map((entry) => entry.seq),
            ID_CHUNK
        )) {
            await db.delete(outbox).where(inArray(outbox.seq, chunk));
        }
        /* oxlint-enable no-await-in-loop */

        if (queued.length < PUSH_BATCH_LIMIT) {
            return pushed;
        }
    }
    /* oxlint-enable no-await-in-loop */
}

interface LocalVersion {
    deletedAt: number | null;
    restoredAt?: number | null;
    updatedAt: number | null;
}

/** Mirrors `era` in `packages/backend/convex/lib/syncTables.ts`. */
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

/** A meta key this build no longer syncs is not applied, or a peer could reverse this device's choice. */
function isReplicated(row: PulledRow): boolean {
    if (!(row.table in SPECS)) {
        return false;
    }
    return row.table !== "appMeta" || SYNCED_META_KEYS.some((key) => key === row.localId);
}

async function applyInTransaction(
    db: Database,
    page: { rows: readonly PulledRow[]; cursor: number },
    now: Date,
    keepCursor: boolean
): Promise<ApplyResult> {
    const touched = new Set<SyncedTable>();
    let applied = 0;

    await withTransaction(db, async () => {
        const outboxEntries = await db.select({ localId: outbox.localId, tableName: outbox.tableName }).from(outbox);
        const pending = new Set(outboxEntries.map((entry) => `${entry.tableName}\0${entry.localId}`));

        const byTable = new Map<SyncedTable, PulledRow[]>();
        for (const row of page.rows) {
            if (!isReplicated(row)) {
                continue;
            }
            const bucket = byTable.get(row.table) ?? [];
            bucket.push(row);
            byTable.set(row.table, bucket);
        }

        const existing = new Map<SyncedTable, Map<string, Row>>(
            await Promise.all(
                [...byTable].map(
                    async ([table, rows]) =>
                        [
                            table,
                            await rowsById(
                                db,
                                table,
                                rows.map((row) => row.localId)
                            ),
                        ] as const
                )
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
        /* oxlint-disable no-await-in-loop -- R3 resolution inside writeRow reads the budgets an earlier winner left live, so the winners must be written one at a time */
        for (const row of winners) {
            const outcome = await writeRow(db, row, existing.get(row.table)?.get(row.localId), now);
            if (outcome === "unchanged") {
                continue;
            }
            // An R3 rewrite is not what the server holds, so it stays queued and pushes the correction.
            if (outcome === "verbatim") {
                replicatedVerbatim.push(row);
            }
            touched.add(row.table);
        }
        /* oxlint-enable no-await-in-loop */

        // Cleared in the same transaction, so a pulled row is never queued to echo back to the server.
        const cleared = groupByTable(
            replicatedVerbatim.map((row) => ({
                localId: row.localId,
                tableName: row.table,
            }))
        );
        for (const [table, entries] of cleared) {
            /* oxlint-disable no-await-in-loop -- these deletes run inside one SQLite transaction, which admits a single writer, so they cannot overlap */
            for (const chunk of chunkRows(
                entries.map((entry) => entry.localId),
                ID_CHUNK
            )) {
                await db.delete(outbox).where(and(eq(outbox.tableName, table), inArray(outbox.localId, chunk)));
            }
            /* oxlint-enable no-await-in-loop */
        }

        // After the outbox clear, so these tombstones stay queued and reach the other device.
        if (await reconcileMainBudget(db, now)) {
            touched.add("mainBudget");
        }

        applied = winners.length;
        if (!keepCursor) {
            await setSyncCursor(db, page.cursor);
        }
    });

    return { applied, tables: [...touched] };
}

/**
 * `budgets.categoryId` is UNIQUE locally but not on the server, so R3 resolves at the write: both devices
 * tombstone the same loser, and R1 converges the account on one live budget per category.
 */
async function resolveBudgetCategory(db: Database, row: PulledRow, now: Date): Promise<boolean> {
    const incoming = wireId.safeParse(row.fields.categoryId);
    if (row.deletedAt !== null || !incoming.success) {
        return false;
    }
    const categoryId = incoming.data;

    const rivals = await db
        .select({ id: budgets.id, updatedAt: budgets.updatedAt })
        .from(budgets)
        .where(and(eq(budgets.categoryId, categoryId), isNull(budgets.deletedAt)));

    let incomingLoses = false;
    for (const rival of rivals) {
        if (rival.id === row.localId) {
            continue;
        }
        if (keepsTheSlot(row, { id: rival.id, updatedAt: rival.updatedAt.getTime() })) {
            // oxlint-disable-next-line no-await-in-loop -- this runs inside the apply transaction, which admits a single writer, so the rival tombstones cannot overlap
            await db
                .update(budgets)
                .set({ categoryId: null, deletedAt: now, updatedAt: now })
                .where(eq(budgets.id, rival.id));
        } else {
            incomingLoses = true;
        }
    }
    return incomingLoses;
}

async function resolveTagLink(db: Database, row: PulledRow, now: Date): Promise<boolean> {
    const tagId = wireId.safeParse(row.fields.tagId);
    const transactionId = wireId.safeParse(row.fields.transactionId);
    if (row.deletedAt !== null || !(tagId.success && transactionId.success)) {
        return false;
    }

    const rivals = await db
        .select({ id: transactionTags.id, updatedAt: transactionTags.updatedAt })
        .from(transactionTags)
        .where(
            and(
                eq(transactionTags.transactionId, transactionId.data),
                eq(transactionTags.tagId, tagId.data),
                isNull(transactionTags.deletedAt)
            )
        );

    let incomingLoses = false;
    for (const rival of rivals) {
        if (rival.id === row.localId) {
            continue;
        }
        if (keepsTheSlot(row, { id: rival.id, updatedAt: rival.updatedAt.getTime() })) {
            // oxlint-disable-next-line no-await-in-loop -- this runs inside the apply transaction, which admits a single writer, so the rival tombstones cannot overlap
            await db
                .update(transactionTags)
                .set({ deletedAt: now, updatedAt: now })
                .where(eq(transactionTags.id, rival.id));
        } else {
            incomingLoses = true;
        }
    }
    return incomingLoses;
}

function retiresSchedule(values: Row): boolean {
    return values.deletedAt != null || values.recurringType === 0;
}

function changesNothing(local: Row | undefined, values: Row): boolean {
    return (
        local !== undefined &&
        Object.entries(values).every(([name, value]) => Object.is(toWireValue(value), toWireValue(local[name])))
    );
}

async function writeRow(
    db: Database,
    row: PulledRow,
    local: Row | undefined,
    now: Date
): Promise<"verbatim" | "rewritten" | "unchanged"> {
    const spec = SPECS[row.table];

    if (row.table === "appMeta") {
        // Not `setMeta`: it cannot store null, and a null value must not arrive as an empty string.
        // SAFETY: `syncTables.ts` declares `appMeta.value` as a nullable string.
        const value = (row.fields.value ?? null) as string | null;
        if (changesNothing(local, { key: row.localId, value })) {
            return "unchanged";
        }
        await db
            .insert(appMeta)
            .values({ key: row.localId, value })
            .onConflictDoUpdate({ set: { value }, target: appMeta.key });
        return "verbatim";
    }

    const lostCategory = row.table === "budgets" && (await resolveBudgetCategory(db, row, now));
    // A NOT NULL `targetDate` an older peer cleared is written as a queued tombstone, converging both on deleted.
    const datelessGoal = row.table === "savingsGoals" && row.deletedAt === null && row.fields.targetDate == null;
    const lostTagPair = row.table === "transactionTags" && (await resolveTagLink(db, row, now));
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
        return "unchanged";
    }

    await anyWriter(db).insert(spec.table).values(values).onConflictDoUpdate({ set: values, target: spec.id });
    return rewritten ? "rewritten" : "verbatim";
}

/** A singleton by convention, not constraint, so unlike `budgets` it can hold two live rows. */
async function reconcileMainBudget(db: Database, now: Date): Promise<boolean> {
    const live = await db
        .select({ id: mainBudget.id, updatedAt: mainBudget.updatedAt })
        .from(mainBudget)
        .where(isNull(mainBudget.deletedAt));
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

    /* oxlint-disable no-await-in-loop -- this runs inside the apply transaction, which admits a single writer, so the tombstones cannot overlap */
    for (const row of live) {
        if (row.id === survivor.id) {
            continue;
        }
        await db.update(mainBudget).set({ deletedAt: now, updatedAt: now }).where(eq(mainBudget.id, row.id));
    }
    /* oxlint-enable no-await-in-loop */
    return true;
}

/**
 * Foreign keys go off for the batch: `seq` is last-modified order, so no page ordering resolves every reference.
 * Enforcement returns only if it was on, since `db/client.ts` leaves it off for a store holding orphans.
 */
export async function applyPulledRows(
    db: Database,
    page: { rows: readonly PulledRow[]; cursor: number },
    now: Date = new Date(),
    { keepCursor = false }: { keepCursor?: boolean } = {}
): Promise<ApplyResult> {
    if (page.rows.length === 0) {
        return { applied: 0, tables: [] };
    }

    const before = await db.all<{ foreign_keys: number }>(sql`PRAGMA foreign_keys`);
    const wasOn = before[0]?.foreign_keys === 1;

    // A no-op inside a transaction, which is why it is issued out here.
    if (wasOn) {
        await db.run(sql`PRAGMA foreign_keys = OFF`);
    }
    try {
        return await applyInTransaction(db, page, now, keepCursor);
    } finally {
        if (wasOn) {
            await db.run(sql`PRAGMA foreign_keys = ON`);
        }
    }
}

/** The cursor check stops a page that returns rows without advancing the watermark from replaying forever. */
async function walkLog(db: Database, pull: PullFn, from: number, now: Date, scope?: RereadScope): Promise<ApplyResult> {
    const tables = scope?.tables;
    let cursor = from;
    let applied = 0;
    const touched = new Set<SyncedTable>();

    /* oxlint-disable no-await-in-loop -- each page is fetched from the cursor the previous page returned, so the walk is inherently sequential */
    for (;;) {
        const page = await pull({ cursor, limit: PULL_PAGE_LIMIT, ...(tables && { tables }) });
        if (page.rows.length === 0) {
            break;
        }
        if (scope?.repair) {
            for (const table of await repairUnsyncedRestores(db, page.rows)) {
                touched.add(table);
            }
        }
        const rows = page.rows.filter((row) => !scope?.markersOnly.has(row.table) || row.restoredAt != null);
        const result = await applyPulledRows(db, { ...page, rows }, now, { keepCursor: tables !== undefined });
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
    /* oxlint-enable no-await-in-loop */
    return { applied, tables: [...touched] };
}

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
export async function pullAndApply(db: Database, pull: PullFn, now: Date = new Date()): Promise<ApplyResult> {
    if (!(await isSyncEnabled(db))) {
        return { applied: 0, tables: [] };
    }
    const main = await walkLog(db, pull, await getSyncCursor(db), now);
    const reread = await getMeta(db, META_KEYS.syncReread);
    const restores = (await getMeta(db, META_KEYS.syncRestoresReread)) !== null;
    if (reread === null && !restores) {
        return main;
    }
    const named = reread?.split(",") ?? [];
    const whole = SYNCED_TABLES.filter((table) => named.includes(table));
    const markersOnly = restores ? LEGACY_RESTORABLE.filter((table) => !whole.includes(table)) : [];
    const tables = [...whole, ...markersOnly];
    const extra =
        tables.length === 0
            ? { applied: 0, tables: [] }
            : await walkLog(db, pull, 0, now, { markersOnly: new Set(markersOnly), repair: restores, tables });
    await db.delete(appMeta).where(inArray(appMeta.key, [META_KEYS.syncReread, META_KEYS.syncRestoresReread]));
    return { applied: main.applied + extra.applied, tables: [...new Set([...main.tables, ...extra.tables])] };
}

const RESTORABLE = { installmentPlans, installments, outsidePayments, transactionTags, transactions } as const;

/**
 * Stamps restores made here before restores synced (live here, tombstoned on the server) so the next push carries
 * them. A row whose `updatedAt` never passed the delete came back via archive restore and is left alone.
 */
async function repairUnsyncedRestores(db: Database, read: readonly PulledRow[]): Promise<SyncedTable[]> {
    const repaired: SyncedTable[] = [];
    await withTransaction(db, async () => {
        /* oxlint-disable no-await-in-loop -- one SQLite transaction admits a single writer, so these reads and updates cannot overlap */
        for (const [name, table] of Object.entries(RESTORABLE)) {
            // SAFETY: `RESTORABLE` is keyed by the synced table names it holds.
            const tableName = name as keyof typeof RESTORABLE;
            const tombstones = new Map(
                read.filter((row) => row.table === tableName && row.deletedAt !== null).map((row) => [row.localId, row])
            );
            if (tombstones.size === 0) {
                continue;
            }
            const locals = await rowsById(db, tableName, [...tombstones.keys()]);
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
                    { deletedAt: toLocalDate(served.deletedAt), restoredAt: toLocalDate(served.restoredAt ?? null) },
                    new Date(updatedAt)
                );
                await db.update(table).set({ restoredAt: stamp }).where(eq(table.id, id));
                repaired.push(tableName);
            }
        }
        /* oxlint-enable no-await-in-loop */
    });
    return repaired;
}

/** Push first, so a local edit reaches the server before the pull can hand back a peer's version of the row. */
export async function runSync(
    db: Database,
    transport: { push: PushFn; pull: PullFn },
    now: Date = new Date()
): Promise<{ pushed: number; applied: number; tables: SyncedTable[] }> {
    const pushed = await drainOutbox(db, transport.push);
    const { applied, tables } = await pullAndApply(db, transport.pull, now);
    return { applied, pushed, tables };
}
