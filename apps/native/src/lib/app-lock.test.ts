import * as Effect from "effect/Effect";
import type { LocalAuthenticationResult } from "expo-local-authentication";
import { AppState } from "react-native";
import type { AppStateStatus } from "react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { requestUnlock } from "./app-lock";

let answer: (result: LocalAuthenticationResult) => void = () => undefined;
const mockAuthenticate = vi.fn(
    () =>
        new Promise<LocalAuthenticationResult>((resolve) => {
            answer = resolve;
        })
);
vi.mock("expo-local-authentication", () => ({
    authenticateAsync: () => mockAuthenticate(),
}));

const listeners = new Set<(phase: AppStateStatus) => void>();

beforeEach(() => {
    vi.useFakeTimers();
    listeners.clear();
    mockAuthenticate.mockClear();
    vi.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => {
        listeners.add(listener);
        return { remove: () => listeners.delete(listener) };
    });
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe("requestUnlock on iOS", () => {
    it("waits for Outlayr to be back in front before asking", async () => {
        Object.defineProperty(AppState, "currentState", { configurable: true, value: "background" });

        const unlock = Effect.runPromise(requestUnlock("Unlock Outlayr"));
        await vi.advanceTimersByTimeAsync(0);
        expect(mockAuthenticate).not.toHaveBeenCalled();

        for (const listener of listeners) {
            listener("active");
        }
        await vi.advanceTimersByTimeAsync(0);
        answer({ success: true });

        await expect(unlock).resolves.toStrictEqual({ success: true });
    });
});
