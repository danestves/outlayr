import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Logger from "effect/Logger";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import type { AppStateStatus } from "react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import type { Database } from "@/db/client";
import { migratedDatabase } from "@/db/test-database";
import { WatchAppState, WatchTableWrites } from "@/lib/app-events";
import * as DailyReminderSync from "@/lib/daily-reminder-sync";
import * as DueReminderSync from "@/lib/due-reminder-sync";
import { asCloudCall } from "@/lib/fake-cloud";
import { appRuntime } from "@/lib/runtime";
import { PUBLISH_DEBOUNCE_MS } from "@/lib/sync-cadence";
import * as SystemSync from "@/lib/system-sync";
import { watchable } from "@/lib/test-watch";

import * as BackgroundProgram from "./background-program";
import type { RateWireRow } from "./rates";
import * as RecurrenceSweep from "./recurrence-sweep";

const flush = () => vi.advanceTimersByTimeAsync(0);

describe("background program", () => {
    let db: Database;
    let registry: AtomRegistry.AtomRegistry;
    let walk: () => Promise<void>;
    const events: string[] = [];
    const appState = watchable<AppStateStatus>();
    const tableWrites = watchable<string>();
    const pendingWrites = watchable<undefined>();
    const recentRates = watchable<RateWireRow[]>();
    const watchers = [appState, tableWrites, pendingWrites, recentRates];

    const record = (event: string) => async () => {
        events.push(event);
    };
    const step = (event: string) => () =>
        Effect.sync(() => {
            events.push(event);
        });

    const start = () => {
        const services = Layer.mergeAll(
            DailyReminderSync.layer,
            DueReminderSync.layer,
            RecurrenceSweep.layer,
            SystemSync.layer
        ).pipe(
            Layer.provide(
                Layer.mergeAll(
                    Layer.succeed(RecurrenceSweep.RecurrenceWalk, {
                        backfill: () => Effect.promise(() => walk()),
                        repair: () => Effect.succeed(0),
                    }),
                    Layer.succeed(SystemSync.SystemSources, {
                        pullRates: asCloudCall(async () => ({ rows: [], windowStart: "2026-10-01" })),
                        watchPendingWrites: pendingWrites.watch,
                        watchRecentRates: recentRates.watch,
                    }),
                    Layer.succeed(WatchAppState, appState.watch),
                    Layer.succeed(WatchTableWrites, tableWrites.watch)
                )
            )
        );
        registry = AtomRegistry.make({
            initialValues: [
                [
                    appRuntime.layer,
                    Layer.mergeAll(BackgroundProgram.layer.pipe(Layer.provide(services)), Logger.layer([])),
                ],
            ],
        });
        const surfaces = Layer.mergeAll(
            Layer.succeed(DailyReminderSync.DailyReminderSteps, { arm: () => Effect.void, sync: step("daily") }),
            Layer.succeed(DueReminderSync.DueReminderPasses, {
                installment: step("installments"),
                subscription: step("subscriptions"),
            }),
            Layer.succeed(SystemSync.SystemSurfaces, {
                indexSpotlight: () => Effect.void,
                publishWidgets: step("widgets"),
            })
        );
        const unmount = registry.mount(
            appRuntime.atom(
                BackgroundProgram.BackgroundProgram.pipe(
                    Effect.flatMap((program) => program.run(db)),
                    Effect.provide(surfaces)
                )
            )
        );
        return flush().then(() => unmount);
    };

    beforeEach(() => {
        vi.useFakeTimers();
        db = migratedDatabase();
        events.length = 0;
        walk = record("walked");
    });

    afterEach(() => {
        registry.dispose();
        vi.useRealTimers();
    });

    it("reconciles due reminders and rebuilds the widgets only once the sweep has committed", async () => {
        const committed = Promise.withResolvers<undefined>();
        walk = async () => {
            await committed.promise;
            events.push("walked");
        };
        await start();
        await vi.advanceTimersByTimeAsync(10_000);
        expect(events).toStrictEqual(["daily"]);

        committed.resolve(undefined);
        await flush();
        await vi.advanceTimersByTimeAsync(PUBLISH_DEBOUNCE_MS);

        expect(events).toStrictEqual(["daily", "walked", "subscriptions", "installments", "widgets"]);
    });

    it("lets go of every listener when unmounted, and starts nothing after", async () => {
        const unmount = await start();
        for (const watcher of watchers) {
            expect(watcher.listeners.size).toBeGreaterThan(0);
        }
        events.length = 0;

        unmount();
        await flush();
        appState.emit("active");
        tableWrites.emit("transactions");
        pendingWrites.emit(undefined);
        await vi.advanceTimersByTimeAsync(60_000);

        for (const watcher of watchers) {
            expect(watcher.listeners.size).toBe(0);
        }
        expect(events).toStrictEqual([]);
    });
});
