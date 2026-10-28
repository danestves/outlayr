// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vite-plus/test";

vi.mock<Partial<typeof import("@/i18n/device-language")>>(import("@/i18n/device-language"), () => ({
    useDeviceLanguageTag: vi.fn<typeof import("@/i18n/device-language").useDeviceLanguageTag>(),
}));

import { useDeviceLanguageTag } from "@/i18n/device-language";

import { useLocaleTag } from "./use-locale-tag";

const mockUseDeviceLanguageTag = vi.mocked(useDeviceLanguageTag);

describe("useLocaleTag", () => {
    it("returns the device's own language tag", async () => {
        mockUseDeviceLanguageTag.mockReturnValue("es-VE");
        const { result } = await renderHook(() => useLocaleTag());
        expect(result.current).toBe("es-VE");
    });

    it("returns undefined when the tag is whitespace-only", async () => {
        mockUseDeviceLanguageTag.mockReturnValue("   ");
        const { result } = await renderHook(() => useLocaleTag());
        expect(result.current).toBeUndefined();
    });
});
