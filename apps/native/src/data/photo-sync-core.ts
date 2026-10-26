import { and, eq, isNotNull, isNull } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { SpendDb } from "./budget-spent";
import { PHOTO_TABLES, photoFileName, photoUriFor } from "./photo-store-core";
import type { PhotoFiles, PhotoTable } from "./photo-store-core";

// Bytes land BEFORE the key is recorded: a key naming an object never PUT fails on every device forever, while bytes
// with no key are reused next pass. The key lands BEFORE the local path, which is device-local and derived from it.
export interface PhotoTransport {
    /** `storageId` is what Convex file storage's PUT returns; R2 addresses by key and returns none. */
    confirmUpload: (key: string, storageId: string | null) => Promise<void>;
    /** Null for a missing object: a 404 is a delete racing this fetch, not a failure. */
    get: (url: string) => Promise<Uint8Array | null>;
    put: (url: string, bytes: Uint8Array) => Promise<string | null>;
    /** A key the account does not own is not returned. */
    readUrls: (keys: readonly string[]) => Promise<{ key: string; url: string }[]>;
    release: (key: string) => Promise<void>;
    requestUpload: (name: string) => Promise<{ key: string; url: string }>;
}

const PhotoTransferOperation = Schema.Literals(["download", "release", "rows", "upload"]);

export class PhotoTransferError extends Schema.TaggedError<PhotoTransferError>()("PhotoTransferError", {
    cause: Schema.Defect(),
    operation: PhotoTransferOperation,
}) {
    override get message(): string {
        return `Photo ${this.operation} failed`;
    }
}

const transfer = <A>(operation: typeof PhotoTransferOperation.Type, run: () => PromiseLike<A>) =>
    Effect.tryPromise({ catch: (cause) => new PhotoTransferError({ cause, operation }), try: run });

const files = <A>(operation: typeof PhotoTransferOperation.Type, run: () => A) =>
    Effect.try({ catch: (cause) => new PhotoTransferError({ cause, operation }), try: run });

// At or under the server's `PHOTO_URL_BATCH_LIMIT`, and small because a pass runs on the foreground app.
export const PHOTO_SYNC_BATCH = 25;

export interface PhotoSyncResult {
    downloaded: number;
    released: number;
    uploaded: number;
}

export function photoNameFromKey(key: string): string | null {
    const segments = key.split("/");
    const name = segments.at(-1);
    return segments.length >= 2 && name ? name : null;
}

// The key's last segment IS the device file name, so a retried upload lands on the same key instead of orphaning bytes.
function keyMatchesPhoto(imageKey: string | null, imageUri: string): boolean {
    return imageKey !== null && photoNameFromKey(imageKey) === photoFileName(imageUri);
}

interface PhotoRow {
    id: string;
    imageKey: string | null;
    imageUri: string | null;
}

const photoRows = Effect.fn("PhotoSync.photoRows")(function* photoRows(
    db: SpendDb,
    photoTable: PhotoTable,
    live: "uploadable" | "downloadable"
) {
    // SAFETY: a runtime table choice erases the generated row type; the selected columns are common to every table.
    return (yield* transfer("rows", () =>
        db
            .select({
                id: photoTable.id,
                imageKey: photoTable.imageKey,
                imageUri: photoTable.imageUri,
            })
            .from(photoTable.table)
            .where(
                live === "uploadable"
                    ? isNotNull(photoTable.imageUri)
                    : and(isNotNull(photoTable.imageKey), isNull(photoTable.imageUri))
            )
    )) as PhotoRow[];
});

