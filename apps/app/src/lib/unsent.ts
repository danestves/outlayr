import { profileKeyOf } from "./profile";
import { forgetPush } from "./web-push";

export const UNSENT_PREFIX = "outlayr-unsent:";

export const unsentPrefix = (profileId: string | null) => `${UNSENT_PREFIX}${profileKeyOf(profileId)}:`;

const LEGACY_KEY = /^outlayr-unsent:[^:]+$/u;

const OLD_COPY_DATABASE = "outlayr-ledger";
const OLD_COPY_COOKIE = "ledger_copy";

let forgotten = false;

// Sign-out's navigation fires a pagehide, which pushes a held commit after forgetLedger has run.
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

const storedKeys = (profileId: string | null) => {
    try {
        const prefix = unsentPrefix(profileId);
        return Object.keys(localStorage).filter(
            (name) => name.startsWith(prefix) || (profileId === null && LEGACY_KEY.test(name))
        );
    } catch {
        return [];
    }
};

export const unsentKeys = storedKeys;

export function forgetProfileUnsent(profileId: string | null) {
    try {
        for (const key of storedKeys(profileId)) {
            localStorage.removeItem(key);
        }
    } catch {
        // Storage is off, so nothing was kept.
    }
}

// Browsers that ran the IndexedDB build still hold a full copy of the ledger, unencrypted.
export function dropOldCopy() {
    try {
        indexedDB.deleteDatabase(OLD_COPY_DATABASE);
    } catch {
        // No IndexedDB, so no copy.
    }
    void window.cookieStore?.delete({ name: OLD_COPY_COOKIE, path: "/" }).catch(() => undefined);
}

export async function forgetLedger() {
    forgotten = true;
    forgetUnsent();
    dropOldCopy();
    await forgetPush();
}
