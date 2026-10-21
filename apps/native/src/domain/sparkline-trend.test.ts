import { describe, expect, it } from "@jest/globals";

import { sparklineSeries } from "./log-sparkline";
import { sparklineLabelKey, sparklineTrendKey } from "./sparkline-trend";

const NOW = new Date("2026-07-30T13:00:00");

const SPIKE = [{ amount: 200, date: new Date("2026-07-27T09:00:00"), income: false }];

function amounts(measure: "in" | "out" | "net") {
    return sparklineSeries(SPIKE, measure, "week", NOW).map((point) => point.amount);
}

describe("sparklineTrendKey", () => {
    it("names a rising series in words rather than leaving it to the stroke colour", () => {
        expect(sparklineTrendKey([10, 20, 45])).toBe("insights.trend.rising");
    });

    it("names a falling series", () => {
        expect(sparklineTrendKey([45, 20, 10])).toBe("insights.trend.falling");
    });

    it("reads a series that closed where it opened as flat, however it wandered", () => {
        expect(sparklineTrendKey([30, 90, 5, 30])).toBe("insights.trend.flat");
    });

    it("has no direction to report for an empty series", () => {
        expect(sparklineTrendKey([])).toBe("insights.trend.flat");
    });

    it("reads a running balance climbing out of the red as rising", () => {
        expect(sparklineTrendKey([-120, -40, 15])).toBe("insights.trend.rising");
    });
});

describe("sparklineLabelKey", () => {
    it("speaks the direction of a running net balance", () => {
        expect(sparklineLabelKey("net", amounts("net"), false)).toBe("insights.trend.falling");
    });

    it("does not read a direction off Out, whose ends are pinned to zero", () => {
        expect([amounts("out")[0], amounts("out").at(-1)]).toStrictEqual([0, 0]);
        expect(sparklineTrendKey(amounts("out"))).toBe("insights.trend.flat");
        expect(sparklineLabelKey("out", amounts("out"), false)).toBe("insights.trend.dailyTotals");
    });

    it("does not read a direction off In either", () => {
        const income = sparklineSeries(
            [{ amount: 90, date: new Date("2026-07-29T09:00:00"), income: true }],
            "in",
            "year",
            NOW
        ).map((point) => point.amount);
        expect(sparklineTrendKey(income)).toBe("insights.trend.rising");
        expect(sparklineLabelKey("in", income, true)).toBe("insights.trend.monthlyTotals");
    });
});
