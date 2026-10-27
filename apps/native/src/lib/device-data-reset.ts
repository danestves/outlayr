import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { createNativeDeviceDataStores, DEVICE_STORES } from "./device-data-stores";
import type { DeviceDataStores, DeviceStore, NativeDeviceDataStoreDependencies } from "./device-data-stores";
import { SecureStorage } from "./secure-storage";

const RESET_MARKER_KEY = "outlayr.device-reset";

const DeviceResetMarker = Schema.Struct({
    phase: Schema.Literals(["cloud", "device"]),
    v: Schema.Literal(1),
});

export type DeviceResetMarker = typeof DeviceResetMarker.Type;

export class DeviceResetMarkerError extends Schema.TaggedError<DeviceResetMarkerError>()("DeviceResetMarkerError", {}) {
    // oxlint-disable-next-line class-methods-use-this -- the fixed sentence is the copy the recovery screen shows
    override get message(): string {
        return "Malformed device reset marker";
    }
}

const decodeResetMarker = Schema.decodeUnknownOption(Schema.fromJsonString(DeviceResetMarker));

export const readDeviceResetMarker = Effect.fn("DeviceReset.readMarker")(function* readMarker() {
    const storage = yield* SecureStorage;
    const raw = yield* storage.get(RESET_MARKER_KEY);
    if (raw === null) {
        return null;
    }
    const parsed = decodeResetMarker(raw);
    if (Option.isNone(parsed)) {
        return yield* new DeviceResetMarkerError();
    }
    return parsed.value;
});

export const writeDeviceResetMarker = Effect.fn("DeviceReset.writeMarker")(function* writeMarker(
    marker: DeviceResetMarker
) {
    const storage = yield* SecureStorage;
    yield* storage.set(RESET_MARKER_KEY, JSON.stringify(marker));
});

export const clearDeviceResetMarker = Effect.fn("DeviceReset.clearMarker")(function* clearMarker() {
    const storage = yield* SecureStorage;
    yield* storage.remove(RESET_MARKER_KEY);
});

export interface DeviceResetGateDependencies extends NativeDeviceDataStoreDependencies {
    completeCloudDeletion: Effect.Effect<void, unknown, SecureStorage>;
}

export interface DeviceResetGate {
    begin: () => Effect.Effect<DeviceResetResult, unknown, SecureStorage>;
    recover: () => Effect.Effect<DeviceResetResult, unknown, SecureStorage>;
    retry: (failures: readonly DeviceStore[]) => Effect.Effect<DeviceResetResult, unknown, SecureStorage>;
}

export interface DeviceResetRecoveryDependencies<E = never, R = never> {
    clearMarker: () => Effect.Effect<void, E, R>;
    completeCloudDeletion: Effect.Effect<void, E, R>;
    readMarker: () => Effect.Effect<DeviceResetMarker | null, E, R>;
    stores: DeviceDataStores<R>;
    writeMarker: (marker: DeviceResetMarker) => Effect.Effect<void, E, R>;
}

export interface DeviceResetResult {
    failures: DeviceStore[];
}

export const resetAllDeviceData = Effect.fn("DeviceReset.resetAll")(function* resetAll<R>(
    stores: DeviceDataStores<R>,
    only: readonly DeviceStore[] = DEVICE_STORES
) {
    const failures: DeviceStore[] = [];
    for (const store of only) {
        yield* stores[store]().pipe(
            Effect.catchTags({
                DeviceStoreError: () =>
                    Effect.sync(() => {
                        failures.push(store);
                    }),
            })
        );
    }
    return { failures } satisfies DeviceResetResult;
});

export const recoverDeviceReset = Effect.fn("DeviceReset.recover")(function* recover<E, R>(
    deps: DeviceResetRecoveryDependencies<E, R>
) {
    const marker = yield* deps.readMarker();
    if (marker === null) {
        return { failures: [] } satisfies DeviceResetResult;
    }
    if (marker.phase === "cloud") {
        yield* deps.completeCloudDeletion;
        yield* deps.writeMarker({ phase: "device", v: 1 });
    }
    const result = yield* resetAllDeviceData(deps.stores);
    if (result.failures.length === 0) {
        yield* deps.clearMarker();
    }
    return result;
});

export const beginDeviceReset = Effect.fn("DeviceReset.begin")(function* begin<E, R>(
    deps: DeviceResetRecoveryDependencies<E, R>
) {
    yield* deps.writeMarker({ phase: "cloud", v: 1 });
    return yield* recoverDeviceReset(deps);
});

export const retryDeviceReset = Effect.fn("DeviceReset.retry")(function* retry<E, R>(
    deps: Pick<DeviceResetRecoveryDependencies<E, R>, "clearMarker" | "stores">,
    failures: readonly DeviceStore[]
) {
    const result = yield* resetAllDeviceData(deps.stores, failures);
    if (result.failures.length === 0) {
        yield* deps.clearMarker();
    }
    return result;
});

export function createDeviceResetGate({
    closeDatabase,
    completeCloudDeletion,
}: DeviceResetGateDependencies): DeviceResetGate {
    const deps: DeviceResetRecoveryDependencies<unknown, SecureStorage> = {
        clearMarker: clearDeviceResetMarker,
        completeCloudDeletion,
        readMarker: readDeviceResetMarker,
        stores: createNativeDeviceDataStores({ closeDatabase }),
        writeMarker: writeDeviceResetMarker,
    };
    return {
        begin: () => beginDeviceReset(deps),
        recover: () => recoverDeviceReset(deps),
        retry: (failures) => retryDeviceReset(deps, failures),
    };
}
