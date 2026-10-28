// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import * as Effect from "effect/Effect";
import { AppState } from "react-native";
import type { AppStateStatus } from "react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { duringHandoff, expectHandoff, HANDOFF_TRIP_CAP_MS, openInAppBrowser } from "./app-handoff";
import { useRelock } from "./use-relock";

vi.mock("expo-web-browser", () => ({ openBrowserAsync: async () => ({ type: "opened" }) }));

const SECOND_MS = 1000;
const HOUR_MS = 60 * 60 * SECOND_MS;

let changeTo: (phase: AppStateStatus) => void = () => undefined;

beforeEach(() => {
    vi.useFakeTimers({ now: new Date(2026, 9, 14, 12) });
    vi.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => {
        changeTo = listener;
        return { remove: () => undefined };
    });
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

async function relockSpy() {
    const relock = vi.fn();
    await renderHook(() => useRelock(relock));
    return relock;
}

function openSheet() {
    let close: () => void = () => undefined;
    const sheet = Effect.runPromise(
        duringHandoff(
            Effect.callback<undefined>((resume) => {
                close = () => resume(Effect.undefined);
            })
        )
    );
    return { close: () => close(), sheet };
}

describe("useRelock on Android", () => {
    it("relocks when the user leaves", async () => {
        const relock = await relockSpy();

        changeTo("background");

        expect(relock).toHaveBeenCalledOnce();
    });

    it("stays open across a trip Outlayr announced, then judges the next one on its own", async () => {
        const relock = await relockSpy();

        expectHandoff();
        changeTo("background");
        changeTo("active");
        expect(relock).not.toHaveBeenCalled();

        changeTo("background");
        expect(relock).toHaveBeenCalledOnce();
    });

    it("relocks when the announced trip never started and the user leaves later", async () => {
        const relock = await relockSpy();

        expectHandoff();
        vi.advanceTimersByTime(6000);
        changeTo("background");

        expect(relock).toHaveBeenCalledOnce();
    });

    it("stays open across a short picker round trip", async () => {
        const relock = await relockSpy();

        const { close, sheet } = openSheet();
        changeTo("background");
        vi.advanceTimersByTime(10 * SECOND_MS);
        changeTo("active");
        close();
        await sheet;

        expect(relock).not.toHaveBeenCalled();
    });

    it("stays open when a pick leaves twice, for the library and then its crop screen", async () => {
        const relock = await relockSpy();

        const { close, sheet } = openSheet();
        changeTo("background");
        vi.advanceTimersByTime(8 * SECOND_MS);
        changeTo("active");
        vi.advanceTimersByTime(SECOND_MS);
        changeTo("background");
        vi.advanceTimersByTime(8 * SECOND_MS);
        changeTo("active");
        close();
        await sheet;

        expect(relock).not.toHaveBeenCalled();
    });

    it("relocks on Home once an awaited call has been pending past the cap", async () => {
        const relock = await relockSpy();

        const { close, sheet } = openSheet();
        vi.advanceTimersByTime(HANDOFF_TRIP_CAP_MS + SECOND_MS);
        changeTo("background");

        expect(relock).toHaveBeenCalledOnce();
        close();
        await sheet;
    });

    it("relocks on return when the announced trip outlasts the cap", async () => {
        const relock = await relockSpy();

        const { close, sheet } = openSheet();
        changeTo("background");
        vi.advanceTimersByTime(HANDOFF_TRIP_CAP_MS + SECOND_MS);
        changeTo("active");
        close();
        await sheet;

        expect(relock).toHaveBeenCalledOnce();
    });

    it("relocks when the user leaves a Custom Tab for Home and comes back later", async () => {
        const relock = await relockSpy();

        await openInAppBrowser("https://outlayr.app/privacy");
        changeTo("background");
        // Home from the tab sends Outlayr nothing; the next event is the return.
        vi.advanceTimersByTime(3 * HOUR_MS);
        changeTo("active");

        expect(relock).toHaveBeenCalledOnce();
    });

    it("relocks on Home after an awaited call came back without leaving", async () => {
        const relock = await relockSpy();

        await Effect.runPromise(duringHandoff(Effect.succeed("granted")));
        changeTo("background");

        expect(relock).toHaveBeenCalledOnce();
    });
});
