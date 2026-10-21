import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { waitFor } from "@testing-library/react-native";
import type { startActivityAsync } from "expo-intent-launcher";
import { Platform } from "react-native";

import { hasSystemLanguageSettings, openLanguageSettings } from "./language-settings";

const mockStartActivity = jest.fn<typeof startActivityAsync>(async () => ({ resultCode: 0 }));
const mockOpenSettings = jest.fn<() => Promise<void>>(async () => undefined);
const mockBuild = { hasIntentLauncher: true };
jest.mock("expo-intent-launcher", () => {
    if (!mockBuild.hasIntentLauncher) {
        throw new Error("Cannot find native module 'ExpoIntentLauncher'");
    }
    return {
        ActivityAction: { APP_LOCALE_SETTINGS: "android.settings.APP_LOCALE_SETTINGS" },
        startActivityAsync: (...launch: Parameters<typeof startActivityAsync>) => mockStartActivity(...launch),
    };
});
jest.mock("expo-linking", () => ({ openSettings: () => mockOpenSettings() }));
jest.mock("expo-application", () => ({ applicationId: "com.tryoutlayr.app" }));

const mockApi = jest.spyOn(Platform, "Version", "get");

beforeEach(() => {
    mockBuild.hasIntentLauncher = true;
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
        openLanguageSettings();

        await waitFor(() => {
            expect(mockStartActivity).toHaveBeenCalledWith("android.settings.APP_LOCALE_SETTINGS", {
                data: "package:com.tryoutlayr.app",
            });
        });
        expect(mockOpenSettings).not.toHaveBeenCalled();
    });

    it("falls back to App info on a system without that page", async () => {
        mockStartActivity.mockRejectedValueOnce(new Error("No Activity found to handle Intent"));

        openLanguageSettings();

        await waitFor(() => {
            expect(mockOpenSettings).toHaveBeenCalledTimes(1);
        });
    });

    it("falls back to App info on a build made before the module was added", async () => {
        jest.resetModules();
        mockBuild.hasIntentLauncher = false;

        openLanguageSettings();

        await waitFor(() => {
            expect(mockOpenSettings).toHaveBeenCalledTimes(1);
        });
        expect(mockStartActivity).not.toHaveBeenCalled();
    });
});
