import { describe, expect, it } from "vite-plus/test";

import { periodKeyOf, periodOf, priorSlice, shiftPeriodKey } from "./dashboard-series-period";

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
