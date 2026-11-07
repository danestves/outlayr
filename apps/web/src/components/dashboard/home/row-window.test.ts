import { describe, expect, it } from "vite-plus/test";

import { ROW_HEIGHT, rowWindow } from "./row-window";

describe("rowWindow", () => {
    it("starts on an odd row once scrolled, so stripes do not swap as the window moves", () => {
        for (const row of [40, 100, 733, 1500]) {
            expect(rowWindow(row * ROW_HEIGHT, 5000).first % 2).toBe(1);
        }
    });

    it("always covers the row at the top of the view and stops at the end", () => {
        const { first, last } = rowWindow(4000 * ROW_HEIGHT, 4010);

        expect(first).toBeLessThanOrEqual(4000);
        expect(last).toBe(4010);
    });

    it("draws from the top before the table reaches the view", () => {
        expect(rowWindow(-500, 5000)).toStrictEqual({ first: 0, last: 100 });
    });
});
