import { describe, expect, it } from "vite-plus/test";

import { daysLeftInMonth, monthGrid } from "./month-grid";

const SUNDAY = 1;
const MONDAY = 2;

const days = (today: Date, firstWeekday: number) =>
    monthGrid(today, firstWeekday).weeks.map((week) => week.map((cell) => cell.day));

describe("monthGrid", () => {
    it("lines November 2026 up under its weekdays from either week start", () => {
        const today = new Date(2026, 10, 10);
        expect(days(today, SUNDAY)[0]).toStrictEqual([1, 2, 3, 4, 5, 6, 7]);
        expect(days(today, MONDAY)[0]).toStrictEqual([null, null, null, null, null, null, 1]);
        expect(days(today, MONDAY).at(-1)).toStrictEqual([30, null, null, null, null, null, null]);
        expect(monthGrid(today, MONDAY).weekdays.map((day) => day.getDay())).toStrictEqual([1, 2, 3, 4, 5, 6, 0]);
    });

    it("counts the days after today to the month's real end", () => {
        expect(daysLeftInMonth(new Date(2026, 10, 10))).toBe(20);
        expect(daysLeftInMonth(new Date(2028, 1, 28))).toBe(1);
        expect(daysLeftInMonth(new Date(2026, 11, 31))).toBe(0);
    });
});
