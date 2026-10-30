import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { strFromU8, unzipSync } from "fflate";

import type { MmArchiveError } from "./types";

const ZIP_SCAN = 64;
const SQLITE_HEADER = [0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6f, 0x72, 0x6d, 0x61, 0x74, 0x20, 0x33, 0x00];

export type MoneyManagerArchive =
    | { ok: true; database: Uint8Array; version: number }
    | { ok: false; error: MmArchiveError };

function startsWithSqlite(bytes: Uint8Array): boolean {
    if (bytes.length < SQLITE_HEADER.length) {
        return false;
    }
    for (let index = 0; index < SQLITE_HEADER.length; index += 1) {
        if (bytes[index] !== SQLITE_HEADER[index]) {
            return false;
        }
    }
    return true;
}

// The backup prefixes the zip with padding, so the signature is not always at byte 0.
function findZipOffset(bytes: Uint8Array): number {
    const last = Math.min(bytes.length - 3, ZIP_SCAN);
    for (let index = 0; index < last; index += 1) {
        if (
            bytes[index] === 0x50 &&
            bytes[index + 1] === 0x4b &&
            bytes[index + 2] === 0x03 &&
            bytes[index + 3] === 0x04
        ) {
            return index;
        }
    }
    return -1;
}

const decodeMeta = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Record(Schema.String, Schema.Unknown)));
const decodeFinite = Schema.decodeUnknownOption(Schema.Finite);

function metaVersion(bytes: Uint8Array | undefined): number | "damaged" {
    if (bytes == null) {
        return 1;
    }
    let parsed: ReturnType<typeof decodeMeta>;
    try {
        parsed = decodeMeta(strFromU8(bytes));
    } catch {
        return "damaged";
    }
    if (Option.isNone(parsed)) {
        return "damaged";
    }
    if (!Object.hasOwn(parsed.value, "version")) {
        return 1;
    }
    const version = decodeFinite(parsed.value.version);
    if (Option.isNone(version)) {
        return "damaged";
    }
    return version.value;
}

export function readMoneyManagerArchive(bytes: Uint8Array): MoneyManagerArchive {
    if (startsWithSqlite(bytes)) {
        return { error: { kind: "realbyte" }, ok: false };
    }
    const offset = findZipOffset(bytes);
    if (offset < 0) {
        return { error: { kind: "notBackup" }, ok: false };
    }
    let entries: Record<string, Uint8Array>;
    try {
        entries = unzipSync(bytes.subarray(offset));
    } catch {
        return { error: { kind: "damaged" }, ok: false };
    }
    const database = entries["MyFinance.db"];
    if (database == null) {
        return { error: { kind: "notBackup" }, ok: false };
    }
    const version = metaVersion(entries.backup_meta);
    if (version === "damaged") {
        return { error: { kind: "damaged" }, ok: false };
    }
    if (version > 1) {
        return { error: { kind: "newer", version }, ok: false };
    }
    return { database, ok: true, version };
}
