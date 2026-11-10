import { readMoneyManagerArchive } from "@outlayr/money/money-manager/archive";
import { readMoneyManagerSnapshot } from "@outlayr/money/money-manager/snapshot";
import type { SqlAll } from "@outlayr/money/money-manager/snapshot";
import type { MmArchiveError, MmSnapshot } from "@outlayr/money/money-manager/types";

export type BackupReading = { ok: true; snapshot: MmSnapshot } | { ok: false; error: MmArchiveError };

const DAMAGED: BackupReading = { error: { kind: "damaged" }, ok: false };

/** Lets the "Reading" screen paint before a synchronous unzip or query holds the thread. */
const paint = () =>
    new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
    });

async function openDatabase(bytes: Uint8Array) {
    const [{ default: initSqlJs }, { default: wasmUrl }] = await Promise.all([
        import("sql.js"),
        import("sql.js/dist/sql-wasm.wasm?url"),
    ]);
    const sql = await initSqlJs({ locateFile: () => wasmUrl });
    return new sql.Database(bytes);
}

export async function readBackupFile(file: File): Promise<BackupReading> {
    let bytes: Uint8Array;
    try {
        bytes = new Uint8Array(await file.arrayBuffer());
    } catch {
        return DAMAGED;
    }
    await paint();
    const archive = readMoneyManagerArchive(bytes);
    if (!archive.ok) {
        return archive;
    }
    await paint();
    try {
        const database = await openDatabase(archive.database);
        const all: SqlAll = (sql) => {
            const statement = database.prepare(sql);
            const rows: object[] = [];
            try {
                while (statement.step()) {
                    rows.push(statement.getAsObject());
                }
            } finally {
                statement.free();
            }
            return rows;
        };
        try {
            return { ok: true, snapshot: readMoneyManagerSnapshot(all, archive.version) };
        } finally {
            database.close();
        }
    } catch {
        return DAMAGED;
    }
}
