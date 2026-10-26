import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { eq, sql } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Logger from "effect/Logger";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import type { AppStateStatus } from "react-native";

import { META_KEYS, setMeta } from "@/data/app-meta-core";
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
jest.mock("expo-sqlite", () => ({
    ...jest.requireActual<object>("expo-sqlite"),
    addDatabaseChangeListener: (listener: ChangeListener) => {
        mockChangeListeners.add(listener);
        return {
            remove: () => {
                mockChangeListeners.delete(listener);
            },
        };
    },
}));

const flush = () => jest.advanceTimersByTimeAsync(0);

describe("daily reminder sync", () => {
    let db: Database;
    let registry: AtomRegistry.AtomRegistry;
    const appState = watchable<AppStateStatus>();
    const tableWrites = watchable<string>();
    const arms = jest.fn<() => void>();
    const syncs = jest.fn<() => void>();

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

    const writeSetting = async (key: string) => {
        await Effect.runPromise(setMeta(db, key, "true"));
        const [row] = await db
            .select({ rowId: sql<number>`rowid` })
            .from(appMeta)
            .where(eq(appMeta.key, key));
        for (const listener of mockChangeListeners) {
            listener({ rowId: row.rowId, tableName: "appMeta" });
        }
        await jest.advanceTimersByTimeAsync(PUBLISH_DEBOUNCE_MS);
    };

    beforeEach(() => {
        jest.useFakeTimers();
        db = migratedDatabase();
        arms.mockReset();
        syncs.mockReset();
    });

    afterEach(() => {
        registry.dispose();
        freshEntries.settle("t1");
        jest.useRealTimers();
    });

    it("reconciles at launch and on every return to the foreground", async () => {
        await start();
        expect(syncs).toHaveBeenCalledTimes(1);

        appState.emit("background");
        await flush();
        appState.emit("active");
        await flush();

        expect(syncs).toHaveBeenCalledTimes(2);
    });

    it("arms the onboarding reminder on the user's own save, not on any write to the ledger", async () => {
        await start();

        tableWrites.emit("transactions");
        await jest.advanceTimersByTimeAsync(PUBLISH_DEBOUNCE_MS);
        expect(syncs).toHaveBeenCalledTimes(2);
        expect(arms).not.toHaveBeenCalled();

        freshEntries.mark("t1");
        await jest.advanceTimersByTimeAsync(PUBLISH_DEBOUNCE_MS);
        expect(arms).toHaveBeenCalledTimes(1);
    });

    it("reconciles after a setting changes, not after sync bookkeeping", async () => {
        await start();

        await writeSetting(META_KEYS.syncedAt);
        await writeSetting(META_KEYS.syncCursor);
        expect(syncs).toHaveBeenCalledTimes(1);

        await writeSetting("showNotifications");
        expect(syncs).toHaveBeenCalledTimes(2);
    });

    it("reconciles when the changed row is gone, since it may have been a setting", async () => {
        await start();

        for (const listener of mockChangeListeners) {
            listener({ rowId: 9999, tableName: "appMeta" });
        }
        await jest.advanceTimersByTimeAsync(PUBLISH_DEBOUNCE_MS);

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
