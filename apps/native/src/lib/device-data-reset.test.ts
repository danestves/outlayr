import { describe, expect, it, vi, test } from "vite-plus/test";

vi.mock("./shared-store", () => ({ sharedStore: { remove: vi.fn() } }));
vi.mock("@react-native-async-storage/async-storage", () => ({ clear: vi.fn() }));
vi.mock<Partial<typeof import("expo-alternate-app-icons")>>(import("expo-alternate-app-icons"), () => ({
    setAlternateAppIcon: vi.fn<typeof import("expo-alternate-app-icons").setAlternateAppIcon>(),
    supportsAlternateIcons: true,
}));
vi.mock("expo-core-spotlight", () => ({
    __esModule: true,
    default: { isAvailable: vi.fn(), removeAllItems: vi.fn() },
}));
vi.mock<Partial<typeof import("expo-notifications")>>(import("expo-notifications"), () => ({
    cancelAllScheduledNotificationsAsync:
        vi.fn<typeof import("expo-notifications").cancelAllScheduledNotificationsAsync>(),
    dismissAllNotificationsAsync: vi.fn<typeof import("expo-notifications").dismissAllNotificationsAsync>(),
    setBadgeCountAsync: vi.fn<typeof import("expo-notifications").setBadgeCountAsync>(),
}));
vi.mock<typeof import("expo-secure-store")>(import("expo-secure-store"), async (importOriginal) => ({
    ...(await importOriginal()),
    deleteItemAsync: vi.fn<typeof import("expo-secure-store").deleteItemAsync>(),
    getItem: vi.fn<typeof import("expo-secure-store").getItem>(),
    getItemAsync: vi.fn<typeof import("expo-secure-store").getItemAsync>(),
    setItemAsync: vi.fn<typeof import("expo-secure-store").setItemAsync>(),
}));
vi.mock("expo-sqlite", () => ({ deleteDatabaseAsync: vi.fn() }));
vi.mock<Partial<typeof import("./photo-storage")>>(import("./photo-storage"), () => ({ clearStoredPhotos: vi.fn() }));
vi.mock<Partial<typeof import("./widget-bridge")>>(import("./widget-bridge"), () => ({
    INTENT_SNAPSHOT_KEY: "intentSnapshot",
    PENDING_WRITES_KEY: "pendingWrites",
    PUSHED_PURCHASES_KEY: "pushedPurchases",
    WALLET_PUSH_KEY: "walletPush",
}));

import * as Effect from "effect/Effect";
import { deleteItemAsync, getItemAsync, setItemAsync } from "expo-secure-store";

import {
    beginDeviceReset,
    clearDeviceResetMarker,
    readDeviceResetMarker,
    recoverDeviceReset,
    resetAllDeviceData,
    retryDeviceReset,
    writeDeviceResetMarker,
} from "./device-data-reset";
import { createNativeDeviceDataStores, DEVICE_STORES, DeviceStoreError } from "./device-data-stores";
import type { DeviceDataStores, DeviceStore } from "./device-data-stores";
import { layer } from "./secure-storage";

function storesWith(calls: string[], failing: readonly string[] = []): DeviceDataStores {
    const recorded = (store: DeviceStore) => () =>
        Effect.suspend(() => {
            calls.push(store);
            return failing.includes(store)
                ? Effect.fail(new DeviceStoreError({ cause: new Error(`${store} unavailable`), store }))
                : Effect.void;
        });
    // Written out rather than built from `DEVICE_STORES`, so a store added to the
    // contract fails here instead of silently going untested.
    return {
        alternateIcon: recorded("alternateIcon"),
        asyncStorage: recorded("asyncStorage"),
        cache: recorded("cache"),
        credentials: recorded("credentials"),
        notifications: recorded("notifications"),
        photos: recorded("photos"),
        spotlight: recorded("spotlight"),
        sqlite: recorded("sqlite"),
        widget: recorded("widget"),
    };
}

type Marker = { phase: "cloud" | "device"; v: 1 } | null;

function markerWith(calls: string[], initial: Marker) {
    const state = { marker: initial };
    return {
        clearMarker: () =>
            Effect.sync(() => {
                calls.push("clear-marker");
                state.marker = null;
            }),
        readMarker: () => Effect.sync(() => state.marker),
        state,
        writeMarker: (next: NonNullable<Marker>) =>
            Effect.sync(() => {
                calls.push(`marker-${next.phase}`);
                state.marker = next;
            }),
    };
}

