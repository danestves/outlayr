import { eq, sql } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Logger from "effect/Logger";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import type { AppStateStatus } from "react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { Meta } from "@/data/app-meta-core";
import type { MetaName, MetaStored } from "@/data/app-meta-registry";
import type { Database } from "@/db/client";
import { appMeta } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";

import { WatchAppState, WatchTableWrites } from "./app-events";
import { DailyReminderSteps, DailyReminderSync, layer as dailyReminderLayer } from "./daily-reminder-sync";
import { freshEntries } from "./fresh-entries";
import { appRuntime } from "./runtime";
import { PUBLISH_DEBOUNCE_MS } from "./sync-cadence";
import { watchable } from "./test-watch";

type ChangeListener = (event: { rowId: number; tableName: string }) => void;

const mockChangeListeners = new Set<ChangeListener>();
vi.mock("expo-sqlite", async (importOriginal) => ({
    ...(await importOriginal<object>()),
    addDatabaseChangeListener: (listener: ChangeListener) => {
        mockChangeListeners.add(listener);
        return {
            remove: () => {
                mockChangeListeners.delete(listener);
            },
        };
    },
}));

const flush = () => vi.advanceTimersByTimeAsync(0);

describe("daily reminder sync", () => {
    let db: Database;
    let registry: AtomRegistry.AtomRegistry;
    const appState = watchable<AppStateStatus>();
    const tableWrites = watchable<string>();
    const arms = vi.fn<() => void>();
    const syncs = vi.fn<() => void>();

    const start = () => {
        const layer = Layer.mergeAll(
            dailyReminderLayer.pipe(
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
        registry.mount(
            appRuntime.atom(
                DailyReminderSync.pipe(
                    Effect.flatMap((sync) => sync.run(db)),
                    Effect.provideService(DailyReminderSteps, {
                        arm: () => Effect.sync(arms),
                        sync: () => Effect.sync(syncs),
                    })
                )
            )
        );
        return flush();
    };

    const writeSetting = async <K extends MetaName>(key: K, value: MetaStored<K>) => {
        await Effect.runPromise(Meta.set(db, key, value));
        const [row] = await db
            .select({ rowId: sql<number>`rowid` })
            .from(appMeta)
            .where(eq(appMeta.key, key));
        for (const listener of mockChangeListeners) {
            listener({ rowId: row.rowId, tableName: "appMeta" });
        }
        await vi.advanceTimersByTimeAsync(PUBLISH_DEBOUNCE_MS);
    };

    beforeEach(() => {
        vi.useFakeTimers();
        db = migratedDatabase();
        arms.mockReset();
        syncs.mockReset();
    });

    afterEach(() => {
        registry.dispose();
        freshEntries.settle("t1");
        freshEntries.settle("t2");
        vi.useRealTimers();
    });

    it("reconciles at launch and on every return to the foreground", async () => {
        await start();
        expect(syncs).toHaveBeenCalledOnce();

        appState.emit("background");
        await flush();
        appState.emit("active");
        await flush();

        expect(syncs).toHaveBeenCalledTimes(2);
    });

    it("arms the onboarding reminder once the user's own save lands on the Log, not on any write to the ledger", async () => {
        await start();

        tableWrites.emit("transactions");
        await vi.advanceTimersByTimeAsync(PUBLISH_DEBOUNCE_MS);
        expect(syncs).toHaveBeenCalledTimes(2);
        expect(arms).not.toHaveBeenCalled();

        freshEntries.mark("t1", new Date());
        await vi.advanceTimersByTimeAsync(PUBLISH_DEBOUNCE_MS);
        expect(arms).not.toHaveBeenCalled();

        freshEntries.settle("t1");
        await vi.advanceTimersByTimeAsync(PUBLISH_DEBOUNCE_MS);
        expect(arms).toHaveBeenCalledOnce();
    });

    it("waits for an entry saved while the previous one's arm is still debouncing", async () => {
        await start();

        freshEntries.mark("t1", new Date());
        freshEntries.settle("t1");
        await vi.advanceTimersByTimeAsync(PUBLISH_DEBOUNCE_MS / 2);
        freshEntries.mark("t2", new Date());
        await vi.advanceTimersByTimeAsync(PUBLISH_DEBOUNCE_MS);
        expect(arms).not.toHaveBeenCalled();

        freshEntries.settle("t2");
        await vi.advanceTimersByTimeAsync(PUBLISH_DEBOUNCE_MS);
        expect(arms).toHaveBeenCalledOnce();
    });

    it("reconciles after a setting changes, not after sync bookkeeping", async () => {
        await start();

        await writeSetting("syncedAt", 1);
        await writeSetting("syncCursor", 1);
        expect(syncs).toHaveBeenCalledOnce();

        await writeSetting("showNotifications", true);
        expect(syncs).toHaveBeenCalledTimes(2);
    });

    it("reconciles when the changed row is gone, since it may have been a setting", async () => {
        await start();

        for (const listener of mockChangeListeners) {
            listener({ rowId: 9999, tableName: "appMeta" });
        }
        await vi.advanceTimersByTimeAsync(PUBLISH_DEBOUNCE_MS);

        expect(syncs).toHaveBeenCalledTimes(2);
    });

    it("keeps reconciling after a pass throws", async () => {
        syncs.mockImplementationOnce(() => {
            throw new Error("notification queue unavailable");
        });
        await start();

        appState.emit("background");
        await flush();
        appState.emit("active");
        await flush();

        expect(syncs).toHaveBeenCalledTimes(2);
    });
});
