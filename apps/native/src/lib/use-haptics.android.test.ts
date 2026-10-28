// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { Platform } from "react-native";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { HAPTICS_EXCESSIVE, HAPTICS_SUBTLE } from "@/domain/haptics";
import type { HapticEvent } from "@/domain/haptics";

import { useHaptics } from "./use-haptics";

// Compared by the constants' string values: expo-haptics is import-banned outside `use-haptics`.
const mockPerform = vi.hoisted(() => vi.fn<(type: string) => Promise<void>>(async () => undefined));
const mockIos = vi.hoisted(() => vi.fn<() => Promise<void>>(async () => undefined));
vi.mock<Partial<typeof import("expo-haptics")>>(import("expo-haptics"), async (importOriginal) => ({
    ...(await importOriginal()),
    impactAsync: mockIos,
    notificationAsync: mockIos,
    performAndroidHapticsAsync: (type) => mockPerform(type),
    selectionAsync: mockIos,
}));

const mockLevel = { value: HAPTICS_EXCESSIVE };
vi.mock<Partial<typeof import("@/contexts/local-data-context")>>(import("@/contexts/local-data-context"), () => ({
    // SAFETY: the hook only checks that a database exists.
    useLocalData: () => ({ db: {} }) as ReturnType<typeof import("@/contexts/local-data-context").useLocalData>,
}));
vi.mock<Partial<typeof import("@/data/settings")>>(import("@/data/settings"), () => ({
    useNumberSetting: () => mockLevel.value,
}));

async function play(event: HapticEvent) {
    const { result } = await renderHook(() => useHaptics());
    result.current(event);
}

const mockApi = vi.spyOn(Platform, "Version", "get");

beforeEach(() => {
    mockPerform.mockClear();
    mockLevel.value = HAPTICS_EXCESSIVE;
    mockApi.mockReturnValue(36);
});

describe("useHaptics on Android", () => {
    it.each([
        [33, "selection", "clock-tick"],
        [34, "selection", "segment-tick"],
        [33, "success", "confirm"],
        [29, "success", "context-click"],
        [30, "warning", "reject"],
        [29, "warning", "long-press"],
    ] as const)("on API %i plays %s as the system's %s", async (api, event, expected) => {
        mockApi.mockReturnValue(api);

        await play(event);

        expect(mockPerform.mock.calls).toStrictEqual([[expected]]);
    });

    it("keeps the Subtle setting's silence for ticks", async () => {
        mockLevel.value = HAPTICS_SUBTLE;

        await play("keyTap");

        expect(mockPerform).not.toHaveBeenCalled();
    });
});
