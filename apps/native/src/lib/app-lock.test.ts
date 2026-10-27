import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as Effect from "effect/Effect";
import type { LocalAuthenticationResult } from "expo-local-authentication";
import { AppState } from "react-native";
import type { AppStateStatus } from "react-native";

import { requestUnlock } from "./app-lock";

let answer: (result: LocalAuthenticationResult) => void = () => undefined;
const mockAuthenticate = jest.fn(
    () =>
        new Promise<LocalAuthenticationResult>((resolve) => {
            answer = resolve;
        })
);
jest.mock("expo-local-authentication", () => ({
    authenticateAsync: () => mockAuthenticate(),
}));

const listeners = new Set<(phase: AppStateStatus) => void>();

beforeEach(() => {
    jest.useFakeTimers();
    listeners.clear();
    mockAuthenticate.mockClear();
    jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => {
        listeners.add(listener);
        return { remove: () => listeners.delete(listener) };
    });
});

afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
});

describe("requestUnlock on iOS", () => {
    it("waits for Outlayr to be back in front before asking", async () => {
        Object.defineProperty(AppState, "currentState", { configurable: true, value: "background" });

        const unlock = Effect.runPromise(requestUnlock("Unlock Outlayr"));
        await jest.advanceTimersByTimeAsync(0);
        expect(mockAuthenticate).not.toHaveBeenCalled();

        for (const listener of listeners) {
            listener("active");
        }
        await jest.advanceTimersByTimeAsync(0);
        answer({ success: true });

        await expect(unlock).resolves.toStrictEqual({ success: true });
    });
});
