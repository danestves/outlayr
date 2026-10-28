import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Logger from "effect/Logger";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import type { AppStateStatus } from "react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import type { Database } from "@/db/client";
import { migratedDatabase } from "@/db/test-database";
import { WatchAppState } from "@/lib/app-events";
import { appRuntime } from "@/lib/runtime";

import { getMeta, META_KEYS, setMeta } from "./app-meta-core";
import * as SyncEngine from "./sync-engine";
import { syncEngineAtom } from "./sync-engine-mount";
import { setSyncCursor } from "./sync-outbox-core";
import * as SyncStore from "./sync-store";
import { invalidateAll } from "./table-invalidation";

function watchable<A>() {
    const listeners = new Set<(value: A) => void>();
    return {
        emit: (value: A) => {
            for (const listener of listeners) {
                listener(value);
            }
        },
        listeners,
        watch: (listener: (value: A) => void) => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
    };
}

const failure = (stage: "count" | "pass") =>
    new SyncStore.SyncError({ cause: new Error("database is closed"), message: `Sync ${stage} failed`, stage });

const flush = () => vi.advanceTimersByTimeAsync(0);

describe("sync engine", () => {
    let db: Database;
    let countFails: boolean;
    let registry: AtomRegistry.AtomRegistry;
    let unmount: () => void;
    const appState = watchable<AppStateStatus>();
    const watermark = watchable<number>();
    const counts = vi.fn();
    const passes = vi.fn<() => Effect.Effect<void, SyncStore.SyncError>>();

    const start = () => {
        const store = Layer.effect(
            SyncStore.SyncStore,
            SyncStore.make.pipe(
                Effect.map((real) =>
                    SyncStore.SyncStore.of({
                        ...real,
                        pending: (target) =>
                            Effect.suspend(() => {
                                counts();
                                return countFails ? Effect.fail(failure("count")) : real.pending(target);
                            }),
                        sync: () => Effect.suspend(passes),
                    })
                )
            )
        );
        const layer = Layer.mergeAll(
            SyncEngine.layer.pipe(
                Layer.provide(
                    Layer.mergeAll(
                        store,
                        Layer.succeed(WatchAppState, appState.watch),
                        Layer.succeed(SyncEngine.WatchWatermark, watermark.watch)
                    )
                )
            ),
            Logger.layer([])
        );
        registry = AtomRegistry.make({ initialValues: [[appRuntime.layer, layer]] });
        unmount = registry.mount(syncEngineAtom(db));
        return flush();
    };

    const holdNextPass = () => {
        const { promise, resolve } = Promise.withResolvers<undefined>();
        passes.mockReturnValueOnce(Effect.promise(() => promise));
        return () => resolve(undefined);
    };

    const queueWrite = async () => {
        await db.run("INSERT INTO outbox (tableName, localId, enqueuedAt) VALUES ('transactions', 'tx-1', 1)");
        invalidateAll(["transactions"]);
    };

    const setGate = async (enabled: boolean) => {
        await Effect.runPromise(setMeta(db, META_KEYS.syncEnabled, enabled ? "1" : "0"));
        invalidateAll(["appMeta"]);
        await flush();
    };

    beforeEach(() => {
        vi.useFakeTimers();
        db = migratedDatabase({ foreignKeys: false });
        countFails = false;
        counts.mockClear();
        passes.mockReset();
        passes.mockReturnValue(Effect.void);
        appState.listeners.clear();
        watermark.listeners.clear();
    });

    afterEach(() => {
        registry.dispose();
        vi.useRealTimers();
    });

    it("does not schedule another round trip after a cycle that had nothing to send", async () => {
        await start();
        expect(passes).toHaveBeenCalledOnce();

        invalidateAll(["appMeta"]);
        await vi.advanceTimersByTimeAsync(10_000);

        expect(passes).toHaveBeenCalledOnce();
    });

    it("syncs a local write once it has been waiting 2 s", async () => {
        await start();

        await queueWrite();
        await vi.advanceTimersByTimeAsync(1999);
        expect(passes).toHaveBeenCalledOnce();

        await vi.advanceTimersByTimeAsync(1);
        expect(passes).toHaveBeenCalledTimes(2);
    });

    it("still syncs when the pending count itself cannot be read", async () => {
        await start();
        countFails = true;

        invalidateAll(["transactions"]);
        await vi.advanceTimersByTimeAsync(10_000);

        expect(passes).toHaveBeenCalledTimes(2);
    });

    it("counts the outbox once for a burst of changes across tables", async () => {
        await start();

        invalidateAll(["transactions", "transactionTags", "accounts", "appMeta"]);
        invalidateAll(["transactions"]);
        await flush();

        expect(counts).toHaveBeenCalledOnce();
    });

    it("runs one more pass, not one per trigger, for everything that arrived during a pass", async () => {
        const acknowledge = holdNextPass();
        await start();

        appState.emit("active");
        await flush();
        await queueWrite();
        await vi.advanceTimersByTimeAsync(2000);
        appState.emit("active");
        await flush();
        expect(passes).toHaveBeenCalledOnce();

        acknowledge();
        await vi.advanceTimersByTimeAsync(10_000);

        expect(passes).toHaveBeenCalledTimes(2);
    });

    it("stamps syncedAt only after a clean pass", async () => {
        passes.mockReturnValueOnce(Effect.fail(failure("pass")));
        await start();
        await expect(Effect.runPromise(getMeta(db, META_KEYS.syncedAt))).resolves.toBeNull();

        appState.emit("active");
        await flush();

        expect(passes).toHaveBeenCalledTimes(2);
        await expect(Effect.runPromise(getMeta(db, META_KEYS.syncedAt))).resolves.not.toBeNull();
    });

    it("syncs on foreground and drops a write sync that was pending when the app went to the background", async () => {
        await start();

        await queueWrite();
        await flush();
        appState.emit("background");
        await vi.advanceTimersByTimeAsync(10_000);
        expect(passes).toHaveBeenCalledOnce();

        appState.emit("active");
        await flush();
        expect(passes).toHaveBeenCalledTimes(2);
    });

    it("watches the watermark only while the gate is on, and wakes only when behind it", async () => {
        await start();
        expect(watermark.listeners.size).toBe(0);

        await setGate(true);
        expect(watermark.listeners.size).toBe(1);
        passes.mockClear();

        watermark.emit(1);
        await flush();
        expect(passes).not.toHaveBeenCalled();

        watermark.emit(5);
        await flush();
        expect(passes).toHaveBeenCalledOnce();

        await Effect.runPromise(setSyncCursor(db, 5));
        watermark.emit(6);
        await flush();
        expect(passes).toHaveBeenCalledOnce();

        await setGate(false);
        expect(watermark.listeners.size).toBe(0);
    });

    it("sends what queued while sync was off as soon as it is turned on", async () => {
        await start();
        await queueWrite();
        await vi.advanceTimersByTimeAsync(10_000);
        passes.mockClear();

        await setGate(true);
        expect(passes).toHaveBeenCalledOnce();

        await setGate(true);
        expect(passes).toHaveBeenCalledOnce();
    });

    it("finishes the pass in flight and then lets go of every trigger when unmounted", async () => {
        const acknowledge = holdNextPass();
        await start();
        await setGate(true);

        unmount();
        await flush();
        acknowledge();
        await flush();
        await expect(Effect.runPromise(getMeta(db, META_KEYS.syncedAt))).resolves.not.toBeNull();

        expect(watermark.listeners.size).toBe(0);
        expect(appState.listeners.size).toBe(0);
        appState.emit("active");
        await queueWrite();
        await vi.advanceTimersByTimeAsync(10_000);
        expect(passes).toHaveBeenCalledOnce();
    });

    it("starts over after a pause only once the pass still in flight has been acknowledged", async () => {
        const acknowledge = holdNextPass();
        await start();

        unmount();
        await flush();
        unmount = registry.mount(syncEngineAtom(db));
        await flush();
        expect(passes).toHaveBeenCalledOnce();

        acknowledge();
        await flush();
        expect(passes).toHaveBeenCalledTimes(2);
    });
});