describe("resetAllDeviceData", () => {
    it("partial-device-cleanup-discloses-failures-and-retries", async () => {
        const calls: string[] = [];
        const first = await Effect.runPromise(resetAllDeviceData(storesWith(calls, ["credentials"])));

        expect(first.failures).toStrictEqual(["credentials"]);
        expect(calls).toStrictEqual(DEVICE_STORES);

        const second = await Effect.runPromise(
            retryDeviceReset(
                {
                    clearMarker: () =>
                        Effect.sync(() => {
                            calls.push("clear-marker");
                        }),
                    stores: storesWith(calls),
                },
                first.failures
            )
        );
        expect(second.failures).toStrictEqual([]);
        expect(calls).toStrictEqual([...DEVICE_STORES, "credentials", "clear-marker"]);
    });
});

test("reset-marker-resumes-after-crash and clears the marker last", async () => {
    const calls: string[] = [];
    const store = markerWith(calls, { phase: "cloud", v: 1 });

    await Effect.runPromise(
        recoverDeviceReset({
            ...store,
            completeCloudDeletion: Effect.sync(() => {
                calls.push("cloud");
            }),
            stores: storesWith(calls),
        })
    );

    expect(calls).toStrictEqual(["cloud", "marker-device", ...DEVICE_STORES, "clear-marker"]);
    expect(store.state.marker).toBeNull();
});

test("persists the marker before cloud cleanup and never clears it when a store fails", async () => {
    const calls: string[] = [];
    const store = markerWith(calls, null);

    const result = await Effect.runPromise(
        beginDeviceReset({
            ...store,
            completeCloudDeletion: Effect.sync(() => {
                calls.push("cloud");
            }),
            stores: storesWith(calls, ["credentials"]),
        })
    );

    expect(result.failures).toStrictEqual(["credentials"]);
    expect(calls).toStrictEqual(["marker-cloud", "cloud", "marker-device", ...DEVICE_STORES]);
    expect(store.state.marker).toStrictEqual({ phase: "device", v: 1 });
});

test("does not clean device stores when cloud completion fails", async () => {
    const calls: string[] = [];
    const store = markerWith(calls, { phase: "cloud", v: 1 });
    const failure = await Effect.runPromise(
        recoverDeviceReset({
            ...store,
            completeCloudDeletion: Effect.suspend(() => {
                calls.push("cloud");
                return Effect.fail(new Error("cloud unavailable"));
            }),
            stores: storesWith(calls),
        }).pipe(Effect.flip)
    );
    expect(failure.message).toBe("cloud unavailable");
    expect(calls).toStrictEqual(["cloud"]);
    expect(store.state.marker).toStrictEqual({ phase: "cloud", v: 1 });
});

test("persists and validates the SecureStore reset marker", async () => {
    const getMarker = vi.mocked(getItemAsync);
    const writeMarker = vi.mocked(setItemAsync);
    const eraseMarker = vi.mocked(deleteItemAsync);
    getMarker.mockResolvedValue(JSON.stringify({ phase: "device", v: 1 }));
    writeMarker.mockResolvedValue();
    eraseMarker.mockResolvedValue();

    await expect(Effect.runPromise(readDeviceResetMarker().pipe(Effect.provide(layer)))).resolves.toStrictEqual({
        phase: "device",
        v: 1,
    });
    await Effect.runPromise(writeDeviceResetMarker({ phase: "cloud", v: 1 }).pipe(Effect.provide(layer)));
    await Effect.runPromise(clearDeviceResetMarker().pipe(Effect.provide(layer)));

    expect(writeMarker).toHaveBeenCalledWith("outlayr.device-reset", JSON.stringify({ phase: "cloud", v: 1 }));
    expect(eraseMarker).toHaveBeenCalledWith("outlayr.device-reset");
});

test("still deletes every credential key when one delete fails, and reports the store as failed", async () => {
    vi.mocked(getItemAsync).mockResolvedValue(null);
    const eraseKey = vi.mocked(deleteItemAsync);
    eraseKey.mockReset();
    eraseKey.mockRejectedValueOnce(new Error("keychain locked")).mockResolvedValue();

    const failure = await Effect.runPromise(
        createNativeDeviceDataStores({ closeDatabase: Effect.void })
            .credentials()
            .pipe(Effect.provide(layer), Effect.flip)
    );

    expect(failure).toMatchObject({ _tag: "DeviceStoreError", store: "credentials" });
    expect(eraseKey).toHaveBeenCalledTimes(5);
});
