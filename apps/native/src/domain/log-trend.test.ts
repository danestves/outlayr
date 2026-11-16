import { describe, expect, it } from "vite-plus/test";

import { measureTrend } from "./log-trend";

const figures = (income: number, expense: number) => ({ count: 1, currencyCode: "USD", expense, income });

describe("measureTrend", () => {
    it("reads spending less as the good direction for Out", () => {
        expect(measureTrend("out", figures(0, 50), figures(0, 100))).toStrictEqual({ change: -0.5, good: true });
    });

    it("measures a net that climbed out of the red against the size of the old loss", () => {
        expect(measureTrend("net", figures(100, 50), figures(0, 100))).toStrictEqual({ change: 1.5, good: true });
    });

    it("has nothing to say when the period before had nothing", () => {
        expect(measureTrend("in", figures(100, 0), figures(0, 0))).toBeNull();
    });
});
