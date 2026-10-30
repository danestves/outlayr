import { describe, expect, it } from "vite-plus/test";

import type { CategoryBreakdownEntry, InsightsBucket, InsightsMeasure } from "@/data/insights";
import type { InsightsTotals } from "@/domain/insights-measure";

import { heroMagnitudeFor, heroPositiveFor } from "./hero";

const PROFITABLE_MONTH: InsightsTotals = { income: 4200, spent: 3100 };

const GROCERIES: CategoryBreakdownEntry = {
    amount: 820,
    color: "#2F6F4E",
    delta: null,
    emoji: null,
    fraction: 0.26,
    icon: null,
    id: "groceries",
    name: "Groceries",
};

function magnitude(entry: CategoryBreakdownEntry | null, measure: InsightsMeasure): number {
    return heroMagnitudeFor(entry, null, null, measure, PROFITABLE_MONTH);
}

function positive(entry: CategoryBreakdownEntry | null, measure: InsightsMeasure): boolean {
    return heroPositiveFor(entry, null, null, measure === "net", measure, PROFITABLE_MONTH);
}

describe("insights hero", () => {
    it("signs a filtered category by what the breakdown collected, not by the window", () => {
        expect(magnitude(GROCERIES, "net")).toBe(820);
        expect(positive(GROCERIES, "net")).toBe(false);
    });

    it("keeps a filtered income category positive", () => {
        expect(positive(GROCERIES, "income")).toBe(true);
    });

    it("falls through to the window when nothing is filtered", () => {
        expect(magnitude(null, "net")).toBe(1100);
        expect(positive(null, "net")).toBe(true);
    });

    it("reads the scrubbed bar of a filtered category, not the category's window total", () => {
        const bucket: InsightsBucket = {
            end: new Date("2026-07-16"),
            label: "15",
            start: new Date("2026-07-15"),
            value: 64,
        };

        expect(heroMagnitudeFor(GROCERIES, null, bucket, "spent", PROFITABLE_MONTH)).toBe(64);
        expect(heroPositiveFor(GROCERIES, null, bucket, false, "spent", PROFITABLE_MONTH)).toBe(false);
    });

    it("reads a scrubbed running balance ahead of the window", () => {
        const bucket: InsightsBucket = {
            end: new Date("2026-08-01"),
            label: "Jul",
            start: new Date("2026-07-01"),
            value: -40,
        };

        expect(heroMagnitudeFor(null, -250, bucket, "net", PROFITABLE_MONTH)).toBe(250);
        expect(heroPositiveFor(null, -250, bucket, true, "net", PROFITABLE_MONTH)).toBe(false);
    });
});
