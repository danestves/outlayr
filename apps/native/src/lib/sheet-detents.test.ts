import { describe, expect, it } from "vite-plus/test";

import { heightDetent, LARGE_SHEET_TOP_INSET } from "./sheet-detents";

describe("sheet detents", () => {
    it("turns a height into a fraction of the tallest sheet, never more than all of it", () => {
        expect(heightDetent(418, 836 + LARGE_SHEET_TOP_INSET)).toBe(0.5);
        expect(heightDetent(2000, 874)).toBe(1);
    });
});
