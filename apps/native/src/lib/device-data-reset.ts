import { deleteItemAsync, getItemAsync, setItemAsync } from "expo-secure-store";
import { z } from "zod";

import { createNativeDeviceDataStores, DEVICE_STORES } from "./device-data-stores";
import type { DeviceDataStores, DeviceStore, NativeDeviceDataStoreDependencies } from "./device-data-stores";

const RESET_MARKER_KEY = "outlayr.device-reset";

export interface DeviceResetMarker {
    phase: "cloud" | "device";
    v: 1;
}

const resetMarker = z.object({
    phase: z.enum(["cloud", "device"]),
    v: z.literal(1),
});

function parseResetMarker(raw: string | null): DeviceResetMarker | null {
    if (raw === null) {
        return null;
    }
    try {
        const parsed = resetMarker.safeParse(JSON.parse(raw));
        if (parsed.success) {
            return parsed.data;
        }
    } catch {
        // A malformed marker cannot safely be treated as no reset.
    }
    throw new Error("Malformed device reset marker");
}

export async function readDeviceResetMarker(): Promise<DeviceResetMarker | null> {
    return parseResetMarker(await getItemAsync(RESET_MARKER_KEY));
}

export async function writeDeviceResetMarker(marker: DeviceResetMarker): Promise<void> {
    await setItemAsync(RESET_MARKER_KEY, JSON.stringify(marker));
}

export async function clearDeviceResetMarker(): Promise<void> {
    await deleteItemAsync(RESET_MARKER_KEY);
}

export interface DeviceResetGateDependencies extends NativeDeviceDataStoreDependencies {
    completeCloudDeletion: () => Promise<void>;
}

export interface DeviceResetGate {
    begin: () => Promise<DeviceResetResult>;
    recover: () => Promise<DeviceResetResult>;
    retry: (failures: readonly DeviceStore[]) => Promise<DeviceResetResult>;
}

export interface DeviceResetRecoveryDependencies {
    clearMarker: () => Promise<void>;
    completeCloudDeletion: () => Promise<void>;
    readMarker: () => Promise<DeviceResetMarker | null>;
    stores: DeviceDataStores;
    writeMarker: (marker: DeviceResetMarker) => Promise<void>;
}

export interface DeviceResetResult {
    failures: DeviceStore[];
}

export async function resetAllDeviceData(
    stores: DeviceDataStores,
    only: readonly DeviceStore[] = DEVICE_STORES
): Promise<DeviceResetResult> {
    const failures: DeviceStore[] = [];
    for (const store of only) {
        try {
            // oxlint-disable-next-line no-await-in-loop -- reset order is part of the crash-recovery contract.
            await stores[store]();
        } catch {
            failures.push(store);
        }
    }
    return { failures };
}

export async function beginDeviceReset(deps: DeviceResetRecoveryDependencies): Promise<DeviceResetResult> {
    await deps.writeMarker({ phase: "cloud", v: 1 });
    return await recoverDeviceReset(deps);
}

export async function retryDeviceReset(
    deps: Pick<DeviceResetRecoveryDependencies, "clearMarker" | "stores">,
    failures: readonly DeviceStore[]
): Promise<DeviceResetResult> {
    const result = await resetAllDeviceData(deps.stores, failures);
    if (result.failures.length === 0) {
        await deps.clearMarker();
    }
    return result;
}

export async function recoverDeviceReset(deps: DeviceResetRecoveryDependencies): Promise<DeviceResetResult> {
    const marker = await deps.readMarker();
    if (marker === null) {
        return { failures: [] };
    }
    if (marker.phase === "cloud") {
        await deps.completeCloudDeletion();
        await deps.writeMarker({ phase: "device", v: 1 });
    }
    const result = await resetAllDeviceData(deps.stores);
    if (result.failures.length === 0) {
        await deps.clearMarker();
    }
    return result;
}

export function createDeviceResetGate({
    closeDatabase,
    completeCloudDeletion,
}: DeviceResetGateDependencies): DeviceResetGate {
    const deps: DeviceResetRecoveryDependencies = {
        clearMarker: clearDeviceResetMarker,
        completeCloudDeletion,
        readMarker: readDeviceResetMarker,
        stores: createNativeDeviceDataStores({ closeDatabase }),
        writeMarker: writeDeviceResetMarker,
    };
    return {
        begin: async () => await beginDeviceReset(deps),
        recover: async () => await recoverDeviceReset(deps),
        retry: async (failures) => await retryDeviceReset(deps, failures),
    };
}
