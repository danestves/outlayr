import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Logger from "effect/Logger";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import type { AppStateStatus } from "react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { unusedDatabase } from "@/db/test-database";
import { WatchAppState } from "@/lib/app-events";
import { appRuntime } from "@/lib/runtime";
import { watchable } from "@/lib/test-watch";

import { layer as recurrenceSweepLayer, RecurrenceSweep, RecurrenceWalk } from "./recurrence-sweep";

const flush = () => vi.advanceTimersByTimeAsync(0);

describe("recurrence sweep", () => {
    let registry: AtomRegistry.AtomRegistry;
    const appState = watchable<AppStateStatus>();
    const backfills = vi.fn();
    const onSwept = vi.fn();

    beforeEach(() => {
        vi.useFakeTimers();
        backfills.mockClear();
        onSwept.mockClear();
        const layer = Layer.mergeAll(
            recurrenceSweepLayer.pipe(
                Layer.provide(
                    Layer.mergeAll(
                        Layer.succeed(RecurrenceWalk, {
                            backfill: () =>
                                Effect.sync(() => {
                                    backfills();
                                }),
                            repair: () => Effect.succeed(0),
                        }),
                        Layer.succeed(WatchAppState, appState.watch)
                    )
                )
            ),
            Logger.layer([])
        );
        registry = AtomRegistry.make({ initialValues: [[appRuntime.layer, layer]] });
    });

    afterEach(() => {
        registry.dispose();
        vi.useRealTimers();
    });

    it("calls onSwept once per launch and foreground, walking only outside the cooldown", async () => {
        const swept = Effect.sync(() => {
            onSwept();
        });
        registry.mount(
            appRuntime.atom(RecurrenceSweep.pipe(Effect.flatMap((sweep) => sweep.run(unusedDatabase(), swept))))
        );
        await flush();
        expect(backfills).toHaveBeenCalledOnce();
        expect(onSwept).toHaveBeenCalledOnce();

        await vi.advanceTimersByTimeAsync(10_000);
        appState.emit("active");
        await flush();
        expect(backfills).toHaveBeenCalledOnce();
        expect(onSwept).toHaveBeenCalledTimes(2);

        await vi.advanceTimersByTimeAsync(60_000);
        appState.emit("active");
        await flush();
        expect(backfills).toHaveBeenCalledTimes(2);
        expect(onSwept).toHaveBeenCalledTimes(3);
    });
});
