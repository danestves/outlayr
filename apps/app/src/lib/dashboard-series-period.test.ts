import { describe, expect, it } from "vite-plus/test";

import {
    periodKeyIn,
    periodKeyOf,
    periodOf,
    presetKeyOf,
    priorSlice,
    rangeChoiceOf,
    rangeKindOf,
    shiftPeriodKey,
} from "./dashboard-series-period";

describe("periodOf", () => {
    it("spans the calendar month when the month starts on the 1st", () => {
        expect(periodOf("2026-02", 1)).toStrictEqual({
            days: 28,
            from: "2026-02-01",
            key: "2026-02",
            to: "2026-02-28",
        });
    });

    it("runs from the first day to the day before it in the next month", () => {
        expect(periodOf("2026-12", 15)).toStrictEqual({
            days: 31,
            from: "2026-12-15",
            key: "2026-12",
            to: "2027-01-14",
        });
    });

    it("treats a first day past the 28th as the 28th", () => {
        expect(periodOf("2026-10", 31).from).toBe("2026-10-28");
    });
});

describe("periodKeyOf", () => {
    it("names the period a day falls in by the month it opens in", () => {
        expect(periodKeyOf("2027-01-14", 15)).toBe("2026-12");
        expect(periodKeyOf("2027-01-15", 15)).toBe("2027-01");
    });
});

describe("shiftPeriodKey", () => {
    it("steps across a year", () => {
        expect(shiftPeriodKey("2026-01", -1)).toBe("2025-12");
        expect(shiftPeriodKey("2026-11", 3)).toBe("2027-02");
    });
});

describe("priorSlice", () => {
    const october = periodOf("2026-10", 1);

    it("cuts the previous period to the days elapsed while this one is running", () => {
        expect(priorSlice(october, "2026-10-10", 1)).toMatchObject({ from: "2026-09-01", to: "2026-09-10" });
    });

    it("keeps the whole previous period once this one has closed", () => {
        expect(priorSlice(october, "2026-11-05", 1)).toMatchObject({ from: "2026-09-01", to: "2026-09-30" });
    });

    it("never runs past a shorter previous month", () => {
        expect(priorSlice(periodOf("2026-03", 1), "2026-03-30", 1).to).toBe("2026-02-28");
    });
});

describe("dashboard ranges", () => {
    it("reads a quarter as the three months ending on its month, across a year", () => {
        expect(periodOf("2026-02/quarter", 1)).toMatchObject({ days: 90, from: "2025-12-01", to: "2026-02-28" });
    });

    it("reads a year as January through its month, on the ledger's first day", () => {
        expect(periodOf("2026-10/year", 15)).toMatchObject({ from: "2026-01-15", to: "2026-11-14" });
    });

    it("compares a quarter with the quarter before and a year with the same months a year earlier", () => {
        expect(shiftPeriodKey("2026-02/quarter", -1)).toBe("2025-11/quarter");
        expect(shiftPeriodKey("2026-10/year", -1)).toBe("2025-10/year");
    });

    it("cuts the year before at the same day while this one is running", () => {
        expect(priorSlice(periodOf("2026-11/year", 1), "2026-11-19", 1)).toMatchObject({
            from: "2025-01-01",
            to: "2025-11-19",
        });
    });

    it("leaves a month or a malformed key without a range", () => {
        expect(rangeKindOf("2026-10")).toBeNull();
        expect(rangeKindOf("2026-13/quarter")).toBeNull();
    });
});

describe("weeks and years", () => {
    it("opens a week on the ledger's first weekday", () => {
        expect(periodKeyIn("week", "2026-10-31", { firstDayOfMonth: 1, firstWeekday: 1 })).toBe("2026-10-25");
        expect(periodKeyIn("week", "2026-10-31", { firstDayOfMonth: 1, firstWeekday: 2 })).toBe("2026-10-26");
        expect(periodKeyIn("week", "2026-10-25", { firstDayOfMonth: 1, firstWeekday: 2 })).toBe("2026-10-19");
    });

    it("spans seven days from a week key, across a month end", () => {
        expect(periodOf("2026-10-26", 1)).toStrictEqual({
            days: 7,
            from: "2026-10-26",
            key: "2026-10-26",
            to: "2026-11-01",
        });
        expect(shiftPeriodKey("2026-03-02", -1)).toBe("2026-02-23");
    });

    it("runs a year over its twelve ledger months", () => {
        expect(periodOf("2026", 1)).toStrictEqual({ days: 365, from: "2026-01-01", key: "2026", to: "2026-12-31" });
        expect(periodOf("2024", 15)).toMatchObject({ days: 366, from: "2024-01-15", to: "2025-01-14" });
        expect(shiftPeriodKey("2026", -1)).toBe("2025");
    });

    it("files a day before the first day of January's period in the year before", () => {
        expect(periodKeyIn("year", "2026-01-10", { firstDayOfMonth: 15, firstWeekday: 1 })).toBe("2025");
    });
});

describe("custom ranges", () => {
    it("counts both ends and compares with the same number of days just before", () => {
        const range = periodOf("2026-10-28..2026-11-03", 15);
        expect(range).toStrictEqual({ days: 7, from: "2026-10-28", key: "2026-10-28..2026-11-03", to: "2026-11-03" });
        expect(shiftPeriodKey(range.key, -1)).toBe("2026-10-21..2026-10-27");
    });

    it("cuts the range before to the days elapsed while the range is still running", () => {
        const range = periodOf("2026-11-10..2026-11-23", 1);
        expect(priorSlice(range, "2026-11-12", 1)).toMatchObject({ from: "2026-10-27", to: "2026-10-29" });
    });

    it("rejects a day that does not exist, a reversed range and anything else from the URL", () => {
        expect(rangeChoiceOf("2026-02-01..2026-02-28")).toBe("2026-02-01..2026-02-28");
        expect(rangeChoiceOf("2026-02-01..2026-02-30")).toBeNull();
        expect(rangeChoiceOf("2026-03-05..2026-03-01")).toBeNull();
        expect(rangeChoiceOf("2026-3-1..2026-3-5")).toBeNull();
        expect(rangeChoiceOf("decade")).toBeNull();
        expect(rangeChoiceOf("30d")).toBe("30d");
    });

    it("rolls presets with today and the week start the user set", () => {
        const sunday = { firstWeekday: 1, today: "2026-11-19" };
        const monday = { firstWeekday: 2, today: "2026-11-19" };
        expect(presetKeyOf("week", sunday, "2025-01-01")).toBe("2026-11-15..2026-11-21");
        expect(presetKeyOf("week", monday, "2025-01-01")).toBe("2026-11-16..2026-11-22");
        expect(presetKeyOf("30d", monday, "2025-01-01")).toBe("2026-10-21..2026-11-19");
        expect(presetKeyOf("all", monday, "2025-01-01")).toBe("2025-01-01..2026-11-19");
        expect(presetKeyOf("all", monday, "2027-01-01")).toBe("2026-11-19..2026-11-19");
    });
});
