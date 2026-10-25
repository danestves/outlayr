import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

/** Rises when a file carries something an older build would drop on restore. */
export const ARCHIVE_VERSION = 5;

export const ARCHIVE_FORMAT = "outlayr.archive";

/** In restore order: with foreign keys enforced, a row written before the one it points at fails. */
export const ARCHIVE_TABLES = [
    "categories",
    "accounts",
    "transfers",
    "transactions",
    "budgets",
    "mainBudget",
    "savingsGoals",
    "tags",
    "transactionTags",
    "transactionPhotos",
    "transactionSplits",
    // After `transactions`: an order points at its purchase entry.
    "installmentPlans",
    "installments",
    "outsidePayments",
    "outsideMoves",
    "transactionAttachments",
    "appMeta",
] as const;

export type ArchiveTable = (typeof ARCHIVE_TABLES)[number];

/** Written as epoch ms: `JSON.stringify` would turn a `Date` into an ISO string that restores as text. */
const ARCHIVE_DATE_COLUMNS = {
    accounts: ["initialBalanceDate", "dateCreated", "updatedAt", "deletedAt"],
    appMeta: [],
    budgets: ["startDate", "dateCreated", "updatedAt", "deletedAt"],
    categories: ["dateCreated", "updatedAt", "deletedAt"],
    installmentPlans: ["dateCreated", "updatedAt", "deletedAt", "restoredAt"],
    installments: ["dueDate", "updatedAt", "deletedAt", "restoredAt"],
    mainBudget: ["startDate", "dateCreated", "updatedAt", "deletedAt"],
    outsideMoves: ["date", "updatedAt", "deletedAt", "restoredAt"],
    outsidePayments: ["date", "updatedAt", "deletedAt", "restoredAt"],
    savingsGoals: ["dateCreated", "targetDate", "updatedAt", "deletedAt"],
    tags: ["updatedAt", "deletedAt"],
    transactionAttachments: ["updatedAt", "deletedAt"],
    transactionPhotos: ["updatedAt", "deletedAt"],
    transactionSplits: ["updatedAt", "deletedAt"],
    transactionTags: ["updatedAt", "deletedAt", "restoredAt"],
    transactions: ["date", "day", "month", "recurringEndDate", "updatedAt", "deletedAt", "restoredAt"],
    transfers: ["date", "day", "month", "dateCreated", "updatedAt", "deletedAt"],
} satisfies Record<ArchiveTable, readonly string[]>;

type ArchiveValue = boolean | number | string | null;

export type ArchiveRow = Record<string, ArchiveValue>;

export type TableRow = Record<string, ArchiveValue | Date>;

export interface ArchiveDocument {
    exportedAt: number;
    format: typeof ARCHIVE_FORMAT;
    photos: Record<string, string>;
    tables: Record<ArchiveTable, ArchiveRow[]>;
    version: number;
}

export function archiveFileName(now: Date): string {
    const stamp = now.toISOString().slice(0, 10);
    return `outlayr-archive-${stamp}.json`;
}

export function encodeArchiveRow(row: TableRow): ArchiveRow {
    // Every `Date`, not just the listed ones, or an unlisted one would restore as text.
    return Object.fromEntries(
        Object.entries(row).map(([column, value]) => [column, value instanceof Date ? value.getTime() : value])
    );
}

const isInstant = Schema.is(Schema.Finite);

/** A non-finite date decodes to null, not `new Date(NaN)`, which throws the moment anything formats it. */
export function decodeArchiveRow(table: ArchiveTable, row: ArchiveRow): TableRow {
    const dateColumns: readonly string[] = ARCHIVE_DATE_COLUMNS[table];
    return Object.fromEntries(
        Object.entries(row).map(([column, value]) => {
            if (!dateColumns.includes(column)) {
                return [column, value];
            }
            return [column, isInstant(value) ? new Date(value) : null];
        })
    );
}

export function serializeArchive(document: ArchiveDocument): string {
    return JSON.stringify(document);
}

const archiveValue = Schema.Union([Schema.Boolean, Schema.Finite, Schema.String, Schema.Null]);

const archiveRow = Schema.Record(Schema.String, archiveValue);

const PHOTO_NAME = /^(?!\.{1,2}$)[^/\\]+$/;

const decodeArchiveDocument = Schema.decodeUnknownOption(
    Schema.Struct({
        // The stamp is only shown on the confirmation, so an unreadable one does not block a restore.
        exportedAt: Schema.Finite.pipe(
            Schema.withDecodingDefault(Effect.succeed(0)),
            Schema.catchDecoding(() => Effect.succeedSome(0))
        ),
        format: Schema.Literal(ARCHIVE_FORMAT),
        photos: Schema.Record(Schema.String, Schema.String)
            .check(Schema.makeFilter((photos) => Object.keys(photos).every((name) => PHOTO_NAME.test(name))))
            .pipe(Schema.withDecodingDefault(Effect.succeed({}))),
        tables: Schema.Record(Schema.String, Schema.mutable(Schema.Array(archiveRow))),
        version: Schema.Int.check(Schema.isBetween({ maximum: ARCHIVE_VERSION, minimum: 1 })),
    })
);

/**
 * Strict and silent: a restore replaces the whole ledger, so a half-recognised file must never overwrite a good
 * one. A future version is refused, since the columns it adds are exactly the ones this build would drop.
 */
export function parseArchive(text: string): ArchiveDocument | null {
    let parsed: ReturnType<typeof decodeArchiveDocument>;
    try {
        parsed = decodeArchiveDocument(JSON.parse(text));
    } catch {
        return null;
    }
    if (Option.isNone(parsed)) {
        return null;
    }
    // A missing table reads as empty: an archive written before the table existed is still intact.
    const { tables } = parsed.value;
    return {
        exportedAt: parsed.value.exportedAt,
        format: ARCHIVE_FORMAT,
        photos: parsed.value.photos,
        tables: {
            accounts: tables.accounts ?? [],
            appMeta: tables.appMeta ?? [],
            budgets: tables.budgets ?? [],
            categories: tables.categories ?? [],
            installmentPlans: tables.installmentPlans ?? [],
            installments: tables.installments ?? [],
            mainBudget: tables.mainBudget ?? [],
            outsideMoves: tables.outsideMoves ?? [],
            outsidePayments: tables.outsidePayments ?? [],
            savingsGoals: tables.savingsGoals ?? [],
            tags: tables.tags ?? [],
            transactionAttachments: tables.transactionAttachments ?? [],
            transactionPhotos: tables.transactionPhotos ?? [],
            transactionSplits: tables.transactionSplits ?? [],
            transactionTags: tables.transactionTags ?? [],
            transactions: tables.transactions ?? [],
            transfers: tables.transfers ?? [],
        },
        version: parsed.value.version,
    };
}

export function archiveRowCount(document: ArchiveDocument): number {
    return ARCHIVE_TABLES.reduce((total, table) => total + document.tables[table].length, 0);
}
