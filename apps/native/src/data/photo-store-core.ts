import { eq, isNotNull } from "drizzle-orm";
import type { AnySQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";

import { accounts, transactions } from "@/db/schema";

import type { SpendDb } from "./budget-spent";

export const PHOTO_DIRECTORY = "transaction-photos";

export interface PhotoTable {
    readonly id: AnySQLiteColumn;
    readonly imageKey: AnySQLiteColumn;
    readonly imageUri: AnySQLiteColumn;
    readonly table: SQLiteTable;
}

// One directory holds every table's photos, so a walk that misses a table reads its files as orphans and purges them.
export const PHOTO_TABLES: readonly PhotoTable[] = [
    {
        id: transactions.id,
        imageKey: transactions.imageKey,
        imageUri: transactions.imageUri,
        table: transactions,
    },
    {
        id: accounts.id,
        imageKey: accounts.imageKey,
        imageUri: accounts.imageUri,
        table: accounts,
    },
];

// A photo is written when picked but referenced only on save, so a purge with no grace deletes it under an open editor.
export const PHOTO_PURGE_GRACE_MS = 24 * 60 * 60 * 1000;

interface StoredPhoto {
    modifiedAt: number;
    name: string;
}

// Injected so reconciliation stays free of `expo-file-system`, which can't load under the node test runner.
export interface PhotoFiles {
    /** False when the source is gone: the picker's cache is reclaimable at any time, hence the copy. */
    adopt: (sourceUri: string, name: string) => boolean;
    readonly directoryUri: string;
    list: () => StoredPhoto[];
    read: (name: string) => Uint8Array | null;
    remove: (name: string) => void;
    write: (name: string, bytes: Uint8Array) => void;
}

const TRAILING_SLASHES = /\/+$/;

export function photoFileName(uri: string): string {
    const [beforeQuery] = uri.split("?");
    const [path] = beforeQuery.split("#");
    return path.slice(path.lastIndexOf("/") + 1);
}

export function photoUriFor(directoryUri: string, name: string): string {
    return `${directoryUri.replace(TRAILING_SLASHES, "")}/${name}`;
}

const DEFAULT_EXTENSION = ".jpg";
const MAX_EXTENSION_LENGTH = 6;

export function photoExtension(name: string): string {
    const dot = name.lastIndexOf(".");
    if (dot <= 0) {
        return DEFAULT_EXTENSION;
    }
    const extension = name.slice(dot).toLowerCase();
    return extension.length <= MAX_EXTENSION_LENGTH ? extension : DEFAULT_EXTENSION;
}

export interface PhotoReconciliation {
    cleared: number;
    purged: number;
    repointed: number;
    rescued: number;
}

// Matches on file name, not path: old rows point into a picker cache iOS may reclaim, and the container UUID in the
// absolute path changes on app update. Tombstones count as references: the undo window can restore one.
export async function reconcilePhotos(db: SpendDb, files: PhotoFiles, nowMs: number): Promise<PhotoReconciliation> {
    const { directoryUri } = files;
    const stored = new Map(files.list().map((photo) => [photo.name, photo.modifiedAt]));

    const result: PhotoReconciliation = {
        cleared: 0,
        purged: 0,
        repointed: 0,
        rescued: 0,
    };
    const referenced = new Set<string>();

    /* oxlint-disable no-await-in-loop -- every table reconciles against the `stored` and `referenced` maps the previous table already mutated, so a table's rows cannot be read before the one before it has finished adopting files */
    for (const photoTable of PHOTO_TABLES) {
        // SAFETY: a runtime table choice erases the column map; the two columns selected exist on every table.
        const rows = (await db
            .select({ id: photoTable.id, imageUri: photoTable.imageUri })
            .from(photoTable.table)
            .where(isNotNull(photoTable.imageUri))) as {
            id: string;
            imageUri: string | null;
        }[];

        const repoint = async (id: string, uri: string | null) =>
            await db.update(photoTable.table).set({ imageUri: uri }).where(eq(photoTable.id, id));

        for (const row of rows) {
            const uri = row.imageUri;
            if (uri == null) {
                continue;
            }

            const name = photoFileName(uri);
            if (name !== "" && stored.has(name)) {
                referenced.add(name);
                const current = photoUriFor(directoryUri, name);
                if (uri !== current) {
                    // oxlint-disable-next-line no-await-in-loop -- two rows can name one file, so a row's `stored`/`referenced` bookkeeping and its adopt must land before the next row asks whether that file exists
                    await repoint(row.id, current);
                    result.repointed += 1;
                }
                continue;
            }

            const adopted = `${row.id}${photoExtension(name)}`;
            if (files.adopt(uri, adopted)) {
                stored.set(adopted, nowMs);
                referenced.add(adopted);
                await repoint(row.id, photoUriFor(directoryUri, adopted));
                result.rescued += 1;
                continue;
            }

            await repoint(row.id, null);
            result.cleared += 1;
        }
    }
    /* oxlint-enable no-await-in-loop */

    for (const [name, modifiedAt] of stored) {
        if (referenced.has(name) || nowMs - modifiedAt < PHOTO_PURGE_GRACE_MS) {
            continue;
        }
        files.remove(name);
        result.purged += 1;
    }

    return result;
}
