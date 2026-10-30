import * as Effect from "effect/Effect";
import { pipe } from "effect/Function";
import * as Option from "effect/Option";
import * as EffectRecord from "effect/Record";
import * as Schema from "effect/Schema";

import { SYNCED_SPECS, SYNCED_TABLES } from "@/data/sync-tables";
import type { SyncedTable } from "@/data/sync-tables";

/** Rises when a file carries something an older build would drop on restore. */
export const ARCHIVE_VERSION = 5;

export const ARCHIVE_FORMAT = "outlayr.archive";

type ArchiveValue = boolean | number | string | null;

export type ArchiveRow = Record<string, ArchiveValue>;

export type TableRow = Record<string, ArchiveValue | Date>;

export interface ArchiveDocument {
    exportedAt: number;
    format: typeof ARCHIVE_FORMAT;
    photos: Record<string, string>;
    tables: Record<SyncedTable, ArchiveRow[]>;
    version: number;
}

export function archiveFileName(now: Date): string {
    const stamp = now.toISOString().slice(0, 10);
    return `outlayr-archive-${stamp}.json`;
}

/** Written as epoch ms: `JSON.stringify` would turn a `Date` into an ISO string that restores as text. */
export function encodeArchiveRow(row: TableRow): ArchiveRow {
    return Object.fromEntries(
        Object.entries(row).map(([column, value]) => [column, value instanceof Date ? value.getTime() : value])
    );
}

const isInstant = Schema.is(Schema.Finite);

/** A non-finite date decodes to null, not `new Date(NaN)`, which throws the moment anything formats it. */
export function decodeArchiveRow(table: SyncedTable, row: ArchiveRow): TableRow {
    const { dates } = SYNCED_SPECS[table];
    return Object.fromEntries(
        Object.entries(row).map(([column, value]) => {
            if (!dates.includes(column)) {
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
        tables: pipe(
            SYNCED_SPECS,
            EffectRecord.map((_spec, table) => tables[table] ?? [])
        ),
        version: parsed.value.version,
    };
}

export function archiveRowCount(document: ArchiveDocument): number {
    return SYNCED_TABLES.reduce((total, table) => total + document.tables[table].length, 0);
}
