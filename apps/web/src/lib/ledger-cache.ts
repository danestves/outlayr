import { deleteByKey, executeTransaction, getByKey, openDatabase, put } from "@tanstack/react-db";
import type { DbClient, DehydratedDbState } from "@tanstack/react-db";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";

import type { MintedPhotos } from "@/components/dashboard/shell/photos";

import { forgetPush } from "./web-push";

const DATABASE = "outlayr-ledger";
const STORE = "snapshots";
const LATEST = "latest";
export const LEDGER_CACHE_VERSION = 3;

export interface LedgerSnapshot {
    collections: DehydratedDbState["collections"];
    photos: MintedPhotos | undefined;
    userId: string;
    version: number;
}

let forgotten = false;

const COPY_COOKIE = "ledger_copy";
const A_YEAR_MS = 31_536_000_000;

export const hasLedgerCopy = createIsomorphicFn()
    .server(() => getCookie(COPY_COOKIE) !== undefined)
    .client(() => document.cookie.includes(`${COPY_COOKIE}=`));

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
    await inStore("readwrite", (store) => put(store, snapshotOf(db, photos, userId), LATEST))
        .then(() =>
            window.cookieStore?.set({
                expires: Date.now() + A_YEAR_MS,
                name: COPY_COOKIE,
                path: "/",
                sameSite: "lax",
                value: "1",
            })
        )
        .catch(() => undefined);
}

export async function dropLedger() {
    await inStore("readwrite", dropLatest).catch(() => undefined);
    await window.cookieStore?.delete({ name: COPY_COOKIE, path: "/" }).catch(() => undefined);
}

export const UNSENT_PREFIX = "outlayr-unsent:";

// A pending delete settles on the pagehide that sign-out's navigation fires, after forgetLedger has run.
export function keepUnsent(key: string, value: string) {
    if (forgotten) {
        return;
    }
    try {
        localStorage.setItem(key, value);
    } catch {
        // Storage is off or full: the push is still the normal path.
    }
}

// Rows left for the next load hold this account's entries, which must not outlive the session on a shared browser.
const forgetUnsent = () => {
    try {
        for (const key of Object.keys(localStorage).filter((name) => name.startsWith(UNSENT_PREFIX))) {
            localStorage.removeItem(key);
        }
    } catch {
        // Storage is off, so nothing was kept.
    }
};

export async function forgetLedger() {
    forgotten = true;
    forgetUnsent();
    await forgetPush();
    await dropLedger();
}
