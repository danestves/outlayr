import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { renderHook } from "@testing-library/react-native";
import { AppState } from "react-native";
import type { AppStateStatus } from "react-native";

import { duringHandoff, expectHandoff, HANDOFF_TRIP_CAP_MS, openInAppBrowser } from "./app-handoff";
import { useRelock } from "./use-relock";

jest.mock("expo-web-browser", () => ({ openBrowserAsync: async () => ({ type: "opened" }) }));

const SECOND_MS = 1000;
const HOUR_MS = 60 * 60 * SECOND_MS;

let changeTo: (phase: AppStateStatus) => void = () => undefined;

beforeEach(() => {
    jest.useFakeTimers({ now: new Date(2026, 9, 14, 12) });
    jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => {
        changeTo = listener;
        return { remove: () => undefined };
    });
});

afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
});

async function relockSpy() {
    const relock = jest.fn();
    await renderHook(() => useRelock(relock));
    return relock;
}

function openSheet() {
    let close: () => void = () => undefined;
    const sheet = duringHandoff(
        () =>
            new Promise<void>((resolve) => {
                close = resolve;
            })
    );
    return { close: () => close(), sheet };
}

describe("useRelock on Android", () => {
    it("relocks when the user leaves", async () => {
        const relock = await relockSpy();

        changeTo("background");

        expect(relock).toHaveBeenCalledTimes(1);
    });

    it("stays open across a trip Outlayr announced, then judges the next one on its own", async () => {
        const relock = await relockSpy();

        expectHandoff();
        changeTo("background");
        changeTo("active");
        expect(relock).not.toHaveBeenCalled();

        changeTo("background");
        expect(relock).toHaveBeenCalledTimes(1);
    });

    it("relocks when the announced trip never started and the user leaves later", async () => {
        const relock = await relockSpy();

        expectHandoff();
        jest.advanceTimersByTime(6000);
        changeTo("background");

        expect(relock).toHaveBeenCalledTimes(1);
    });

    it("stays open across a short picker round trip", async () => {
        const relock = await relockSpy();

        const { close, sheet } = openSheet();
        changeTo("background");
        jest.advanceTimersByTime(10 * SECOND_MS);
        changeTo("active");
        close();
        await sheet;

        expect(relock).not.toHaveBeenCalled();
    });

    it("stays open when a pick leaves twice, for the library and then its crop screen", async () => {
        const relock = await relockSpy();

        const { close, sheet } = openSheet();
        changeTo("background");
        jest.advanceTimersByTime(8 * SECOND_MS);
        changeTo("active");
        jest.advanceTimersByTime(SECOND_MS);
        changeTo("background");
        jest.advanceTimersByTime(8 * SECOND_MS);
        changeTo("active");
        close();
        await sheet;

        expect(relock).not.toHaveBeenCalled();
    });

    it("relocks on Home once an awaited call has been pending past the cap", async () => {
        const relock = await relockSpy();

        const { close, sheet } = openSheet();
        jest.advanceTimersByTime(HANDOFF_TRIP_CAP_MS + SECOND_MS);
        changeTo("background");

        expect(relock).toHaveBeenCalledTimes(1);
        close();
        await sheet;
    });

    it("relocks on return when the announced trip outlasts the cap", async () => {
        const relock = await relockSpy();

        const { close, sheet } = openSheet();
        changeTo("background");
        jest.advanceTimersByTime(HANDOFF_TRIP_CAP_MS + SECOND_MS);
        changeTo("active");
        close();
        await sheet;

        expect(relock).toHaveBeenCalledTimes(1);
    });

    it("relocks when the user leaves a Custom Tab for Home and comes back later", async () => {
        const relock = await relockSpy();

        await openInAppBrowser("https://outlayr.app/privacy");
        changeTo("background");
        // Home from the tab sends Outlayr nothing; the next event is the return.
        jest.advanceTimersByTime(3 * HOUR_MS);
        changeTo("active");

        expect(relock).toHaveBeenCalledTimes(1);
    });

    it("relocks on Home after an awaited call came back without leaving", async () => {
        const relock = await relockSpy();

        await duringHandoff(async () => "granted");
        changeTo("background");

        expect(relock).toHaveBeenCalledTimes(1);
    });
});
