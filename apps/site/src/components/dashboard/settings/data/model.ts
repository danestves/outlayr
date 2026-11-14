import { FIELDS_BY_TABLE, SYNCED_TABLES } from "@outlayr/backend/confect/lib/syncTables";
import type { SyncedTable } from "@outlayr/backend/confect/lib/syncTables";
import { PushRow } from "@outlayr/backend/confect/sync";
import { ARCHIVE_FORMAT, ARCHIVE_VERSION } from "@outlayr/money/archive";
import { ERASED_TRANSACTION, ERASED_TRANSFER, TOMBSTONED_BUDGET, TOMBSTONED_MAIN_BUDGET } from "@outlayr/money/erase";
import * as Schema from "effect/Schema";

type WireValue = boolean | number | string | null;

type WireField = boolean | number | string | null | undefined;

export interface PulledRow {
    deletedAt: number | null;
    fields: Record<string, WireField>;
    localId: string;
    restoredAt: number | null;
    table: SyncedTable;
    updatedAt: number;
}

export type EraseScope = "transactions" | "everything";

type Change = Readonly<Record<string, WireField>>;

const ERASED_DAY = 0;

const wire = (change: Readonly<Record<string, WireField | Date>>): Change =>
    Object.fromEntries(
        Object.entries(change).map(([key, value]) => [key, value instanceof Date ? value.getTime() : value])
    );

const ERASE_CHANGES: Partial<Record<SyncedTable, Change>> = {
    installmentPlans: { dateCreated: ERASED_DAY },
    installments: { amount: 0, dueDate: ERASED_DAY },
    outsideMoves: { amount: 0, amountUsd: null, date: ERASED_DAY, note: "" },
    outsidePayments: { amount: 0, amountUsd: null, date: ERASED_DAY },
    transactionAttachments: { imageKey: null, name: null },
    transactions: wire(ERASED_TRANSACTION),
    transfers: wire(ERASED_TRANSFER),
};

const EVERYTHING_CHANGES: Partial<Record<SyncedTable, Change>> = {
    budgetPlans: { amount: null, currency: null },
    budgets: wire(TOMBSTONED_BUDGET),
    mainBudget: wire(TOMBSTONED_MAIN_BUDGET),
};

const era = (row: Pick<PulledRow, "deletedAt" | "restoredAt">) =>
    row.deletedAt === null ? (row.restoredAt ?? 0) : Math.max(row.deletedAt, row.restoredAt ?? 0);

// SAFETY: built from `FIELDS_BY_TABLE`, and `archivePushes` checks every row against the push schema before use.
const wireRow = (row: {
    deletedAt: number | null;
    fields: Change;
    localId: string;
    restoredAt?: number | null;
    table: SyncedTable;
    updatedAt: number;
}) => row as PushRow;

function fieldsOf(table: SyncedTable, row: Change) {
    return Object.fromEntries(
        Object.keys(FIELDS_BY_TABLE[table]).flatMap((key) => (row[key] === undefined ? [] : [[key, row[key]]]))
    );
}

function pushOf(row: PulledRow, change: Change, deletedAt: number | null, restoredAt: number | null, at: number) {
    return wireRow({
        deletedAt,
        fields: fieldsOf(row.table, { ...row.fields, ...change }),
        localId: row.localId,
        restoredAt,
        table: row.table,
        updatedAt: Math.max(at, row.updatedAt + 1),
    });
}

export function eraseRows(rows: readonly PulledRow[], scope: EraseScope, now: number): PushRow[] {
    const changes = scope === "everything" ? { ...ERASE_CHANGES, ...EVERYTHING_CHANGES } : ERASE_CHANGES;
    return rows.flatMap((row) => {
        if (row.table === "accounts") {
            return row.fields.checkedAt === null || row.fields.checkedAt === undefined
                ? []
                : [pushOf(row, { checkedAt: null }, row.deletedAt, row.restoredAt, now)];
        }
        const change = changes[row.table];
        return change === undefined || row.deletedAt !== null ? [] : [pushOf(row, change, now, row.restoredAt, now)];
    });
}

