// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { BackHandler } from "react-native";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { useStageBack } from "./use-stage-back";

type BackListener = Parameters<typeof BackHandler.addEventListener>[1];

const PRESS = { timeStamp: 0, type: "hardwareBackPress" };

let mockFocused = true;

vi.mock("expo-router", () => ({ useIsFocused: () => mockFocused }));

/** Presses system back: the latest live listener first, as React Native does. */
function pressBack(listeners: BackListener[]): boolean {
    return listeners.toReversed().some((listener) => listener(PRESS) === true);
}

describe("useStageBack", () => {
    const listeners: BackListener[] = [];

    beforeEach(() => {
        mockFocused = true;
        listeners.length = 0;
        vi.spyOn(BackHandler, "addEventListener").mockImplementation((_event, listener) => {
            listeners.push(listener);
            return { remove: () => listeners.splice(listeners.indexOf(listener), 1) };
        });
    });

    it("steps the stage back on system back", async () => {
        const onBack = vi.fn();
        await renderHook(() => useStageBack(onBack));

        expect(pressBack(listeners)).toBe(true);
        expect(onBack).toHaveBeenCalledOnce();
    });

    it("leaves system back to a screen pushed over the form", async () => {
        const onBack = vi.fn();
        const { rerender } = await renderHook(() => useStageBack(onBack));

        mockFocused = false;
        await rerender({});

        expect(pressBack(listeners)).toBe(false);
        expect(onBack).not.toHaveBeenCalled();
    });
});
