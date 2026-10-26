import * as Context from "effect/Context";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Queue from "effect/Queue";
import * as Semaphore from "effect/Semaphore";
import * as Stream from "effect/Stream";
import { AppState } from "react-native";
import type { AppStateStatus } from "react-native";

import type { Database } from "@/db/client";
import { isBehindWatermark } from "@/domain/sync-wakeup";
import { watchSyncWatermark } from "@/lib/convex";

import { subscribeToTableChanges } from "./database-changes";
import { SYNCED_TABLES } from "./sync-outbox-core";
import { SyncStore } from "./sync-store";
import type { SyncError } from "./sync-store";

const SYNC_DEBOUNCE = Duration.seconds(2);

type Watch<A> = (listener: (value: A) => void) => () => void;

export const WatchWatermark = Context.Reference<Watch<number>>("outlayr/data/SyncEngine/WatchWatermark", {
    defaultValue: () => watchSyncWatermark,
});

export const WatchAppState = Context.Reference<Watch<AppStateStatus>>("outlayr/data/SyncEngine/WatchAppState", {
    defaultValue: () => (listener) => {
        const subscription = AppState.addEventListener("change", listener);
        return () => {
            subscription.remove();
        };
    },
});

/**
 * A peer's push arrives as a live watermark; mount, foreground and local writes cover a dropped socket. Inert
 * until the device-local sync gate is on.
 */
export class SyncEngine extends Context.Service<SyncEngine, { readonly run: (db: Database) => Effect.Effect<void> }>()(
    "outlayr/data/SyncEngine"
) {}

const listen = <A>(watch: Watch<A>): Stream.Stream<A> =>
    Stream.callback<A>(
        (queue) =>
            Effect.acquireRelease(
                Effect.sync(() =>
                    watch((value) => {
                        Queue.offerUnsafe(queue, value);
                    })
                ),
                (unwatch) => Effect.sync(unwatch)
            ),
        { bufferSize: 1, strategy: "sliding" }
    );

const tableChanges = (tables: readonly string[]) =>
    listen<string>((listener) => {
        const unsubscribes = tables.map((table) => subscribeToTableChanges(table, () => listener(table)));
        return () => {
            for (const unsubscribe of unsubscribes) {
                unsubscribe();
            }
        };
    });

const warn = (error: SyncError) => Effect.logWarning(error.message, error.cause);

export const make = Effect.gen(function* make() {
    const store = yield* SyncStore;
    const watchWatermark = yield* WatchWatermark;
    const watchAppState = yield* WatchAppState;
    const inFlight = yield* Semaphore.make(1);

    const run = Effect.fn("SyncEngine.run")(function* run(db: Database) {
        const pass = store.sync(db).pipe(
            // Only on a clean pass: a pass that threw may never have reached the server.
            Effect.andThen(store.stamp(db)),
            Effect.catchTags({ SyncError: warn }),
            Effect.uninterruptible,
            // Each pass drains the outbox the previous one left behind, so a second push must not start until the
            // first has been acknowledged.
            inFlight.withPermits(1)
        );

        const unsentWrites = tableChanges(SYNCED_TABLES).pipe(
            Stream.filterEffect(() =>
                store.pending(db).pipe(
                    Effect.map((pending) => pending > 0),
                    Effect.catchTags({ SyncError: (error) => warn(error).pipe(Effect.as(true)) })
                )
            )
        );
        const appStates = listen(watchAppState);
        const settledWrites = Stream.merge(
            unsentWrites.pipe(Stream.as(true)),
            appStates.pipe(
                Stream.filter((state) => state === "background"),
                Stream.as(false)
            )
        ).pipe(Stream.debounce(SYNC_DEBOUNCE), Stream.filter(Boolean));

        const gate = Stream.merge(Stream.succeed(undefined), tableChanges(["appMeta"])).pipe(
            Stream.filterMapEffect(() => store.enabled(db).pipe(Effect.tapError(warn), Effect.result)),
            Stream.changes
        );
        const behindWatermark = gate.pipe(
            // Open only while the gate is on: a signed-out install must not hold a live subscription to the backend.
            Stream.switchMap((enabled) => (enabled ? listen(watchWatermark) : Stream.empty)),
            // Read at wake-up: this device's own push moves the watermark too, so a stale cursor would double round
            // trips.
            Stream.filterEffect((watermark) =>
                store.cursor(db).pipe(
                    Effect.map((cursor) => isBehindWatermark(watermark, cursor)),
                    Effect.catchTags({ SyncError: (error) => warn(error).pipe(Effect.as(false)) })
                )
            )
        );

        const triggers: Stream.Stream<unknown>[] = [
            Stream.succeed(undefined),
            appStates.pipe(Stream.filter((state) => state === "active")),
            settledWrites,
            behindWatermark,
            gate.pipe(Stream.drop(1), Stream.filter(Boolean)),
        ];
        yield* Stream.mergeAll(triggers, { concurrency: "unbounded" }).pipe(
            Stream.buffer({ capacity: 1, strategy: "sliding" }),
            Stream.runForEach(() => pass)
        );
    });

    return SyncEngine.of({ run });
});

export const layer = Layer.effect(SyncEngine, make);