const isErased = (row: PulledRow) => row.fields.date === ERASED_DAY;

export function deletedEntries(rows: readonly PulledRow[], deletedAccounts: ReadonlySet<string>) {
    const byId = new Map(rows.map((row) => [`${row.table}:${row.localId}`, row]));
    return rows
        .filter((row) => {
            if (row.table !== "transactions" || row.deletedAt === null || isErased(row)) {
                return false;
            }
            const { accountId, feeForId, installmentId, transferId } = row.fields;
            const purchase = byId.get(`transactions:${String(feeForId)}`);
            const installment = byId.get(`installments:${String(installmentId)}`);
            return (
                (transferId ?? null) === null &&
                (feeForId === null || feeForId === undefined || purchase?.deletedAt == null) &&
                installment?.deletedAt !== row.deletedAt &&
                !deletedAccounts.has(String(accountId))
            );
        })
        .toSorted(
            (a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0) || Number(b.fields.date ?? 0) - Number(a.fields.date ?? 0)
        );
}

export function restoreEntryRows(
    rows: readonly PulledRow[],
    id: string,
    deletedAccounts: ReadonlySet<string>,
    now: number
): PushRow[] {
    const previous = rows.find((row) => row.table === "transactions" && row.localId === id);
    if (!previous || previous.deletedAt === null || (previous.fields.transferId ?? null) !== null) {
        return [];
    }
    const { accountId, feeForId } = previous.fields;
    const purchase =
        feeForId === null || feeForId === undefined
            ? undefined
            : rows.find((row) => row.table === "transactions" && row.localId === feeForId);
    const feeTaken =
        purchase !== undefined &&
        rows.some((row) => row.table === "transactions" && row.deletedAt === null && row.fields.feeForId === feeForId);
    if (deletedAccounts.has(String(accountId)) || (purchase !== undefined && purchase.deletedAt !== null) || feeTaken) {
        return [];
    }
    const at = previous.deletedAt;
    const stamp = Math.max(now, era(previous) + 1);
    const taken = (row: PulledRow) => row.deletedAt === at;
    const plans = rows.filter(
        (row) => row.table === "installmentPlans" && taken(row) && row.fields.transactionId === id
    );
    const planIds = new Set(plans.map((row) => row.localId));
    const children = rows.filter(
        (row) =>
            (row.table === "installments" || row.table === "outsidePayments") &&
            taken(row) &&
            planIds.has(String(row.fields.planId))
    );
    const installmentIds = new Set(children.filter((row) => row.table === "installments").map((row) => row.localId));
    const entries = rows.filter(
        (row) =>
            row.table === "transactions" &&
            taken(row) &&
            (row.localId === id || row.fields.feeForId === id || installmentIds.has(String(row.fields.installmentId)))
    );
    return [...plans, ...children, ...entries].map((row) => pushOf(row, {}, null, stamp, now));
}

type ArchiveRow = Readonly<Record<string, WireValue>>;

export interface ArchiveDocument {
    exportedAt: number;
    format: typeof ARCHIVE_FORMAT;
    photos: Readonly<Record<string, string>>;
    tables: Readonly<Record<SyncedTable, readonly ArchiveRow[]>>;
    version: number;
}

const decodeDocument = Schema.decodeUnknownSync(
    Schema.Struct({
        format: Schema.Literal(ARCHIVE_FORMAT),
        tables: Schema.Record(
            Schema.String,
            Schema.Array(
                Schema.Record(Schema.String, Schema.Union([Schema.Boolean, Schema.Finite, Schema.String, Schema.Null]))
            )
        ),
        version: Schema.Int.check(Schema.isBetween({ maximum: ARCHIVE_VERSION, minimum: 1 })),
    })
);

