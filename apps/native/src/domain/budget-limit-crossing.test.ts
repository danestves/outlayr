import { describe, expect, it } from "vite-plus/test";

import { crossingDay } from "./budget-limit-crossing";

/** Cumulative spend for a month whose only charges land on days 1, 3 and 6. */
const SERIES = [15, 15, 115, 115, 115, 2715, 2715];

describe("crossingDay", () => {
    it("returns the first day the cumulative spend passes the limit", () => {
        expect(crossingDay(SERIES, 200)).toBe(6);
    });

    it("counts a limit equal to a day's cumulative as spent on that day", () => {
        expect(crossingDay(SERIES, 115)).toBe(3);
    });

    it("returns null for a limit above the month's total", () => {
        expect(crossingDay(SERIES, 2715.01)).toBeNull();
    });
});