// Releasing the superseded key is best-effort: the server re-checks references, and a leaked object costs storage
// where a lost one costs a photo. `updatedAt` is bumped so the new key can't lose a merge to an older peer edit.
export const uploadPhotos = Effect.fn("PhotoSync.uploadPhotos")(function* uploadPhotos(
    db: SpendDb,
    photoFiles: PhotoFiles,
    transport: PhotoTransport,
    now: Date
) {
    let uploaded = 0;
    let released = 0;

    for (const photoTable of PHOTO_TABLES) {
        // PHOTO_SYNC_BATCH caps the pass by counting uploads that have already finished, so each photo's
        // request/put/confirm handshake has to complete before the next row is considered; running them together would
        // send the whole ledger's photos in one pass.
        for (const row of yield* photoRows(db, photoTable, "uploadable")) {
            if (uploaded >= PHOTO_SYNC_BATCH) {
                return { released, uploaded };
            }
            const uri = row.imageUri;
            if (uri === null || keyMatchesPhoto(row.imageKey, uri)) {
                continue;
            }

            const name = photoFileName(uri);
            const bytes = yield* files("upload", () => photoFiles.read(name));
            if (name === "" || bytes === null) {
                // Launch reconciliation owns a missing file; re-pointing here would duplicate it against a stale read.
                continue;
            }

            const superseded = row.imageKey;
            const { key, url } = yield* transfer("upload", () => transport.requestUpload(name));
            const storageId = yield* transfer("upload", () => transport.put(url, bytes));
            yield* transfer("upload", () => transport.confirmUpload(key, storageId));

            yield* transfer("upload", () =>
                db
                    .update(photoTable.table)
                    .set({ imageKey: key, updatedAt: now })
                    // A photo replaced while the bytes were in flight must not get the key of the one that went up.
                    .where(and(eq(photoTable.id, row.id), eq(photoTable.imageUri, uri)))
            );
            uploaded += 1;

            if (superseded !== null && superseded !== key) {
                const didRelease = yield* transfer("release", () => transport.release(superseded)).pipe(
                    Effect.as(true),
                    // Leaked, not lost. A later server-side sweep reclaims it.
                    Effect.catchTags({ PhotoTransferError: () => Effect.succeed(false) })
                );
                if (didRelease) {
                    released += 1;
                }
            }
        }
    }

    return { released, uploaded };
});

// A url that answers nothing is the delete race: the key stays and the next pass retries. Clearing it would turn a
// transient 404 into permanent loss when two devices disagree about a delete.
export const downloadPhotos = Effect.fn("PhotoSync.downloadPhotos")(function* downloadPhotos(
    db: SpendDb,
    photoFiles: PhotoFiles,
    transport: PhotoTransport
) {
    const wanted = new Map<string, { photoTable: PhotoTable; id: string; name: string }[]>();
    const onDisk = new Set((yield* files("download", () => photoFiles.list())).map((photo) => photo.name));
    let downloaded = 0;

    const repoint = (photoTable: PhotoTable, id: string, name: string) =>
        transfer("download", () =>
            db
                .update(photoTable.table)
                // No `updatedAt` bump: the path is device-local and does not replicate.
                .set({ imageUri: photoUriFor(photoFiles.directoryUri, name) })
                .where(eq(photoTable.id, id))
        );

    // Each table is read and repointed on the one SQLite connection the pass is still walking, so issuing the tables
    // together interleaves writes into the middle of a read.
    for (const photoTable of PHOTO_TABLES) {
        for (const row of yield* photoRows(db, photoTable, "downloadable")) {
            const key = row.imageKey;
            const name = key === null ? null : photoNameFromKey(key);
            if (key === null || name === null) {
                continue;
            }
            if (onDisk.has(name)) {
                yield* repoint(photoTable, row.id, name);
                continue;
            }
            const bucket = wanted.get(key) ?? [];
            bucket.push({ id: row.id, name, photoTable });
            wanted.set(key, bucket);
        }
    }

    const keys = [...wanted.keys()].slice(0, PHOTO_SYNC_BATCH);
    if (keys.length === 0) {
        return 0;
    }

    // `get` holds a whole photo's bytes in memory until they are written out, so fetching the batch together would
    // hold PHOTO_SYNC_BATCH photos at once on a handset.
    for (const { key, url } of yield* transfer("download", () => transport.readUrls(keys))) {
        const bytes = yield* transfer("download", () => transport.get(url));
        if (bytes === null) {
            continue;
        }
        // These updates share the one SQLite connection the loop keeps downloading against, so issuing them together
        // interleaves the writes with the next photo's fetch.
        for (const { photoTable, id, name } of wanted.get(key) ?? []) {
            yield* files("download", () => {
                photoFiles.write(name, bytes);
            });
            yield* repoint(photoTable, id, name);
            downloaded += 1;
        }
    }

    return downloaded;
});

export const downloadEveryPhoto = Effect.fn("PhotoSync.downloadEveryPhoto")(function* downloadEveryPhoto(
    db: SpendDb,
    photoFiles: PhotoFiles,
    transport: PhotoTransport
) {
    for (;;) {
        // A pass fetches one batch, and what the next pass still wants depends on what this one wrote.
        if ((yield* downloadPhotos(db, photoFiles, transport)) === 0) {
            return;
        }
    }
});

export const runPhotoSync = Effect.fn("PhotoSync.runPhotoSync")(function* runPhotoSync(
    db: SpendDb,
    photoFiles: PhotoFiles,
    transport: PhotoTransport,
    now: Date = new Date()
) {
    const { uploaded, released } = yield* uploadPhotos(db, photoFiles, transport, now);
    const downloaded = yield* downloadPhotos(db, photoFiles, transport);
    const result: PhotoSyncResult = { downloaded, released, uploaded };
    return result;
});