export function parseArchive(text: string): ArchiveDocument | null {
    try {
        const parsed = decodeDocument(JSON.parse(text));
        return {
            exportedAt: 0,
            format: ARCHIVE_FORMAT,
            photos: {},
            // SAFETY: the map walks every SyncedTable, so each key is present.
            tables: Object.fromEntries(SYNCED_TABLES.map((table) => [table, parsed.tables[table] ?? []])) as Record<
                SyncedTable,
                readonly ArchiveRow[]
            >,
            version: parsed.version,
        };
    } catch {
        return null;
    }
}

export const archiveRowCount = (document: ArchiveDocument) =>
    SYNCED_TABLES.reduce((total, table) => total + document.tables[table].length, 0);

const keyColumn = (table: SyncedTable) => (table === "appMeta" ? "key" : "id");

export function buildArchive(rows: readonly PulledRow[], now: number): ArchiveDocument {
    // SAFETY: the map walks every SyncedTable, and each starts as an empty list.
    const tables = Object.fromEntries(SYNCED_TABLES.map((table) => [table, [] as ArchiveRow[]])) as Record<
        SyncedTable,
        ArchiveRow[]
    >;
    for (const row of rows) {
        // SAFETY: a pulled row's fields are wire values, the same primitives an archive carries.
        const fields = row.fields as Record<string, WireValue>;
        tables[row.table].push(
            row.table === "appMeta"
                ? { key: row.localId, value: fields.value ?? null }
                : {
                      ...fields,
                      deletedAt: row.deletedAt,
                      id: row.localId,
                      restoredAt: row.restoredAt,
                      updatedAt: row.updatedAt,
                  }
        );
    }
    return { exportedAt: now, format: ARCHIVE_FORMAT, photos: {}, tables, version: ARCHIVE_VERSION };
}

export const serializeArchive = (document: ArchiveDocument) => JSON.stringify(document);

const WIRE_DEFAULTS: Partial<Record<SyncedTable, Change>> = {
    accounts: { kind: "asset" },
    categories: { customName: false },
    outsideMoves: { adjustment: false },
    savingsGoals: { startAmount: 0, startAmountUsd: 0, targetDate: 0 },
};

function archivedFields(table: SyncedTable, row: ArchiveRow) {
    const defaults = WIRE_DEFAULTS[table] ?? {};
    return Object.fromEntries(
        Object.keys(FIELDS_BY_TABLE[table]).map((key) => [key, row[key] ?? defaults[key] ?? null])
    );
}

const sameFields = (a: Change, b: Change) => Object.keys(a).every((key) => a[key] === (b[key] ?? null));

const isPushRow = Schema.is(PushRow);

const isId = Schema.is(Schema.String);
const isInstant = Schema.is(Schema.Finite);
const instantOf = (value: WireValue | undefined) => (isInstant(value) ? value : null);

function deletionStamps(document: ArchiveDocument, held: ReadonlyMap<string, PulledRow>, now: number) {
    const groups = new Map<number, { changed: boolean; newest: number }>();
    let next = now;
    for (const row of held.values()) {
        next = Math.max(next, era(row) + 1);
    }
    for (const table of SYNCED_TABLES) {
        for (const row of table === "appMeta" ? [] : document.tables[table]) {
            const instant = instantOf(row.deletedAt);
            if (instant !== null) {
                const current = held.get(`${table}:${String(row.id)}`);
                const group = groups.get(instant) ?? { changed: false, newest: 0 };
                groups.set(instant, {
                    changed:
                        group.changed ||
                        current?.deletedAt !== instant ||
                        !sameFields(archivedFields(table, row), current.fields),
                    newest: Math.max(group.newest, current ? era(current) : 0),
                });
            }
        }
    }
    const stamps = new Map<number, number>();
    for (const [instant, { changed, newest }] of groups) {
        if (changed && instant > newest) {
            stamps.set(instant, instant);
        } else if (changed) {
            while (groups.has(next)) {
                next += 1;
            }
            stamps.set(instant, next);
            next += 1;
        }
    }
    return stamps;
}

