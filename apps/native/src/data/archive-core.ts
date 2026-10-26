import { inArray } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
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
    mainBudget,
    outsideMoves,
    outsidePayments,
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
    transactionAttachments,
    transactionPhotos,
    transactionSplits,
    transactionTags,
    transactions,
    transfers,
} satisfies Record<ArchiveTable, SQLiteTable>;

const ArchiveOperation = Schema.Literals(["build", "restore"]);

export class ArchiveError extends Schema.TaggedError<ArchiveError>()("ArchiveError", {
    cause: Schema.Defect(),
    operation: ArchiveOperation,
}) {
    override get message(): string {
        return `Archive ${this.operation} failed`;
    }
}

const query = <A>(operation: typeof ArchiveOperation.Type, run: () => PromiseLike<A>) =>
    Effect.tryPromise({ catch: (cause) => new ArchiveError({ cause, operation }), try: run });

// Tombstones travel: a deletion the archive dropped would come back live the moment a peer pushed again, and the
// undo window restores from them too.
export const buildArchive = Effect.fn("Archive.buildArchive")(function* buildArchive(
    db: Database,
    now: Date,
    photos: Record<string, string> = {}
) {
    const entries = yield* Effect.all(
        ARCHIVE_TABLES.map((table) =>
            Effect.gen(function* readTable() {
                // Only `SYNCED_META_KEYS`: the rest of `appMeta` is this phone's own, as in `replaceLocalFromAccount`.
                const rows: TableRow[] =
                    table === "appMeta"
                        ? yield* query("build", () =>
                              db
                                  .select()
                                  .from(appMeta)
                                  .where(inArray(appMeta.key, [...SYNCED_META_KEYS]))
                          )
                        : yield* query("build", () => db.select().from(TABLES[table]));
                return [table, rows.map((row) => encodeArchiveRow(row))] as const;
            })
        ),
        { concurrency: "unbounded" }
    );
    const document: ArchiveDocument = {
        exportedAt: now.getTime(),
        format: ARCHIVE_FORMAT,
        photos,
        // SAFETY: the entries cover every `ARCHIVE_TABLES` member, the same union the type is keyed on.
        tables: Object.fromEntries(entries) as Record<ArchiveTable, ArchiveRow[]>,
        version: ARCHIVE_VERSION,
    };
    return document;
});

// A replace in one transaction: a restore that emptied the tables and failed would leave nothing, and a merge would
// keep rows the archive deleted. Deletes run in reverse table order and inserts forward, so no row points at an
// unwritten parent.
const isImageUri = Schema.is(Schema.String);

export const restoreArchive = Effect.fn("Archive.restoreArchive")(function* restoreArchive(
    db: Database,
    document: ArchiveDocument
) {
    let written = 0;
    const carried = (row: TableRow) => {
        const uri = row.imageUri;
        return isImageUri(uri) && Object.hasOwn(document.photos, photoFileName(uri));
    };
    yield* transaction(
        db,
        Effect.gen(function* replace() {
            for (const table of [...ARCHIVE_TABLES].reverse()) {
                yield* query("restore", () =>
                    table === "appMeta"
                        ? db.delete(appMeta).where(inArray(appMeta.key, [...SYNCED_META_KEYS]))
                        : db.delete(TABLES[table])
                );
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
                    yield* query("restore", () => db.insert(TABLES[table]).values(slice));
                    written += slice.length;
                }
            }
        }),
        (cause) => new ArchiveError({ cause, operation: "restore" })
    );
    return written;
});

// 999 bound variables over the widest table's column count, with room to spare so a later column cannot push a
// restore over the limit.
const ARCHIVE_INSERT_CHUNK = 20;
