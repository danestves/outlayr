import { describe, expect, it, jest, test } from "@jest/globals";

jest.mock("./shared-store", () => ({ sharedStore: { remove: jest.fn() } }));
jest.mock("@react-native-async-storage/async-storage", () => ({ clear: jest.fn() }));
jest.mock<Partial<typeof import("expo-alternate-app-icons")>>("expo-alternate-app-icons", () => ({
    setAlternateAppIcon: jest.fn<typeof import("expo-alternate-app-icons").setAlternateAppIcon>(),
    supportsAlternateIcons: true,
}));
jest.mock("expo-core-spotlight", () => ({
    __esModule: true,
    default: { isAvailable: jest.fn(), removeAllItems: jest.fn() },
}));
jest.mock<Partial<typeof import("expo-notifications")>>("expo-notifications", () => ({
    cancelAllScheduledNotificationsAsync:
        jest.fn<typeof import("expo-notifications").cancelAllScheduledNotificationsAsync>(),
    dismissAllNotificationsAsync: jest.fn<typeof import("expo-notifications").dismissAllNotificationsAsync>(),
    setBadgeCountAsync: jest.fn<typeof import("expo-notifications").setBadgeCountAsync>(),
}));
jest.mock<Partial<typeof import("expo-secure-store")>>("expo-secure-store", () => ({
    deleteItemAsync: jest.fn<typeof import("expo-secure-store").deleteItemAsync>(),
    getItem: jest.fn<typeof import("expo-secure-store").getItem>(),
    getItemAsync: jest.fn<typeof import("expo-secure-store").getItemAsync>(),
    setItemAsync: jest.fn<typeof import("expo-secure-store").setItemAsync>(),
}));
jest.mock("expo-sqlite", () => ({ deleteDatabaseAsync: jest.fn() }));
jest.mock<Partial<typeof import("./photo-storage")>>("./photo-storage", () => ({ clearStoredPhotos: jest.fn() }));
jest.mock<Partial<typeof import("./widget-bridge")>>("./widget-bridge", () => ({
    INTENT_SNAPSHOT_KEY: "intentSnapshot",
    PENDING_WRITES_KEY: "pendingWrites",
    PUSHED_PURCHASES_KEY: "pushedPurchases",
    WALLET_PUSH_KEY: "walletPush",
}));

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
import { DEVICE_STORES } from "./device-data-stores";
import type { DeviceDataStores, DeviceStore } from "./device-data-stores";

function storesWith(calls: string[], failing: readonly string[] = []): DeviceDataStores {
    const recorded = (store: DeviceStore) => async () => {
        calls.push(store);
        if (failing.includes(store)) {
            throw new Error(`${store} unavailable`);
        }
    };
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

describe("resetAllDeviceData", () => {
    it("partial-device-cleanup-discloses-failures-and-retries", async () => {
        const calls: string[] = [];
        const first = await resetAllDeviceData(storesWith(calls, ["credentials"]));

        expect(first.failures).toStrictEqual(["credentials"]);
        expect(calls).toStrictEqual(DEVICE_STORES);

        const second = await retryDeviceReset(
            {
                clearMarker: async () => {
                    calls.push("clear-marker");
                },
                stores: storesWith(calls),
            },
            first.failures
        );
        expect(second.failures).toStrictEqual([]);
        expect(calls).toStrictEqual([...DEVICE_STORES, "credentials", "clear-marker"]);
    });
});

test("reset-marker-resumes-after-crash and clears the marker last", async () => {
    const calls: string[] = [];
    let marker: { phase: "cloud" | "device"; v: 1 } | null = { phase: "cloud", v: 1 };

    await recoverDeviceReset({
        clearMarker: async () => {
            calls.push("clear-marker");
            marker = null;
        },
        completeCloudDeletion: async () => {
            calls.push("cloud");
        },
        readMarker: async () => marker,
        stores: storesWith(calls),
        writeMarker: async (next) => {
            calls.push(`marker-${next.phase}`);
            marker = next;
        },
    });

    expect(calls).toStrictEqual(["cloud", "marker-device", ...DEVICE_STORES, "clear-marker"]);
    expect(marker).toBeNull();
});

test("persists the marker before cloud cleanup and never clears it when a store fails", async () => {
    const calls: string[] = [];
    let marker: { phase: "cloud" | "device"; v: 1 } | null = null;

    const result = await beginDeviceReset({
        clearMarker: async () => {
            calls.push("clear-marker");
            marker = null;
        },
        completeCloudDeletion: async () => {
            calls.push("cloud");
        },
        readMarker: async () => marker,
        stores: storesWith(calls, ["credentials"]),
        writeMarker: async (next) => {
            calls.push(`marker-${next.phase}`);
            marker = next;
        },
    });

    expect(result.failures).toStrictEqual(["credentials"]);
    expect(calls).toStrictEqual(["marker-cloud", "cloud", "marker-device", ...DEVICE_STORES]);
    expect(marker).toStrictEqual({ phase: "device", v: 1 });
});

test("does not clean device stores when cloud completion fails", async () => {
    const calls: string[] = [];
    let marker: { phase: "cloud" | "device"; v: 1 } | null = { phase: "cloud", v: 1 };
    await expect(
        recoverDeviceReset({
            clearMarker: async () => {
                calls.push("clear-marker");
            },
            completeCloudDeletion: async () => {
                calls.push("cloud");
                throw new Error("cloud unavailable");
            },
            readMarker: async () => marker,
            stores: storesWith(calls),
            writeMarker: async (next) => {
                marker = next;
            },
        })
    ).rejects.toThrow("cloud unavailable");
    expect(calls).toStrictEqual(["cloud"]);
    expect(marker).toStrictEqual({ phase: "cloud", v: 1 });
});

test("persists and validates the SecureStore reset marker", async () => {
    const getMarker = jest.mocked(getItemAsync);
    const writeMarker = jest.mocked(setItemAsync);
    const eraseMarker = jest.mocked(deleteItemAsync);
    getMarker.mockResolvedValue(JSON.stringify({ phase: "device", v: 1 }));
    writeMarker.mockResolvedValue();
    eraseMarker.mockResolvedValue();

    await expect(readDeviceResetMarker()).resolves.toStrictEqual({ phase: "device", v: 1 });
    await writeDeviceResetMarker({ phase: "cloud", v: 1 });
    await clearDeviceResetMarker();

    expect(writeMarker).toHaveBeenCalledWith("outlayr.device-reset", JSON.stringify({ phase: "cloud", v: 1 }));
    expect(eraseMarker).toHaveBeenCalledWith("outlayr.device-reset");
});
