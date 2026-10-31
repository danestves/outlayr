import * as Effect from "effect/Effect";
import { pipe } from "effect/Function";
import * as EffectRecord from "effect/Record";
import * as Schema from "effect/Schema";

import type { Database } from "@/db/client";
import { transaction } from "@/db/transaction";
import { ARCHIVE_FORMAT, ARCHIVE_VERSION, decodeArchiveRow, encodeArchiveRow } from "@/domain/archive";
import type { ArchiveDocument, TableRow } from "@/domain/archive";

import { photoFileName } from "./photo-store-core";
import { SYNCED_SPECS, SYNCED_TABLES } from "./sync-tables";

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
    const tables = yield* Effect.all(
        pipe(
            SYNCED_SPECS,
            EffectRecord.map((spec, table) =>
                table === "profiles"
                    ? Effect.succeed([])
                    : query("build", () => db.select().from(spec.table).where(spec.scope)).pipe(
                          Effect.map((rows: TableRow[]) => rows.map((row) => encodeArchiveRow(row)))
                      )
            )
        ),
        { concurrency: "unbounded" }
    );
    const document: ArchiveDocument = {
        exportedAt: now.getTime(),
        format: ARCHIVE_FORMAT,
        photos,
        tables,
        version: ARCHIVE_VERSION,
    };
    return document;
});

// A replace in one transaction: a restore that emptied the tables and failed would leave nothing, and a merge would
// keep rows the archive deleted. Deletes run in reverse table order and inserts forward, so no row points at an
// unwritten parent.
const isImageUri = Schema.is(Schema.String);
const LEDGER_TABLES = SYNCED_TABLES.filter((table) => table !== "profiles");

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
            for (const table of [...LEDGER_TABLES].reverse()) {
                const spec = SYNCED_SPECS[table];
                yield* query("restore", () => db.delete(spec.table).where(spec.scope));
            }
            for (const table of LEDGER_TABLES) {
                const rows = document.tables[table]
                    .map((row) => decodeArchiveRow(table, row))
                    .map((row) => (carried(row) ? { ...row, imageKey: null } : row));
                if (rows.length === 0) {
                    continue;
                }
                // Chunked against SQLite's 999 bound variables: a ledger is unbounded.
                for (let from = 0; from < rows.length; from += ARCHIVE_INSERT_CHUNK) {
                    const slice = rows.slice(from, from + ARCHIVE_INSERT_CHUNK);
                    yield* query("restore", () => db.insert(SYNCED_SPECS[table].table).values(slice));
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
