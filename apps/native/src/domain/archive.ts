import { z } from "zod";

/** Rises when a file carries something an older build would drop on restore. */
export const ARCHIVE_VERSION = 4;

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

/** A non-finite date decodes to null, not `new Date(NaN)`, which throws the moment anything formats it. */
export function decodeArchiveRow(table: ArchiveTable, row: ArchiveRow): TableRow {
    const dateColumns: readonly string[] = ARCHIVE_DATE_COLUMNS[table];
    return Object.fromEntries(
        Object.entries(row).map(([column, value]) => {
            if (!dateColumns.includes(column)) {
                return [column, value];
            }
            const instant = z.number().finite().safeParse(value);
            return [column, instant.success ? new Date(instant.data) : null];
        })
    );
}

export function serializeArchive(document: ArchiveDocument): string {
    return JSON.stringify(document);
}

const archiveValue = z.union([z.boolean(), z.number(), z.string(), z.null()]);

const archiveRow = z.record(z.string(), archiveValue);

const PHOTO_NAME = /^(?!\.{1,2}$)[^/\\]+$/;

const archiveDocument = z.object({
    // The stamp is only shown on the confirmation, so an unreadable one does not block a restore.
    exportedAt: z.number().catch(0),
    format: z.literal(ARCHIVE_FORMAT),
    photos: z.record(z.string().regex(PHOTO_NAME), z.string()).default({}),
    tables: z.record(z.string(), z.array(archiveRow)),
    version: z.number().int().min(1).max(ARCHIVE_VERSION),
});

/**
 * Strict and silent: a restore replaces the whole ledger, so a half-recognised file must never overwrite a good
 * one. A future version is refused, since the columns it adds are exactly the ones this build would drop.
 */
export function parseArchive(text: string): ArchiveDocument | null {
    let parsed: z.ZodSafeParseResult<z.infer<typeof archiveDocument>>;
    try {
        parsed = archiveDocument.safeParse(JSON.parse(text));
    } catch {
        return null;
    }
    if (!parsed.success) {
        return null;
    }
    // A missing table reads as empty: an archive written before the table existed is still intact.
    const { tables } = parsed.data;
    return {
        exportedAt: parsed.data.exportedAt,
        format: ARCHIVE_FORMAT,
        photos: parsed.data.photos,
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
            transactionPhotos: tables.transactionPhotos ?? [],
            transactionSplits: tables.transactionSplits ?? [],
            transactionTags: tables.transactionTags ?? [],
            transactions: tables.transactions ?? [],
            transfers: tables.transfers ?? [],
        },
        version: parsed.data.version,
    };
}

export function archiveRowCount(document: ArchiveDocument): number {
    return ARCHIVE_TABLES.reduce((total, table) => total + document.tables[table].length, 0);
}
