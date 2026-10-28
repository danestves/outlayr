// @vitest-environment jsdom
import { waitFor } from "@testing-library/react";
import * as Effect from "effect/Effect";
import type { startActivityAsync } from "expo-intent-launcher";
import { Platform } from "react-native";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { hasSystemLanguageSettings, openLanguageSettings } from "./language-settings";

const mockStartActivity = vi.fn<typeof startActivityAsync>(async () => ({ resultCode: 0 }));
const mockOpenSettings = vi.fn<() => Promise<void>>(async () => undefined);
vi.mock("expo-intent-launcher", () => ({
    ActivityAction: { APP_LOCALE_SETTINGS: "android.settings.APP_LOCALE_SETTINGS" },
    startActivityAsync: (...launch: Parameters<typeof startActivityAsync>) => mockStartActivity(...launch),
}));
vi.mock("expo-linking", () => ({ openSettings: () => mockOpenSettings() }));
vi.mock("expo-application", () => ({ applicationId: "com.tryoutlayr.app" }));

const mockApi = vi.spyOn(Platform, "Version", "get");

beforeEach(() => {
    mockStartActivity.mockClear();
    mockOpenSettings.mockClear();
});

describe("system language settings on Android", () => {
    it.each([
        [32, false],
        [33, true],
    ] as const)("on API %i, offers the row: %s", (api, offered) => {
        mockApi.mockReturnValue(api);

        expect(hasSystemLanguageSettings()).toBe(offered);
    });

    it("opens Outlayr's own page under App languages", async () => {
        await Effect.runPromise(openLanguageSettings());

        await waitFor(() => {
            expect(mockStartActivity).toHaveBeenCalledWith("android.settings.APP_LOCALE_SETTINGS", {
                data: "package:com.tryoutlayr.app",
            });
        });
        expect(mockOpenSettings).not.toHaveBeenCalled();
    });

    it("falls back to App info on a system without that page", async () => {
        mockStartActivity.mockRejectedValueOnce(new Error("No Activity found to handle Intent"));

        await Effect.runPromise(openLanguageSettings());

        await waitFor(() => {
            expect(mockOpenSettings).toHaveBeenCalledOnce();
        });
    });

    it("falls back to App info on a build made before the module was added", async () => {
        vi.resetModules();
        vi.doMock("expo-intent-launcher", () => {
            throw new Error("Cannot find native module 'ExpoIntentLauncher'");
        });

        await Effect.runPromise(openLanguageSettings());

        await waitFor(() => {
            expect(mockOpenSettings).toHaveBeenCalledOnce();
        });
        expect(mockStartActivity).not.toHaveBeenCalled();
    });
});
