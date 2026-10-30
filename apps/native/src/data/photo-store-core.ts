import { eq, isNotNull } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { SpendDb } from "./budget-spent";
import { SYNCED_SPECS, SYNCED_TABLES } from "./sync-tables";
import type { PhotoTable } from "./sync-tables";

export const PHOTO_DIRECTORY = "transaction-photos";

const PhotoStoreOperation = Schema.Literals(["files", "repoint", "rows"]);

export class PhotoStoreError extends Schema.TaggedError<PhotoStoreError>()("PhotoStoreError", {
    cause: Schema.Defect(),
    operation: PhotoStoreOperation,
}) {
    override get message(): string {
        return `Photo store ${this.operation} failed`;
    }
}

const query = <A>(operation: typeof PhotoStoreOperation.Type, run: () => PromiseLike<A>) =>
    Effect.tryPromise({ catch: (cause) => new PhotoStoreError({ cause, operation }), try: run });

const files = <A>(run: () => A) =>
    Effect.try({ catch: (cause) => new PhotoStoreError({ cause, operation: "files" }), try: run });

// One directory holds every table's photos, so a walk that misses a table reads its files as orphans and purges them.
export const PHOTO_TABLES: readonly PhotoTable[] = SYNCED_TABLES.flatMap((table) => {
    const { photos } = SYNCED_SPECS[table];
    return photos && !photos.dormant ? [photos] : [];
});

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
export const reconcilePhotos = Effect.fn("PhotoStore.reconcilePhotos")(function* reconcilePhotos(
    db: SpendDb,
    photoFiles: PhotoFiles,
    nowMs: number
) {
    const { directoryUri } = photoFiles;
    const stored = new Map((yield* files(() => photoFiles.list())).map((photo) => [photo.name, photo.modifiedAt]));

    const result: PhotoReconciliation = {
        cleared: 0,
        purged: 0,
        repointed: 0,
        rescued: 0,
    };
    const referenced = new Set<string>();

    // Every table reconciles against the `stored` and `referenced` maps the previous table already mutated, so a
    // table's rows cannot be read before the one before it has finished adopting files.
    for (const photoTable of PHOTO_TABLES) {
        // SAFETY: a runtime table choice erases the column map; the two columns selected exist on every table.
        const rows = (yield* query("rows", () =>
            db
                .select({ id: photoTable.id, imageUri: photoTable.imageUri })
                .from(photoTable.table)
                .where(isNotNull(photoTable.imageUri))
        )) as {
            id: string;
            imageUri: string | null;
        }[];

        const repoint = (id: string, uri: string | null) =>
            query("repoint", () => db.update(photoTable.table).set({ imageUri: uri }).where(eq(photoTable.id, id)));

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
                    // Two rows can name one file, so a row's `stored`/`referenced` bookkeeping and its adopt must land
                    // before the next row asks whether that file exists.
                    yield* repoint(row.id, current);
                    result.repointed += 1;
                }
                continue;
            }

            const adopted = `${row.id}${photoExtension(name)}`;
            if (yield* files(() => photoFiles.adopt(uri, adopted))) {
                stored.set(adopted, nowMs);
                referenced.add(adopted);
                yield* repoint(row.id, photoUriFor(directoryUri, adopted));
                result.rescued += 1;
                continue;
            }

            yield* repoint(row.id, null);
            result.cleared += 1;
        }
    }

    for (const [name, modifiedAt] of stored) {
        if (referenced.has(name) || nowMs - modifiedAt < PHOTO_PURGE_GRACE_MS) {
            continue;
        }
        yield* files(() => photoFiles.remove(name));
        result.purged += 1;
    }

    return result;
});
