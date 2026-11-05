import { describe, expect, it } from "vite-plus/test";

import { budgetPace, clockTime, dayLabel, money, moneyParts } from "./ledger";

describe("budgetPace", () => {
    it("counts today as spent and leaves the days after it", () => {
        const pace = budgetPace(
            { effectiveLimit: 3100, from: "2026-10-01", spent: 2900, to: "2026-10-31" },
            "2026-10-30"
        );

        expect(pace.daysLeft).toBe(1);
        expect(pace.underPace).toBeCloseTo(100);
    });

    it("reads a window that has not started as untouched", () => {
        const pace = budgetPace({ effectiveLimit: 300, from: "2026-11-01", spent: 0, to: "2026-11-30" }, "2026-10-31");

        expect(pace.elapsedShare).toBe(0);
        expect(pace.underPace).toBe(0);
    });
});

describe("dayLabel", () => {
    it("names the calendar day, whatever zone the browser runs in", () => {
        expect(dayLabel("2026-10-28", "2026-10-30")).toBe("Wed, 28 Oct");
        expect(dayLabel("2026-10-29", "2026-10-30")).toBe("Yesterday");
    });
});

describe("moneyParts", () => {
    it("keeps the sign with the symbol and the cents apart", () => {
        expect(moneyParts(1214.6, "USD")).toStrictEqual({ fraction: ".60", lead: "+$", whole: "1,214" });
        expect(moneyParts(-12, "USD")).toStrictEqual({ fraction: ".00", lead: "-$", whole: "12" });
    });
});

describe("clockTime", () => {
    it("reads the 12-hour clock by default and the 24-hour one when the phone does", () => {
        expect(clockTime("14:05")).toBe("2:05 PM");
        expect(clockTime("14:05", true)).toBe("14:05");
    });

    it("keeps midnight at 00 on the 24-hour clock", () => {
        expect(clockTime("00:30", true)).toBe("00:30");
        expect(clockTime("00:30")).toBe("12:30 AM");
    });
});

describe("showCents off", () => {
    it("rounds to whole units, in the figure and in its parts", () => {
        expect(money(1214.6, "USD", "auto", false)).toBe("$1,215");
        expect(moneyParts(1214.6, "USD", false)).toStrictEqual({ fraction: "", lead: "+$", whole: "1,215" });
    });

    it("keeps the cents of an amount that would round to nothing", () => {
        expect(money(0.3, "USD", "auto", false)).toBe("$0.30");
    });
});
