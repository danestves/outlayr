import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAlternateAppIcon, supportsAlternateIcons } from "expo-alternate-app-icons";
import Constants from "expo-constants";
import Spotlight from "expo-core-spotlight";
import { Directory, File, Paths } from "expo-file-system";
import {
    cancelAllScheduledNotificationsAsync,
    dismissAllNotificationsAsync,
    setBadgeCountAsync,
} from "expo-notifications";
import { deleteItemAsync, getItem } from "expo-secure-store";
import { deleteDatabaseAsync } from "expo-sqlite";
import { Platform } from "react-native";

import { cancelLogoBackfill } from "./logo-backfill";
import { QUEUE_DIRECTORY } from "./pending-writes-core";
import { clearStoredPhotos } from "./photo-storage";
import { PROVIDER_BINDING_KEY } from "./provider-revocation";
import { sharedStore } from "./shared-store";
import { INTENT_SNAPSHOT_KEY, PENDING_WRITES_KEY, PUSHED_PURCHASES_KEY, WALLET_PUSH_KEY } from "./widget-bridge";

const DATABASE_NAME = "outlayr.db";
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
/**
 * One clear per store, named. `DEVICE_STORES` above is the erase order and this the
 * contract; a store added to one without the other stops compiling.
 */
export interface DeviceDataStores {
    alternateIcon: () => Promise<void>;
    asyncStorage: () => Promise<void>;
    cache: () => Promise<void>;
    credentials: () => Promise<void>;
    notifications: () => Promise<void>;
    photos: () => Promise<void>;
    spotlight: () => Promise<void>;
    sqlite: () => Promise<void>;
    widget: () => Promise<void>;
}

export interface NativeDeviceDataStoreDependencies {
    closeDatabase: () => Promise<void>;
}

function deleteDirectoryIfPresent(directory: Directory): void {
    if (directory.exists) {
        directory.delete();
    }
}

async function clearBetterAuthCredentials(): Promise<void> {
    const keys = BETTER_AUTH_KEYS.flatMap((key) => {
        const stored = getItem(key);
        if (!stored?.startsWith(BETTER_AUTH_CHUNK_MARKER)) {
            return [key];
        }
        const count = Number(stored.slice(BETTER_AUTH_CHUNK_MARKER.length));
        if (!Number.isSafeInteger(count) || count < 0) {
            throw new Error("Malformed Better Auth credential chunk marker");
        }
        return [key, ...Array.from({ length: count }, (_, index) => `${key}.${index}`)];
    });
    await Promise.all(keys.map(async (key) => await deleteItemAsync(key)));
}

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

async function clearSpotlight(): Promise<void> {
    if (Platform.OS !== "ios") {
        return;
    }
    if (await Spotlight.isAvailable()) {
        await Spotlight.removeAllItems();
    }
}

async function clearSqlite(closeDatabase: () => Promise<void>): Promise<void> {
    await closeDatabase();
    await deleteDatabaseAsync(DATABASE_NAME);
    const sqliteDirectory = new Directory(Paths.document, "SQLite");
    for (const filename of [`${DATABASE_NAME}-wal`, `${DATABASE_NAME}-shm`]) {
        const file = new File(sqliteDirectory, filename);
        if (file.exists) {
            file.delete();
        }
    }
}

function clearCache(): void {
    deleteDirectoryIfPresent(Paths.cache);
    Paths.cache.create({ idempotent: true, intermediates: true });
}

export function createNativeDeviceDataStores({ closeDatabase }: NativeDeviceDataStoreDependencies): DeviceDataStores {
    return {
        alternateIcon: async () => {
            if (supportsAlternateIcons) {
                await setAlternateAppIcon(null);
            }
        },
        asyncStorage: async () => await AsyncStorage.clear(),
        cache: () => Promise.resolve(clearCache()),
        credentials: clearBetterAuthCredentials,
        notifications: async () => {
            await cancelAllScheduledNotificationsAsync();
            await dismissAllNotificationsAsync();
            if (!(await setBadgeCountAsync(0))) {
                throw new Error("Unable to clear the application badge");
            }
        },
        photos: async () => clearStoredPhotos(),
        spotlight: clearSpotlight,
        // The logo pass is stopped first: still awaiting the model or an image,
        // it would otherwise write into a photo directory this erase empties.
        sqlite: async () => {
            await cancelLogoBackfill();
            await clearSqlite(closeDatabase);
        },
        widget: async () => clearWidgetStorage(),
    };
}
