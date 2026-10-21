import { describe, expect, it } from "@jest/globals";

import { categoryBreakdownWithin, categoryMovers, runningTotals, withCategoryDeltas } from "./insights";
import type { CategoryBreakdownEntry, CategoryMeta, InsightsBucket, InsightsContribution } from "./insights";

function entry(id: string, amount: number): CategoryBreakdownEntry {
    return {
        amount,
        color: "#000000",
        delta: null,
        emoji: null,
        fraction: 0,
        icon: null,
        id,
        name: id,
    };
}

describe("runningTotals", () => {
    const bucket = (value: number, day: number): InsightsBucket => ({
        end: new Date(2025, 6, day + 1),
        label: String(day),
        start: new Date(2025, 6, day),
        value,
    });

    it("carries each slot forward", () => {
        const series = [bucket(10, 1), bucket(-4, 2), bucket(6, 3)];
        expect(runningTotals(series)).toStrictEqual([10, 6, 12]);
    });

    it("returns nothing for an empty window rather than a stray zero", () => {
        expect(runningTotals([])).toStrictEqual([]);
    });
});

describe("categoryMovers", () => {
    it("says nothing when there is no prior window to compare against", () => {
        expect(categoryMovers([entry("a", 500)], [], 500)).toStrictEqual([]);
    });

    it("ranks on currency, not on percentage", () => {
        // 10 -> 30 is +200% and trivial; 4000 -> 4800 is +20% and where the window actually went.
        const current = [entry("rent", 4800), entry("gum", 30)];
        const prior = [entry("rent", 4000), entry("gum", 10)];
        const movers = categoryMovers(current, prior, 4830);

        expect(movers[0].id).toBe("rent");
        expect(movers).toHaveLength(1);
    });

    it("reports a category that stopped entirely", () => {
        const movers = categoryMovers([entry("a", 1000)], [entry("b", 900)], 1000);
        const stopped = movers.find((mover) => mover.id === "b");
        if (!stopped) {
            throw new Error("expected a mover for the stopped category");
        }
        expect(stopped.delta).toBe(-900);
        expect(stopped.fraction).toBe(-1);
    });

    it("leaves a brand-new category's fraction null rather than +100%", () => {
        const movers = categoryMovers([entry("new", 800)], [entry("old", 800)], 800);
        const fresh = movers.find((mover) => mover.id === "new");
        if (!fresh) {
            throw new Error("expected a mover for the new category");
        }
        expect(fresh.delta).toBe(800);
        expect(fresh.fraction).toBeNull();
    });

    it("caps at three so the strip cannot crowd out the chart", () => {
        const current = [entry("a", 500), entry("b", 400), entry("c", 300), entry("d", 200), entry("e", 100)];
        const prior = [entry("a", 1), entry("b", 1), entry("c", 1), entry("d", 1), entry("e", 1)];
        expect(categoryMovers(current, prior, 1500)).toHaveLength(3);
    });

    it("orders by magnitude regardless of direction", () => {
        const current = [entry("up", 300), entry("down", 100)];
        const prior = [entry("up", 100), entry("down", 900)];
        const movers = categoryMovers(current, prior, 400);
        expect(movers[0].id).toBe("down");
        expect(movers[0].delta < 0).toBeTruthy();
    });

    it("stays quiet on an empty window rather than dividing by it", () => {
        expect(categoryMovers([], [entry("a", 100)], 0)).toStrictEqual([]);
    });
});

describe("withCategoryDeltas", () => {
    it("expresses the change as a fraction of what came before", () => {
        const [only] = withCategoryDeltas([entry("a", 150)], [entry("a", 100)]);
        expect(only.delta).toBe(0.5);
    });

    it("leaves a category with no prior spend null", () => {
        const [only] = withCategoryDeltas([entry("a", 50)], []);
        expect(only.delta).toBeNull();
    });

    it("never divides by a zero prior amount", () => {
        const [only] = withCategoryDeltas([entry("a", 50)], [entry("a", 0)]);
        expect(only.delta).toBeNull();
    });
});

describe("categoryBreakdownWithin", () => {
    const meta = new Map<string, CategoryMeta>([
        [
            "food",
            {
                color: "#AA0000",
                emoji: null,
                icon: null,
                id: "food",
                income: false,
                name: "Food",
                parentId: null,
            },
        ],
        [
            "taxi",
            {
                color: "#0000AA",
                emoji: null,
                icon: null,
                id: "taxi",
                income: false,
                name: "Taxi",
                parentId: null,
            },
        ],
    ]);

    const row = (categoryId: string, amount: number, date: Date): InsightsContribution => ({
        amount,
        categoryId,
        date,
        income: false,
        parentId: null,
    });

    const now = new Date(2025, 6, 31, 12, 0, 0, 0);
    const rows = [
        row("food", 100, new Date(2025, 6, 10)),
        row("taxi", 40, new Date(2025, 6, 10)),
        row("food", 900, new Date(2025, 6, 20)),
    ];

    it("recomputes shares against the narrowed total, not the window's", () => {
        const bounds = {
            end: new Date(2025, 6, 11).getTime(),
            start: new Date(2025, 6, 10).getTime(),
        };
        const breakdown = categoryBreakdownWithin(rows, meta, "spent", bounds, now);
        const food = breakdown.find((e) => e.id === "food");
        if (!food) {
            throw new Error("expected a breakdown entry for food");
        }
        // 100 of 140 within the bucket, not 1000 of 1040 across the window.
        expect(Math.abs(food.fraction - 100 / 140) < 1e-9).toBeTruthy();
    });

    it("never counts a future-dated row", () => {
        const future = [row("food", 500, new Date(2025, 7, 15))];
        const bounds = {
            end: new Date(2025, 8, 1).getTime(),
            start: new Date(2025, 6, 1).getTime(),
        };
        expect(categoryBreakdownWithin(future, meta, "spent", bounds, now)).toStrictEqual([]);
    });

    it("reads inflows for the income measure and ignores outflows", () => {
        const mixed: InsightsContribution[] = [
            {
                amount: 700,
                categoryId: "food",
                date: new Date(2025, 6, 10),
                income: true,
                parentId: null,
            },
            row("taxi", 40, new Date(2025, 6, 10)),
        ];
        const bounds = {
            end: new Date(2025, 7, 1).getTime(),
            start: new Date(2025, 6, 1).getTime(),
        };
        const breakdown = categoryBreakdownWithin(mixed, meta, "income", bounds, now);
        expect(breakdown).toHaveLength(1);
        expect(breakdown[0].amount).toBe(700);
    });
});
