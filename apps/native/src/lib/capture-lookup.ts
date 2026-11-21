import { CAPTURE_PUSH_EFFECTIVE_AT_MS } from "@outlayr/backend/confect/legal";
import { api } from "@outlayr/backend/convex/_generated/api";
import * as Clock from "effect/Clock";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { getIosPushNotificationServiceEnvironmentAsync } from "expo-application";
import { getRandomBytesAsync } from "expo-crypto";
import { Platform } from "react-native";

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

// The Swift intent reads this blob, so its fields are its contract, not this module's.
const encodeSnapshot = Schema.encodeSync(Schema.fromJsonString(Schema.Unknown));

// Its own label rather than the sync device id, which the privacy policy ties to ordering synced edits.
const CAPTURE_DEVICE_KEY = "captureDevice";

const CAPTURE_PUSH_SECRET_KEY = "capturePushSecret";

const CAPTURE_PUSH_KEY = "capturePush";

const KEY_BYTES = 32;

// APNs registration never settles on a phone that can't reach Apple.
const TOKEN_WAIT = Duration.seconds(10);

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

const forgetPush = (store: Store) => {
    store.remove(CAPTURE_PUSH_KEY);
    store.remove(CAPTURE_PUSH_SECRET_KEY);
};

const clearLocal = (store: Store) => {
    store.remove(CAPTURE_SNAPSHOT_KEY);
    forgetPush(store);
    store.setCaptureKey(null);
};

const randomHex = Effect.fn("CaptureLookup.randomHex")(function* randomHex() {
    return hex(yield* Effect.tryPromise(() => getRandomBytesAsync(KEY_BYTES)));
});

const mintKey = Effect.fn("CaptureLookup.mintKey")(function* mintKey(store: Store) {
    const key = yield* randomHex();
    yield* cloudMutation(api.captureLookup.register, { deviceId: labelIn(store), key });
    forgetPush(store);
    return store.setCaptureKey(key);
});

let pushRefused = false;

const registerPush = Effect.fn("CaptureLookup.registerPush")(function* registerPush(store: Store) {
    if (Platform.OS !== "ios" || pushRefused || (yield* Clock.currentTimeMillis) < CAPTURE_PUSH_EFFECTIVE_AT_MS) {
        return;
    }
    // On demand: importing expo-notifications starts its token side effects in every suite that reaches this file.
    const notifications = yield* Effect.tryPromise(() => import("expo-notifications"));
    if (!(yield* Effect.tryPromise(() => notifications.getPermissionsAsync())).granted) {
        return;
    }
    const { data: token } = yield* Effect.tryPromise(() => notifications.getDevicePushTokenAsync()).pipe(
        Effect.timeout(TOKEN_WAIT)
    );
    const environment =
        (yield* Effect.tryPromise(() => getIosPushNotificationServiceEnvironmentAsync())) ??
        (__DEV__ ? "development" : "production");
    const address = `${environment}:${token}`;
    if (store.get(CAPTURE_PUSH_KEY) === address) {
        return;
    }
    const secret = store.get(CAPTURE_PUSH_SECRET_KEY) ?? (yield* randomHex());
    store.set(CAPTURE_PUSH_SECRET_KEY, secret);
    if (yield* cloudMutation(api.captureLookup.setPush, { deviceId: labelIn(store), environment, secret, token })) {
        store.set(CAPTURE_PUSH_KEY, address);
    } else {
        pushRefused = true;
    }
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
            if (isCloudAuthenticated() && sharedStore.captureKeyStatus() === "present") {
                // The secret goes first so a push on its way can't be opened; the key stays until the revoke lands.
                sharedStore.remove(CAPTURE_SNAPSHOT_KEY);
                forgetPush(sharedStore);
                yield* cloudMutation(api.captureLookup.revoke, { deviceId: labelIn(sharedStore) });
            }
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
        sharedStore.set(CAPTURE_SNAPSHOT_KEY, encodeSnapshot(snapshot));
        yield* registerPush(sharedStore).pipe(
            Effect.catchCause((cause) => Effect.logWarning("[outlayr] capture push not registered", cause))
        );
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
