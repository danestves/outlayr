import { describe, expect, it } from "vite-plus/test";

import { analyticsOnByDefault } from "./analytics-consent";

describe("analyticsOnByDefault", () => {
    it("starts off in the EEA and the UK", () => {
        expect(analyticsOnByDefault("no")).toBe(false);
    });

    it("starts on elsewhere, and when the region is unknown", () => {
        expect(analyticsOnByDefault("US")).toBe(true);
        expect(analyticsOnByDefault(undefined)).toBe(true);
    });
});