function archivedPush(
    table: SyncedTable,
    localId: string,
    row: ArchiveRow,
    held: PulledRow | undefined,
    stamps: ReadonlyMap<number, number>,
    now: number
) {
    const fields = archivedFields(table, row);
    const updatedAt = Math.max(now, (held?.updatedAt ?? 0) + 1);
    if (table === "appMeta") {
        return held && sameFields(fields, held.fields)
            ? null
            : wireRow({ deletedAt: null, fields, localId, table, updatedAt });
    }
    const base = { fields, localId, table, updatedAt };
    const archivedDeletion = instantOf(row.deletedAt);
    if (archivedDeletion !== null) {
        const deletedAt = stamps.get(archivedDeletion);
        return deletedAt === undefined
            ? null
            : wireRow({ ...base, deletedAt, restoredAt: held ? held.restoredAt : instantOf(row.restoredAt) });
    }
    if (!held) {
        return wireRow({ ...base, deletedAt: null, restoredAt: instantOf(row.restoredAt) });
    }
    if (held.deletedAt !== null) {
        return wireRow({ ...base, deletedAt: null, restoredAt: Math.max(now, era(held) + 1) });
    }
    return sameFields(fields, held.fields) ? null : wireRow({ ...base, deletedAt: null, restoredAt: held.restoredAt });
}

function absentPush(row: PulledRow, now: number) {
    if (row.table === "appMeta") {
        return (row.fields.value ?? null) === null
            ? null
            : wireRow({
                  deletedAt: null,
                  fields: { value: null },
                  localId: row.localId,
                  table: row.table,
                  updatedAt: Math.max(now, row.updatedAt + 1),
              });
    }
    if (row.deletedAt === null) {
        return pushOf(row, ERASE_CHANGES[row.table] ?? EVERYTHING_CHANGES[row.table] ?? {}, now, row.restoredAt, now);
    }
    return row.table === "transactions" && !isErased(row)
        ? pushOf(row, ERASE_CHANGES.transactions ?? {}, row.deletedAt, row.restoredAt, now)
        : null;
}

export function archivePushes(document: ArchiveDocument, server: readonly PulledRow[], now: number): PushRow[] | null {
    const held = new Map(server.map((row) => [`${row.table}:${row.localId}`, row]));
    const stamps = deletionStamps(document, held, now);
    const kept = new Set<string>();
    const pushes: PushRow[] = [];
    for (const table of SYNCED_TABLES) {
        for (const row of document.tables[table]) {
            const localId = row[keyColumn(table)];
            if (!isId(localId)) {
                return null;
            }
            const key = `${table}:${localId}`;
            kept.add(key);
            const push = archivedPush(table, localId, row, held.get(key), stamps, now);
            if (push) {
                pushes.push(push);
            }
        }
    }
    for (const row of server) {
        const push = kept.has(`${row.table}:${row.localId}`) ? null : absentPush(row, now);
        if (push) {
            pushes.push(push);
        }
    }
    return pushes.every(isPushRow) ? pushes : null;
}

export type RangeKey = "all" | "year" | "month" | "lastMonth" | "custom";

export interface Range {
    from: string;
    key: RangeKey;
    to: string;
}

const dayStamp = (date: Date) =>
    `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`;

export const localDay = (at: number) => dayStamp(new Date(at));

export function inRange(at: number, range: Range, now: Date) {
    const day = localDay(at);
    const year = now.getFullYear();
    const month = now.getMonth();
    switch (range.key) {
        case "all": {
            return true;
        }
        case "year": {
            return day.startsWith(`${year}-`);
        }
        case "month": {
            return day.startsWith(dayStamp(new Date(year, month, 1)).slice(0, 8));
        }
        case "lastMonth": {
            return day.startsWith(dayStamp(new Date(year, month - 1, 1)).slice(0, 8));
        }
        default: {
            return (range.from === "" || day >= range.from) && (range.to === "" || day <= range.to);
        }
    }
}

export const csvFileName = (now: Date) => `outlayr-${dayStamp(now)}.csv`;

export const archiveFileName = (now: Date) => `outlayr-archive-${now.toISOString().slice(0, 10)}.json`;
