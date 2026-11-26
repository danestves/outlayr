import { describe, expect, it } from "vite-plus/test";

import { daysInMonthPeriod } from "./daily-allowance";

describe("daysInMonthPeriod", () => {
    it("counts the calendar month", () => {
        expect(daysInMonthPeriod(new Date(2026, 0, 10), 1)).toBe(31);
        expect(daysInMonthPeriod(new Date(2026, 1, 10), 1)).toBe(28);
    });

    it("counts from the configured first day of the month", () => {
        expect(daysInMonthPeriod(new Date(2026, 0, 20), 15)).toBe(31);
        expect(daysInMonthPeriod(new Date(2026, 1, 20), 15)).toBe(28);
    });
});
