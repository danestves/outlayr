import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import { setAlternateAppIcon, supportsAlternateIcons } from "expo-alternate-app-icons";
import Constants from "expo-constants";
import Spotlight from "expo-core-spotlight";
import { Directory, File, Paths } from "expo-file-system";
import {
    cancelAllScheduledNotificationsAsync,
    dismissAllNotificationsAsync,
    setBadgeCountAsync,
} from "expo-notifications";
import { deleteDatabaseAsync } from "expo-sqlite";
import { Platform } from "react-native";

import { closeProfileRegistry } from "@/data/profile-registry";
import { PERSONAL_DATABASE } from "@/domain/profiles";

import { resetActiveProfile } from "./active-profile";
import { cancelLogoBackfill } from "./logo-backfill";
import { QUEUE_DIRECTORY } from "./pending-writes-core";
import { clearStoredPhotos } from "./photo-storage";
import { PROVIDER_BINDING_KEY } from "./provider-revocation";
import { SecureStorage } from "./secure-storage";
import { sharedStore } from "./shared-store";
import { INTENT_SNAPSHOT_KEY, PENDING_WRITES_KEY, PUSHED_PURCHASES_KEY, WALLET_PUSH_KEY } from "./widget-bridge";

const PROFILE_DATABASE = /^outlayr-[0-9a-f-]{36}\.db$/;
const DELETION_SECRET_KEY = "outlayr.account-deletion-resume";
const LEGACY_WATCH_NOTES_KEY = "watchNotes";
const BETTER_AUTH_PREFIX = "outlayr";
const BETTER_AUTH_CHUNK_MARKER = "\u0001ba-chunks:";
const BETTER_AUTH_KEYS = [
    `${BETTER_AUTH_PREFIX}_cookie`,
    `${BETTER_AUTH_PREFIX}_session_data`,
    `${BETTER_AUTH_PREFIX}_last_login_method`,
    PROVIDER_BINDING_KEY,
    DELETION_SECRET_KEY,
] as const;
// SAFETY: `extra` is typed as an open record by expo-constants; `appGroup`
// is a string in app.config.ts, and absence is handled by the union.
const APP_GROUP = Constants.expoConfig?.extra?.appGroup as string | undefined;

export const DEVICE_STORES = [
    "notifications",
    "widget",
    "spotlight",
    "sqlite",
    "photos",
    "cache",
    "asyncStorage",
    "credentials",
    "alternateIcon",
] as const;

export type DeviceStore = (typeof DEVICE_STORES)[number];

export class DeviceStoreError extends Schema.TaggedError<DeviceStoreError>()("DeviceStoreError", {
    cause: Schema.Defect(),
    store: Schema.Literals(DEVICE_STORES),
}) {
    override get message(): string {
        return `Device store ${this.store} could not be cleared`;
    }
}

/**
 * One clear per store, named. `DEVICE_STORES` above is the erase order and this the
 * contract; a store added to one without the other stops compiling.
 */
export interface DeviceDataStores<R = never> {
    alternateIcon: () => Effect.Effect<void, DeviceStoreError, R>;
    asyncStorage: () => Effect.Effect<void, DeviceStoreError, R>;
    cache: () => Effect.Effect<void, DeviceStoreError, R>;
    credentials: () => Effect.Effect<void, DeviceStoreError, R>;
    notifications: () => Effect.Effect<void, DeviceStoreError, R>;
    photos: () => Effect.Effect<void, DeviceStoreError, R>;
    spotlight: () => Effect.Effect<void, DeviceStoreError, R>;
    sqlite: () => Effect.Effect<void, DeviceStoreError, R>;
    widget: () => Effect.Effect<void, DeviceStoreError, R>;
}

export interface NativeDeviceDataStoreDependencies {
    closeDatabase: Effect.Effect<void, unknown>;
}

const failedStore = (store: DeviceStore) => (cause: unknown) => new DeviceStoreError({ cause, store });

const clearSync = (store: DeviceStore, run: () => void) => Effect.try({ catch: failedStore(store), try: run });

const clearAsync = <A>(store: DeviceStore, run: () => Promise<A>) =>
    Effect.tryPromise({ catch: failedStore(store), try: run });

function deleteDirectoryIfPresent(directory: Directory): void {
    if (directory.exists) {
        directory.delete();
    }
}

const chunkKeys = (stored: readonly (readonly [string, string | null])[]) =>
    stored.flatMap(([key, value]) => {
        if (!value?.startsWith(BETTER_AUTH_CHUNK_MARKER)) {
            return [key];
        }
        const count = Number(value.slice(BETTER_AUTH_CHUNK_MARKER.length));
        if (!Number.isSafeInteger(count) || count < 0) {
            throw new Error("Malformed Better Auth credential chunk marker");
        }
        return [key, ...Array.from({ length: count }, (_, index) => `${key}.${index}`)];
    });

