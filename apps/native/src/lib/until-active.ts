import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";
import { AppState } from "react-native";

import { appStates, WatchAppState } from "./app-events";

export const untilActive = Effect.fn("AppState.untilActive")(function* untilActive() {
    if (AppState.currentState === "active") {
        return;
    }
    const watchAppState = yield* WatchAppState;
    yield* appStates(watchAppState, "active").pipe(Stream.take(1), Stream.runDrain);
});
