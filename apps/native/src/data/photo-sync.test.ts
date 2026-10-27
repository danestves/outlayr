import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Logger from "effect/Logger";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import type { AppStateStatus } from "react-native";

import type { Database } from "@/db/client";
import { migratedDatabase } from "@/db/test-database";
import { WatchAppState, WatchTableWrites } from "@/lib/app-events";
import { appRuntime } from "@/lib/runtime";
import { watchable } from "@/lib/test-watch";

import { META_KEYS, setMeta } from "./app-meta-core";
import type { PhotoReconciliation } from "./photo-store-core";
import { layer as photoSyncLayer, PhotoPasses, PhotoSync } from "./photo-sync";
import type { PhotoSyncResult } from "./photo-sync-core";

const flush = () => jest.advanceTimersByTimeAsync(0);

const NOTHING_MOVED: PhotoSyncResult = { downloaded: 0, released: 0, uploaded: 0 };
const NOTHING_REPAIRED: PhotoReconciliation = { cleared: 0, purged: 0, repointed: 0, rescued: 0 };

describe("photo sync", () => {
    let db: Database;
    let registry: AtomRegistry.AtomRegistry;
    const appState = watchable<AppStateStatus>();
    const tableWrites = watchable<string>();
    const reconciles = jest.fn<() => Promise<PhotoReconciliation>>();
    const cycles = jest.fn<() => Promise<PhotoSyncResult>>();

    const atomFor = (step: "reconcile" | "run") =>
        appRuntime.atom(
            PhotoSync.pipe(
                Effect.flatMap((photos) => photos[step](db)),
                Effect.provideService(
                    PhotoPasses,
                    PhotoPasses.of({
                        reconcile: () => Effect.promise(() => reconciles()),
                        replateLogos: async () => 0,
                        sync: () => Effect.promise(() => cycles()),
                    })
                )
            )
        );

    const hold = <A>(mock: { mockReturnValueOnce: (value: Promise<A>) => unknown }, value: A) => {
        const { promise, resolve } = Promise.withResolvers<undefined>();
        mock.mockReturnValueOnce(promise.then(() => value));
        return () => resolve(undefined);
    };

    beforeEach(async () => {
        jest.useFakeTimers();
        db = migratedDatabase();
        await setMeta(db, META_KEYS.syncEnabled, "1");
        reconciles.mockReset();
        reconciles.mockResolvedValue(NOTHING_REPAIRED);
        cycles.mockReset();
        cycles.mockResolvedValue(NOTHING_MOVED);
        const layer = Layer.mergeAll(
            photoSyncLayer.pipe(
                Layer.provide(
                    Layer.mergeAll(
                        Layer.succeed(WatchAppState, appState.watch),
                        Layer.succeed(WatchTableWrites, tableWrites.watch)
                    )
                )
            ),
            Logger.layer([])
        );
        registry = AtomRegistry.make({ initialValues: [[appRuntime.layer, layer]] });
    });

    afterEach(() => {
        registry.dispose();
        jest.useRealTimers();
    });

    it("holds the first cycle until the launch reconciliation has repaired the paths", async () => {
        const repaired = hold(reconciles, NOTHING_REPAIRED);
        registry.mount(atomFor("reconcile"));
        registry.mount(atomFor("run"));
        await flush();
        expect(cycles).not.toHaveBeenCalled();

        repaired();
        await flush();
        expect(cycles).toHaveBeenCalledTimes(1);
    });

    it("resumes after a pause only once the cycle still in flight has finished", async () => {
        registry.mount(atomFor("reconcile"));
        const syncAtom = atomFor("run");
        const finish = hold(cycles, NOTHING_MOVED);
        const pause = registry.mount(syncAtom);
        await flush();

        pause();
        await flush();
        registry.mount(syncAtom);
        await flush();
        expect(cycles).toHaveBeenCalledTimes(1);

        finish();
        await flush();
        expect(cycles).toHaveBeenCalledTimes(2);
    });

    it("lets go of every trigger while paused", async () => {
        registry.mount(atomFor("reconcile"));
        const pause = registry.mount(atomFor("run"));
        await flush();
        expect(appState.listeners.size).toBeGreaterThan(0);

        pause();
        await flush();
        appState.emit("active");
        tableWrites.emit("transactions");
        await jest.advanceTimersByTimeAsync(10_000);

        expect(appState.listeners.size).toBe(0);
        expect(tableWrites.listeners.size).toBe(0);
        expect(cycles).toHaveBeenCalledTimes(1);
    });
});
