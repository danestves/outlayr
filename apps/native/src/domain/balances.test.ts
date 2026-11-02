import { describe, expect, it } from "vite-plus/test";

import { balancesViewFor, storedBalancesView, unlimitedSpend } from "./balances";

const NOVEMBER = { end: new Date(2026, 11, 1), start: new Date(2026, 10, 1) };

function spend(amount: number, categoryId: string | null, parentId: string | null = null, day = 10) {
    return { amount, categoryId, date: new Date(2026, 10, day), parentId };
}

describe("which view Balances opens on", () => {
    it("opens a first visit on Categories only when a limit exists", () => {
        expect(balancesViewFor({ hasLimit: true, param: undefined, stored: 0 })).toBe("categories");
        expect(balancesViewFor({ hasLimit: false, param: undefined, stored: 0 })).toBe("accounts");
    });

    it("keeps the last pick over the first-visit rule", () => {
        const stored = storedBalancesView("accounts");
        expect(balancesViewFor({ hasLimit: true, param: undefined, stored })).toBe("accounts");
    });

    it("lets a link's view win and ignores one it does not know", () => {
        const stored = storedBalancesView("accounts");
        expect(balancesViewFor({ hasLimit: false, param: "categories", stored })).toBe("categories");
        expect(balancesViewFor({ hasLimit: false, param: "budgets", stored })).toBe("accounts");
    });
});

describe("spend no limit covers", () => {
    it("rolls subcategories up to their parent and ranks by spend", () => {
        const { rows, total } = unlimitedSpend(
            [spend(30, "food"), spend(20, "coffee", "food"), spend(100, "rent")],
            NOVEMBER,
            new Set()
        );
        expect(total).toBe(150);
        expect(rows.map((row) => [row.categoryId, row.spent])).toStrictEqual([
            ["rent", 100],
            ["food", 50],
        ]);
    });

    it("drops what a parent's or a subcategory's own limit covers but keeps it in the total", () => {
        const { rows, total } = unlimitedSpend(
            [spend(40, "groceries"), spend(10, "coffee", "food"), spend(25, "food"), spend(5, "snacks", "groceries")],
            NOVEMBER,
            new Set(["groceries", "coffee"])
        );
        expect(total).toBe(80);
        expect(rows).toStrictEqual([{ categoryId: "food", share: 25 / 80, spent: 25 }]);
    });

    it("counts uncategorised spend in the total without a row, and only inside the window", () => {
        const { rows, total } = unlimitedSpend(
            [spend(60, null), spend(40, "rent"), { ...spend(500, "rent"), date: NOVEMBER.end }],
            NOVEMBER,
            new Set()
        );
        expect(total).toBe(100);
        expect(rows).toStrictEqual([{ categoryId: "rent", share: 0.4, spent: 40 }]);
    });
});
