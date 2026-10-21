import { describe, expect, it, jest } from "@jest/globals";
import { renderHook } from "@testing-library/react-native";

jest.mock<Partial<typeof import("expo-localization")>>("expo-localization", () => ({
    getLocales: jest.fn<typeof import("expo-localization").getLocales>(),
}));

import { getLocales } from "expo-localization";

import { testLocale as mockTestLocale } from "@/i18n/test-locale";

import { useRegionCode } from "./use-region-code";

const mockGetLocales = jest.mocked(getLocales);

describe("useRegionCode", () => {
    it("returns the device's own region code", async () => {
        mockGetLocales.mockReturnValue([mockTestLocale({ regionCode: "VE" })]);
        const { result } = await renderHook(() => useRegionCode());
        expect(result.current).toBe("VE");
    });

    it("returns undefined, never an empty string, when the region is empty", async () => {
        mockGetLocales.mockReturnValue([mockTestLocale({ regionCode: "" })]);
        const { result } = await renderHook(() => useRegionCode());
        expect(result.current).toBeUndefined();
    });

    it("returns undefined when getLocales reports no entries", async () => {
        // expo-localization's type says this cannot happen, but a native module returning nothing must not crash.
        mockGetLocales.mockReturnValue([] as unknown as ReturnType<typeof getLocales>);
        const { result } = await renderHook(() => useRegionCode());
        expect(result.current).toBeUndefined();
    });
});
