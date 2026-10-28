import { describe, expect, it } from "vite-plus/test";

import { compareBudgetSeverity } from "./budget-severity";
import type { BudgetSeverity } from "./budget-severity";

function budget(amount: number, spent: number, name = `${amount}/${spent}`): BudgetSeverity & { name: string } {
    return { amount, name, overBudget: spent > amount, spent };
}

function rank(list: (BudgetSeverity & { name: string })[]): string[] {
    return [...list].sort(compareBudgetSeverity).map((b) => b.name);
}

describe("compareBudgetSeverity", () => {
    it("puts every over-budget budget ahead of every healthy one", () => {
        const nearlyGone = budget(500, 499, "nearly-gone");
        const barelyOver = budget(500, 501, "barely-over");
        expect(compareBudgetSeverity(barelyOver, nearlyGone)).toBeLessThan(0);
        expect(compareBudgetSeverity(nearlyGone, barelyOver)).toBeGreaterThan(0);
    });

    it("orders over-budget budgets by absolute overage, not by percent", () => {
        // 150% of a small limit is a smaller hole than 110% of a large one, and the
        // hole is what has to be covered.
        const small = budget(100, 150, "small-loud");
        const large = budget(2000, 2200, "large-deep");
        expect(rank([small, large])).toStrictEqual(["large-deep", "small-loud"]);
    });

    it("orders healthy budgets by percent spent, deepest first", () => {
        const list = [budget(1000, 100, "10pct"), budget(200, 180, "90pct"), budget(500, 250, "50pct")];
        expect(rank(list)).toStrictEqual(["90pct", "50pct", "10pct"]);
    });

    it("keeps the incoming order when severity ties", () => {
        const first = budget(400, 200, "first");
        const second = budget(800, 400, "second");
        expect(compareBudgetSeverity(first, second)).toBe(0);
        expect(rank([first, second])).toStrictEqual(["first", "second"]);
        expect(rank([second, first])).toStrictEqual(["second", "first"]);
    });

    it("treats an untouched zero-limit budget as the least severe healthy one", () => {
        const zero = budget(0, 0, "zero");
        const spent = budget(1000, 1, "barely-spent");
        expect(rank([zero, spent])).toStrictEqual(["barely-spent", "zero"]);
    });
});
