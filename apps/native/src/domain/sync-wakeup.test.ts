import { describe, expect, it } from "@jest/globals";

import { isBehindWatermark } from "./sync-wakeup";

describe("isBehindWatermark", () => {
    it("does not wake a device that has applied the whole log", () => {
        expect(isBehindWatermark(8, 7)).toBe(false);
    });

    it("wakes on a single row this device has not seen", () => {
        expect(isBehindWatermark(9, 7)).toBe(true);
    });

    it("ignores a watermark that is not a whole number", () => {
        expect(isBehindWatermark(9.5, 7)).toBe(false);
    });
});
