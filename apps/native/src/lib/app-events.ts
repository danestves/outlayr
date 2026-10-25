import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Queue from "effect/Queue";
import * as Stream from "effect/Stream";
import { addDatabaseChangeListener } from "expo-sqlite";
import { AppState } from "react-native";
import type { AppStateStatus } from "react-native";

export type Watch<A> = (listener: (value: A) => void) => () => void;

export type Signal = (listener: () => void) => () => void;

export const WatchAppState = Context.Reference<Watch<AppStateStatus>>("outlayr/lib/AppEvents/WatchAppState", {
    defaultValue: () => (listener) => {
        const subscription = AppState.addEventListener("change", listener);
        return () => {
            subscription.remove();
        };
    },
});

export const WatchTableWrites = Context.Reference<Watch<string>>("outlayr/lib/AppEvents/WatchTableWrites", {
    defaultValue: () => (listener) => {
        const subscription = addDatabaseChangeListener((event) => {
            listener(event.tableName);
        });
        return () => {
            subscription.remove();
        };
    },
});

export const listen = <A>(watch: Watch<A>, keep: (value: A) => boolean = () => true): Stream.Stream<A> =>
    Stream.callback<A>(
        (queue) =>
            Effect.acquireRelease(
                Effect.sync(() =>
                    watch((value) => {
                        if (keep(value)) {
                            Queue.offerUnsafe(queue, value);
                        }
                    })
                ),
                (unwatch) => Effect.sync(unwatch)
            ),
        { bufferSize: 1, strategy: "sliding" }
    );

export const signals = (signal: Signal): Stream.Stream<undefined> =>
    listen<undefined>((listener) =>
        signal(() => {
            listener(undefined);
        })
    );

export const appStates = (watch: Watch<AppStateStatus>, state: AppStateStatus): Stream.Stream<AppStateStatus> =>
    listen(watch, (next) => next === state);

export const launchAndForegrounds = (watch: Watch<AppStateStatus>): Stream.Stream<unknown> =>
    Stream.merge(Stream.succeed(undefined), appStates(watch, "active"));
