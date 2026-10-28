// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { Text } from "react-native";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { THEME_OPTIONS, themePreferenceForValue, valueForThemePreference } from "./theme-preference";
import { useApplyThemePreference } from "./use-theme-preference";

const mockSetTheme = vi.fn();
const stored = { colorScheme: 0 };

vi.mock<Partial<typeof import("uniwind")>>(import("uniwind"), () => ({
    Uniwind: { setTheme: (theme: string) => mockSetTheme(theme) } as unknown as typeof import("uniwind").Uniwind,
}));

vi.mock<Partial<typeof import("@/contexts/display-settings-context")>>(
    import("@/contexts/display-settings-context"),
    () => ({
        useSettingNumber: (key: string) => (key === "colorScheme" ? stored.colorScheme : 0),
    })
);

function Probe() {
    return <Text testID="preference">{useApplyThemePreference()}</Text>;
}

beforeEach(() => {
    mockSetTheme.mockClear();
    stored.colorScheme = 0;
});

describe("the stored colour scheme", () => {
    it("round-trips every option", () => {
        for (const option of THEME_OPTIONS) {
            expect(themePreferenceForValue(valueForThemePreference(option.preference))).toBe(option.preference);
        }
    });

    it("falls back to following the device for a value it does not know", () => {
        expect(themePreferenceForValue(99)).toBe("system");
        expect(themePreferenceForValue(-1)).toBe("system");
    });

    it("keeps system at zero, so an unwritten setting means follow the device", () => {
        expect(valueForThemePreference("system")).toBe(0);
    });
});

describe("useApplyThemePreference", () => {
    it("pushes the stored scheme into uniwind", () => {
        stored.colorScheme = valueForThemePreference("dark");

        const { getByTestId } = render(<Probe />);

        expect(mockSetTheme).toHaveBeenCalledWith("dark");
        expect(getByTestId("preference").textContent).toBe("dark");
    });

    it("follows the device when nothing has been stored", () => {
        render(<Probe />);

        expect(mockSetTheme).toHaveBeenCalledWith("system");
    });
});
