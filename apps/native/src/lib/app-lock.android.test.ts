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
const mockCancel = jest.fn(async () => {
    answer({ error: "user_cancel", success: false });
});
jest.mock("expo-local-authentication", () => ({
    authenticateAsync: () => mockAuthenticate(),
    cancelAuthenticate: () => mockCancel(),
}));

const listeners = new Set<(phase: AppStateStatus) => void>();
function startIn(phase: AppStateStatus) {
    Object.defineProperty(AppState, "currentState", { configurable: true, value: phase });
}

function changeTo(phase: AppStateStatus) {
    for (const listener of listeners) {
        listener(phase);
    }
}

beforeEach(() => {
    jest.useFakeTimers();
    listeners.clear();
    mockAuthenticate.mockClear();
    mockCancel.mockClear();
    jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => {
        listeners.add(listener);
        return { remove: () => listeners.delete(listener) };
    });
});

afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
});

describe("requestUnlock on Android", () => {
    it("asks only once Outlayr is back in front", async () => {
        startIn("background");

        const unlock = Effect.runPromise(requestUnlock("Unlock Outlayr"));
        await jest.advanceTimersByTimeAsync(5000);
        expect(mockAuthenticate).not.toHaveBeenCalled();

        changeTo("active");
        await jest.advanceTimersByTimeAsync(0);
        answer({ success: true });

        await expect(unlock).resolves.toStrictEqual({ success: true });
    });

    it("frees a request still unanswered after Outlayr comes back", async () => {
        startIn("active");

        const unlock = Effect.runPromise(requestUnlock("Unlock Outlayr"));
        await jest.advanceTimersByTimeAsync(0);
        changeTo("background");
        changeTo("active");
        await jest.advanceTimersByTimeAsync(1);
        await jest.advanceTimersByTimeAsync(1000);

        expect(mockCancel).toHaveBeenCalledTimes(1);
        await expect(unlock).resolves.toStrictEqual({ error: "user_cancel", success: false });
    });

    it("keeps an answer that lands just after the return", async () => {
        startIn("active");

        const unlock = Effect.runPromise(requestUnlock("Unlock Outlayr"));
        await jest.advanceTimersByTimeAsync(0);
        changeTo("background");
        changeTo("active");
        await jest.advanceTimersByTimeAsync(500);
        answer({ success: true });
        await jest.advanceTimersByTimeAsync(1000);

        expect(mockCancel).not.toHaveBeenCalled();
        await expect(unlock).resolves.toStrictEqual({ success: true });
    });
});
