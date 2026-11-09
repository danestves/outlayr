import { describe, expect, it } from "vite-plus/test";

import { isoWeek, monthGrid, weekDays, weekdayOrder } from "./time-grid";

describe("monthGrid", () => {
    it("pads October 2026 on Monday with three blanks and ends on 1 November", () => {
        const cells = monthGrid("2026-10-31", 2);
        expect(cells.slice(0, 4)).toStrictEqual([null, null, null, { day: "2026-10-01", inMonth: true }]);
        expect(cells.at(-1)).toStrictEqual({ day: "2026-11-01", inMonth: false });
        expect(cells.length % 7).toBe(0);
    });

    it("moves the blanks when the week starts on Sunday", () => {
        expect(
            monthGrid("2026-10-31", 1)
                .slice(0, 5)
                .filter((cell) => cell === null)
        ).toHaveLength(4);
    });
});

describe("weekDays", () => {
    it("crosses the month and matches the frame's week", () => {
        expect(weekDays("2026-10-31", 2)).toStrictEqual([
            "2026-10-26",
            "2026-10-27",
            "2026-10-28",
            "2026-10-29",
            "2026-10-30",
            "2026-10-31",
            "2026-11-01",
        ]);
    });
});

describe("isoWeek", () => {
    it("numbers across a year boundary", () => {
        expect(isoWeek("2026-10-31")).toBe(44);
        expect(isoWeek("2027-01-01")).toBe(53);
    });
});

describe("weekdayOrder", () => {
    it("starts on the chosen weekday", () => {
        expect(new Date(`${weekdayOrder(2)[0]}T12:00:00Z`).getUTCDay()).toBe(1);
        expect(new Date(`${weekdayOrder(1)[0]}T12:00:00Z`).getUTCDay()).toBe(0);
    });
});
