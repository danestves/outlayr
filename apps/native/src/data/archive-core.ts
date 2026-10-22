import { inArray } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import { z } from "zod";

import type { Database } from "@/db/client";
import {
    accounts,
    appMeta,
    budgets,
    categories,
    installmentPlans,
    installments,
    mainBudget,
    outsideMoves,
    outsidePayments,
    savingsGoals,
    tags,
    transactionPhotos,
    transactionSplits,
    transactions,
    transactionTags,
    transfers,
} from "@/db/schema";
import { withTransaction } from "@/db/transaction";
import { ARCHIVE_FORMAT, ARCHIVE_TABLES, ARCHIVE_VERSION, decodeArchiveRow, encodeArchiveRow } from "@/domain/archive";
import type { ArchiveDocument, ArchiveRow, ArchiveTable, TableRow } from "@/domain/archive";

import { photoFileName } from "./photo-store-core";
import { SYNCED_META_KEYS } from "./sync-outbox-core";

const TABLES = {
    accounts,
    appMeta,
    budgets,
    categories,
    installmentPlans,
    installments,
    mainBudget,
    outsideMoves,
    outsidePayments,
    savingsGoals,
    tags,
    transactionPhotos,
    transactionSplits,
    transactionTags,
    transactions,
    transfers,
} satisfies Record<ArchiveTable, SQLiteTable>;

// Tombstones travel: a deletion the archive dropped would come back live the moment a peer pushed again, and the
// undo window restores from them too.
export async function buildArchive(
    db: Database,
    now: Date,
    photos: Record<string, string> = {}
): Promise<ArchiveDocument> {
    // SAFETY: the loop below fills every `ARCHIVE_TABLES` member, the same union the type is keyed on.
    const tables = {} as Record<ArchiveTable, ArchiveRow[]>;
    await Promise.all(
        ARCHIVE_TABLES.map(async (table) => {
            // Only `SYNCED_META_KEYS`: the rest of `appMeta` is this phone's own, as in `replaceLocalFromAccount`.
            const rows: TableRow[] =
                table === "appMeta"
                    ? await db
                          .select()
                          .from(appMeta)
                          .where(inArray(appMeta.key, [...SYNCED_META_KEYS]))
                    : await db.select().from(TABLES[table]);
            tables[table] = rows.map((row) => encodeArchiveRow(row));
        })
    );
    return {
        exportedAt: now.getTime(),
        format: ARCHIVE_FORMAT,
        photos,
        tables,
        version: ARCHIVE_VERSION,
    };
}

// A replace in one transaction: a restore that emptied the tables and failed would leave nothing, and a merge would
// keep rows the archive deleted. Deletes run in reverse table order and inserts forward, so no row points at an
// unwritten parent.
export async function restoreArchive(db: Database, document: ArchiveDocument): Promise<number> {
    let written = 0;
    const carried = (row: TableRow) => {
        const uri = z.string().safeParse(row.imageUri);
        return uri.success && Object.hasOwn(document.photos, photoFileName(uri.data));
    };
    await withTransaction(db, async () => {
        for (const table of [...ARCHIVE_TABLES].reverse()) {
            // oxlint-disable-next-line no-await-in-loop -- children must be deleted before their parents, so the reversed ARCHIVE_TABLES order has to be walked one table at a time
            await (table === "appMeta"
                ? db.delete(appMeta).where(inArray(appMeta.key, [...SYNCED_META_KEYS]))
                : db.delete(TABLES[table]));
        }
        for (const table of ARCHIVE_TABLES) {
            const rows = document.tables[table]
                .map((row) => decodeArchiveRow(table, row))
                .map((row) => (carried(row) ? { ...row, imageKey: null } : row));
            if (rows.length === 0) {
                continue;
            }
            // Chunked against SQLite's 999 bound variables: a ledger is unbounded.
            for (let from = 0; from < rows.length; from += ARCHIVE_INSERT_CHUNK) {
                const slice = rows.slice(from, from + ARCHIVE_INSERT_CHUNK);
                // oxlint-disable-next-line no-await-in-loop -- every statement here shares the one open withTransaction connection, and forward table order writes parents before the rows referencing them
                await db.insert(TABLES[table]).values(slice);
                written += slice.length;
            }
        }
    });
    return written;
}

// 999 bound variables over the widest table's column count, with room to spare so a later column cannot push a
// restore over the limit.
const ARCHIVE_INSERT_CHUNK = 20;
