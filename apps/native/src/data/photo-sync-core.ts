import { and, eq, isNotNull, isNull } from "drizzle-orm";

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

async function photoRows(
    db: SpendDb,
    photoTable: PhotoTable,
    live: "uploadable" | "downloadable"
): Promise<PhotoRow[]> {
    // SAFETY: a runtime table choice erases the generated row type; the selected columns are common to every table.
    return (await db
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
        )) as PhotoRow[];
}

// Releasing the superseded key is best-effort: the server re-checks references, and a leaked object costs storage
// where a lost one costs a photo. `updatedAt` is bumped so the new key can't lose a merge to an older peer edit.
export async function uploadPhotos(
    db: SpendDb,
    files: PhotoFiles,
    transport: PhotoTransport,
    now: Date
): Promise<{ uploaded: number; released: number }> {
    let uploaded = 0;
    let released = 0;

    for (const photoTable of PHOTO_TABLES) {
        /* oxlint-disable no-await-in-loop -- PHOTO_SYNC_BATCH caps the pass by counting uploads that have already finished, so each photo's request/put/confirm handshake has to complete before the next row is considered; running them together would send the whole ledger's photos in one pass */
        for (const row of await photoRows(db, photoTable, "uploadable")) {
            if (uploaded >= PHOTO_SYNC_BATCH) {
                return { released, uploaded };
            }
            const uri = row.imageUri;
            if (uri === null || keyMatchesPhoto(row.imageKey, uri)) {
                continue;
            }

            const name = photoFileName(uri);
            const bytes = files.read(name);
            if (name === "" || bytes === null) {
                // Launch reconciliation owns a missing file; re-pointing here would duplicate it against a stale read.
                continue;
            }

            const superseded = row.imageKey;
            const { key, url } = await transport.requestUpload(name);
            const storageId = await transport.put(url, bytes);
            await transport.confirmUpload(key, storageId);

            await db
                .update(photoTable.table)
                .set({ imageKey: key, updatedAt: now })
                // A photo replaced while the bytes were in flight must not get the key of the one that went up.
                .where(and(eq(photoTable.id, row.id), eq(photoTable.imageUri, uri)));
            uploaded += 1;

            if (superseded !== null && superseded !== key) {
                try {
                    await transport.release(superseded);
                    released += 1;
                } catch {
                    // Leaked, not lost. A later server-side sweep reclaims it.
                }
            }
        }
        /* oxlint-enable no-await-in-loop */
    }

    return { released, uploaded };
}

// A url that answers nothing is the delete race: the key stays and the next pass retries. Clearing it would turn a
// transient 404 into permanent loss when two devices disagree about a delete.
export async function downloadPhotos(db: SpendDb, files: PhotoFiles, transport: PhotoTransport): Promise<number> {
    const wanted = new Map<string, { photoTable: PhotoTable; id: string; name: string }[]>();
    const onDisk = new Set(files.list().map((photo) => photo.name));
    let downloaded = 0;

    const repoint = async (photoTable: PhotoTable, id: string, name: string) => {
        await db
            .update(photoTable.table)
            // No `updatedAt` bump: the path is device-local and does not replicate.
            .set({ imageUri: photoUriFor(files.directoryUri, name) })
            .where(eq(photoTable.id, id));
    };

    /* oxlint-disable no-await-in-loop -- each table is read and repointed on the one SQLite connection the pass is still walking, so issuing the tables together interleaves writes into the middle of a read */
    for (const photoTable of PHOTO_TABLES) {
        for (const row of await photoRows(db, photoTable, "downloadable")) {
            const key = row.imageKey;
            const name = key === null ? null : photoNameFromKey(key);
            if (key === null || name === null) {
                continue;
            }
            if (onDisk.has(name)) {
                await repoint(photoTable, row.id, name);
                continue;
            }
            const bucket = wanted.get(key) ?? [];
            bucket.push({ id: row.id, name, photoTable });
            wanted.set(key, bucket);
        }
    }
    /* oxlint-enable no-await-in-loop */

    const keys = [...wanted.keys()].slice(0, PHOTO_SYNC_BATCH);
    if (keys.length === 0) {
        return 0;
    }

    /* oxlint-disable no-await-in-loop -- `get` holds a whole photo's bytes in memory until they are written out, so fetching the batch together would hold PHOTO_SYNC_BATCH photos at once on a handset */
    for (const { key, url } of await transport.readUrls(keys)) {
        const bytes = await transport.get(url);
        if (bytes === null) {
            continue;
        }
        /* oxlint-disable no-await-in-loop -- these updates share the one SQLite connection the loop keeps downloading against, so issuing them together interleaves the writes with the next photo's fetch */
        for (const { photoTable, id, name } of wanted.get(key) ?? []) {
            files.write(name, bytes);
            await repoint(photoTable, id, name);
            downloaded += 1;
        }
        /* oxlint-enable no-await-in-loop */
    }
    /* oxlint-enable no-await-in-loop */

    return downloaded;
}

export async function downloadEveryPhoto(db: SpendDb, files: PhotoFiles, transport: PhotoTransport): Promise<void> {
    for (;;) {
        // oxlint-disable-next-line no-await-in-loop -- a pass fetches one batch, and what the next pass still wants depends on what this one wrote
        if ((await downloadPhotos(db, files, transport)) === 0) {
            return;
        }
    }
}

export async function runPhotoSync(
    db: SpendDb,
    files: PhotoFiles,
    transport: PhotoTransport,
    now: Date = new Date()
): Promise<PhotoSyncResult> {
    const { uploaded, released } = await uploadPhotos(db, files, transport, now);
    const downloaded = await downloadPhotos(db, files, transport);
    return { downloaded, released, uploaded };
}