const clearBetterAuthCredentials = Effect.fn("DeviceStores.clearCredentials")(function* clearCredentials() {
    const storage = yield* SecureStorage;
    const stored = yield* Effect.all(
        BETTER_AUTH_KEYS.map((key) => storage.get(key).pipe(Effect.map((value) => [key, value] as const))),
        { concurrency: "unbounded" }
    );
    const keys = yield* Effect.try(() => chunkKeys(stored));
    const removals = yield* Effect.all(
        keys.map((key) => Effect.result(storage.remove(key))),
        { concurrency: "unbounded" }
    );
    const failed = removals.find(Result.isFailure);
    if (failed) {
        return yield* Effect.fail(failed.failure);
    }
});

function clearWidgetStorage(): void {
    if (Platform.OS !== "ios" || !APP_GROUP) {
        return;
    }
    sharedStore?.remove(INTENT_SNAPSHOT_KEY);
    sharedStore?.remove(PENDING_WRITES_KEY);
    sharedStore?.remove(PUSHED_PURCHASES_KEY);
    sharedStore?.remove(WALLET_PUSH_KEY);
    sharedStore?.remove(LEGACY_WATCH_NOTES_KEY);
    const container = Paths.appleSharedContainers[APP_GROUP];
    if (!container) {
        throw new Error("App Group container is unavailable");
    }
    deleteDirectoryIfPresent(new Directory(container, QUEUE_DIRECTORY));
}

const clearSpotlight = Effect.fn("DeviceStores.clearSpotlight")(function* clearSpotlight() {
    if (Platform.OS !== "ios") {
        return;
    }
    if (yield* clearAsync("spotlight", () => Spotlight.isAvailable())) {
        yield* clearAsync("spotlight", () => Spotlight.removeAllItems());
    }
});

const clearSqliteFiles = Effect.fn("DeviceStores.clearSqliteFiles")(function* clearSqliteFiles() {
    const sqliteDirectory = new Directory(Paths.document, "SQLite");
    const names = yield* Effect.try({
        catch: failedStore("sqlite"),
        try: () =>
            sqliteDirectory.exists
                ? sqliteDirectory
                      .list()
                      .map((entry) => entry.name)
                      .filter((name) => PROFILE_DATABASE.test(name))
                : [],
    });
    yield* clearSync("sqlite", resetActiveProfile);
    for (const name of new Set([PERSONAL_DATABASE, ...names])) {
        yield* clearAsync("sqlite", () => deleteDatabaseAsync(name));
        yield* clearSync("sqlite", () => {
            for (const filename of [`${name}-wal`, `${name}-shm`]) {
                const file = new File(sqliteDirectory, filename);
                if (file.exists) {
                    file.delete();
                }
            }
        });
    }
});

function clearCache(): void {
    deleteDirectoryIfPresent(Paths.cache);
    Paths.cache.create({ idempotent: true, intermediates: true });
}

const clearNotifications = Effect.fn("DeviceStores.clearNotifications")(function* clearNotifications() {
    yield* clearAsync("notifications", () => cancelAllScheduledNotificationsAsync());
    yield* clearAsync("notifications", () => dismissAllNotificationsAsync());
    if (!(yield* clearAsync("notifications", () => setBadgeCountAsync(0)))) {
        return yield* failedStore("notifications")(new Error("Unable to clear the application badge"));
    }
});

export function createNativeDeviceDataStores({
    closeDatabase,
}: NativeDeviceDataStoreDependencies): DeviceDataStores<SecureStorage> {
    return {
        alternateIcon: () =>
            supportsAlternateIcons ? clearAsync("alternateIcon", () => setAlternateAppIcon(null)) : Effect.void,
        asyncStorage: () => clearAsync("asyncStorage", () => AsyncStorage.clear()),
        cache: () => clearSync("cache", clearCache),
        credentials: () =>
            clearBetterAuthCredentials().pipe(
                Effect.mapError((cause) => new DeviceStoreError({ cause, store: "credentials" }))
            ),
        notifications: clearNotifications,
        photos: () => clearSync("photos", clearStoredPhotos),
        spotlight: clearSpotlight,
        // The logo pass is stopped first: still awaiting the model or an image,
        // it would otherwise write into a photo directory this erase empties.
        sqlite: () =>
            cancelLogoBackfill().pipe(
                Effect.andThen(closeDatabase.pipe(Effect.mapError(failedStore("sqlite")))),
                Effect.andThen(closeProfileRegistry().pipe(Effect.mapError(failedStore("sqlite")))),
                Effect.andThen(clearSqliteFiles())
            ),
        widget: () => clearSync("widget", clearWidgetStorage),
    };
}
