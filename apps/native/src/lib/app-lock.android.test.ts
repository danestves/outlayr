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
const mockCancel = vi.fn(async () => {
    answer({ error: "user_cancel", success: false });
});
vi.mock("expo-local-authentication", () => ({
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
    vi.useFakeTimers();
    listeners.clear();
    mockAuthenticate.mockClear();
    mockCancel.mockClear();
    vi.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => {
        listeners.add(listener);
        return { remove: () => listeners.delete(listener) };
    });
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe("requestUnlock on Android", () => {
    it("asks only once Outlayr is back in front", async () => {
        startIn("background");

        const unlock = Effect.runPromise(requestUnlock("Unlock Outlayr"));
        await vi.advanceTimersByTimeAsync(5000);
        expect(mockAuthenticate).not.toHaveBeenCalled();

        changeTo("active");
        await vi.advanceTimersByTimeAsync(0);
        answer({ success: true });

        await expect(unlock).resolves.toStrictEqual({ success: true });
    });

    it("frees a request still unanswered after Outlayr comes back", async () => {
        startIn("active");

        const unlock = Effect.runPromise(requestUnlock("Unlock Outlayr"));
        await vi.advanceTimersByTimeAsync(0);
        changeTo("background");
        changeTo("active");
        await vi.advanceTimersByTimeAsync(1);
        await vi.advanceTimersByTimeAsync(1000);

        expect(mockCancel).toHaveBeenCalledOnce();
        await expect(unlock).resolves.toStrictEqual({ error: "user_cancel", success: false });
    });

    it("keeps an answer that lands just after the return", async () => {
        startIn("active");

        const unlock = Effect.runPromise(requestUnlock("Unlock Outlayr"));
        await vi.advanceTimersByTimeAsync(0);
        changeTo("background");
        changeTo("active");
        await vi.advanceTimersByTimeAsync(500);
        answer({ success: true });
        await vi.advanceTimersByTimeAsync(1000);

        expect(mockCancel).not.toHaveBeenCalled();
        await expect(unlock).resolves.toStrictEqual({ success: true });
    });
});
