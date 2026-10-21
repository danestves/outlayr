import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { render } from "@testing-library/react-native";
import { Text } from "react-native";

import { THEME_OPTIONS, themePreferenceForValue, valueForThemePreference } from "./theme-preference";
import { useApplyThemePreference } from "./use-theme-preference";

const mockSetTheme = jest.fn();
const stored = { colorScheme: 0 };

jest.mock<Partial<typeof import("uniwind")>>("uniwind", () => ({
    Uniwind: { setTheme: (theme: string) => mockSetTheme(theme) } as unknown as typeof import("uniwind").Uniwind,
}));

jest.mock<Partial<typeof import("@/contexts/display-settings-context")>>("@/contexts/display-settings-context", () => ({
    useSettingNumber: (key: string) => (key === "colorScheme" ? stored.colorScheme : 0),
}));

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
    it("pushes the stored scheme into uniwind", async () => {
        stored.colorScheme = valueForThemePreference("dark");

        const { getByTestId } = await render(<Probe />);

        expect(mockSetTheme).toHaveBeenCalledWith("dark");
        expect(getByTestId("preference").props.children).toBe("dark");
    });

    it("follows the device when nothing has been stored", async () => {
        await render(<Probe />);

        expect(mockSetTheme).toHaveBeenCalledWith("system");
    });
});
