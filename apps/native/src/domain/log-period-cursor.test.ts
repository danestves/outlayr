import { describe, expect, it } from "@jest/globals";

import { canStepForward, cursorEnd, cursorLabel, cursorStart, stepCursor } from "./log-period-cursor";

// A Wednesday.
const MID_WEEK = new Date("2026-07-22T15:30:00");
const NOW = new Date("2026-07-27T13:00:00");

describe("cursorStart", () => {
    it("normalizes a day to its midnight", () => {
        expect(cursorStart("day", MID_WEEK).getTime()).toBe(new Date("2026-07-22T00:00:00").getTime());
    });

    it("normalizes a week to the configured first weekday", () => {
        expect(cursorStart("week", MID_WEEK, 1).getDate()).toBe(19); // Sunday
        expect(cursorStart("week", MID_WEEK, 2).getDate()).toBe(20); // Monday
    });

    it("normalizes a month to its first instant", () => {
        expect(cursorStart("month", MID_WEEK).getDate()).toBe(1);
    });
});

describe("cursorEnd", () => {
    it("lands on the first instant after the unit", () => {
        expect(cursorEnd("day", MID_WEEK).getDate()).toBe(23);
        expect(cursorEnd("week", MID_WEEK, 1).getDate()).toBe(26);
        expect(cursorEnd("month", MID_WEEK).getMonth()).toBe(7);
    });
});

describe("stepCursor", () => {
    it("steps by whole units and re-normalizes", () => {
        expect(stepCursor("week", MID_WEEK, -1, 1).getDate()).toBe(12);
        expect(stepCursor("month", MID_WEEK, 1).getMonth()).toBe(7);
    });

    it("keeps a month step on the first even from a late day-of-month", () => {
        const late = new Date("2026-01-31T09:00:00");
        const stepped = stepCursor("month", late, 1);
        expect(stepped.getDate()).toBe(1);
        expect(stepped.getMonth()).toBe(1);
    });
});

describe("canStepForward", () => {
    it("refuses a step that would land in the future", () => {
        expect(canStepForward("week", NOW, NOW, 1)).toBe(false);
        expect(canStepForward("week", MID_WEEK, NOW, 1)).toBe(true);
    });
});

describe("cursorLabel", () => {
    it("labels a day with its full date", () => {
        expect(cursorLabel("day", MID_WEEK)).toBe("22 Jul 2026");
    });

    it("labels a month without a day", () => {
        expect(cursorLabel("month", MID_WEEK)).toBe("Jul 2026");
    });

    it("names both months when a week straddles them", () => {
        expect(cursorLabel("week", new Date("2026-07-29T09:00:00"), 1)).toBe("26 Jul – 1 Aug");
    });
});
