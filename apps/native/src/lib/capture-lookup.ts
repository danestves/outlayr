import { api } from "@outlayr/backend/convex/_generated/api";
import * as Effect from "effect/Effect";
import { getRandomBytesAsync } from "expo-crypto";

import { Meta } from "@/data/app-meta-core";
import { categoryTree } from "@/data/enrichment-queue-core";
import { readRemoteEnrichment } from "@/data/settings-core";
import type { Database } from "@/db/client";
import { newId } from "@/domain/ids";
import { firstLocale } from "@/i18n/device-language";

import { CONVEX_SITE_URL } from "./cloud-configuration";
import { aiConsentArgs, cloudMutation, isCloudAuthenticated } from "./convex";
import { sharedStore } from "./shared-store";

/** Mirrors `snapshotKey` in `app-intents/CaptureLookup.swift`; its presence is what lets the intent ask. */
const CAPTURE_SNAPSHOT_KEY = "captureLookup";

// Its own label rather than the sync device id, which the privacy policy ties to ordering synced edits.
const CAPTURE_DEVICE_KEY = "captureDevice";

const KEY_BYTES = 32;

const hex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

/** Also scopes the results watch, so only this phone collects the answers its captures asked for. */
export const captureDeviceLabel = () => (sharedStore ? labelIn(sharedStore) : undefined);

type Store = NonNullable<typeof sharedStore>;

function labelIn(store: Store): string {
    const stored = store.get(CAPTURE_DEVICE_KEY);
    if (stored) {
        return stored;
    }
    const minted = newId();
    store.set(CAPTURE_DEVICE_KEY, minted);
    return minted;
}

const clearLocal = (store: Store) => {
    store.remove(CAPTURE_SNAPSHOT_KEY);
    store.setCaptureKey(null);
};

const mintKey = Effect.fn("CaptureLookup.mintKey")(function* mintKey(store: Store) {
    const key = hex(yield* Effect.tryPromise(() => getRandomBytesAsync(KEY_BYTES)));
    yield* cloudMutation(api.captureLookup.register, { deviceId: labelIn(store), key });
    return store.setCaptureKey(key);
});

/**
 * Gives the Wallet intent what it needs to ask the server on a locked phone: a per-device key in the keychain and a
 * snapshot of the consent, locale and category tree the in-app queue would send. Signed out or smart fill off, it
 * leaves nothing, so the intent never calls.
 */
export const syncCaptureLookup = Effect.fn("CaptureLookup.sync")(
    function* syncCaptureLookup(db: Database) {
        if (!sharedStore?.captureKeyStatus) {
            return;
        }
        if (!isCloudAuthenticated() || !CONVEX_SITE_URL || !(yield* readRemoteEnrichment(db))) {
            clearLocal(sharedStore);
            return;
        }
        const status = sharedStore.captureKeyStatus();
        if (status === "unavailable" || (status === "absent" && !(yield* mintKey(sharedStore)))) {
            return;
        }
        const device = firstLocale();
        const snapshot = {
            ...aiConsentArgs(),
            expense: yield* categoryTree(db, false),
            groundedLookup: yield* Meta.get(db, "groundedLookup"),
            income: yield* categoryTree(db, true),
            locale: device?.languageTag?.trim() || undefined,
            regionCode: device?.regionCode?.trim() || undefined,
            url: `${CONVEX_SITE_URL}/capture/enrich`,
        };
        sharedStore.set(CAPTURE_SNAPSHOT_KEY, JSON.stringify(snapshot));
    },
    Effect.catchCause((cause) => Effect.logWarning("[outlayr] capture lookup not synced", cause))
);

/** Before sign-out, while the session can still revoke the key server side. */
export const forgetCaptureLookup = Effect.fn("CaptureLookup.forget")(
    function* forgetCaptureLookup() {
        if (!sharedStore?.captureKeyStatus) {
            return;
        }
        clearLocal(sharedStore);
        yield* cloudMutation(api.captureLookup.revoke, { deviceId: labelIn(sharedStore) });
    },
    Effect.catchCause((cause) => Effect.logWarning("[outlayr] capture key not revoked", cause))
);
