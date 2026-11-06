import { deleteByKey, executeTransaction, getByKey, openDatabase, put } from "@tanstack/react-db";
import type { DbClient, DehydratedDbState } from "@tanstack/react-db";

import type { MintedPhotos } from "@/components/dashboard/shell/photos";

const DATABASE = "outlayr-ledger";
const STORE = "snapshots";
const LATEST = "latest";
// Bump when a ledger row loses or retypes a field the web reads, so an older copy never reaches the new code.
export const LEDGER_CACHE_VERSION = 1;

export interface LedgerSnapshot {
    collections: DehydratedDbState["collections"];
    photos: MintedPhotos | undefined;
    userId: string;
    version: number;
}

let forgotten = false;

const dropLatest = (store: IDBObjectStore) => deleteByKey(store, LATEST);

const inStore = async <Result>(
    mode: IDBTransactionMode,
    work: (store: IDBObjectStore) => Promise<Result>
): Promise<Result> => {
    const database = await openDatabase(DATABASE, 1, (upgrading) => {
        upgrading.createObjectStore(STORE);
    });
    try {
        return await executeTransaction(database, STORE, mode, (_transaction, stores) => {
            const store = stores[STORE];
            if (!store) {
                throw new Error(`IndexedDB store ${STORE} is missing`);
            }
            return work(store);
        });
    } finally {
        database.close();
    }
};

export const usableSnapshot = (snapshot: LedgerSnapshot | undefined, userId: string) =>
    snapshot?.userId === userId && snapshot.version === LEDGER_CACHE_VERSION ? snapshot : undefined;

export function snapshotOf(db: DbClient, photos: MintedPhotos | undefined, userId: string): LedgerSnapshot {
    const { collections } = db.dehydrate({
        shouldDehydrateCollection: () => true,
        shouldDehydrateLiveQuery: () => false,
    });
    return { collections, photos, userId, version: LEDGER_CACHE_VERSION };
}

// Storage can be absent or refuse (a private window, a full disk). The ledger then loads from Convex as it would
// on a first visit, so a failure here costs speed and nothing else.
export async function restoreLedger(db: DbClient, userId: string) {
    try {
        const stored = await inStore("readonly", (store) => getByKey<LedgerSnapshot>(store, LATEST));
        const snapshot = usableSnapshot(stored, userId);
        if (!snapshot) {
            if (stored) {
                await inStore("readwrite", dropLatest);
            }
            return undefined;
        }
        db.hydrate({ collections: snapshot.collections });
        return snapshot;
    } catch {
        return undefined;
    }
}

export async function saveLedger(db: DbClient, photos: MintedPhotos | undefined, userId: string) {
    if (forgotten) {
        return;
    }
    try {
        await inStore("readwrite", (store) => put(store, snapshotOf(db, photos, userId), LATEST));
    } catch {
        // Unsaved only means the next load starts from Convex.
    }
}

// A subscription Convex refuses ends here: the copy must not outlive the right to read it.
export async function dropLedger() {
    try {
        await inStore("readwrite", dropLatest);
    } catch {
        // No store means no copy to drop.
    }
}

// Sign-out also stops the save still waiting on its timer, which would bring the copy back.
export async function forgetLedger() {
    forgotten = true;
    await dropLedger();
}
