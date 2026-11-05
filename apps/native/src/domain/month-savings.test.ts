import type { ExpenseContribution } from "@outlayr/money/budget-spent";
import { BUDGET_TYPE } from "@outlayr/money/budget-window";
import { buildRateTable } from "@outlayr/money/valuation";
import { describe, expect, it } from "vite-plus/test";

import { monthSavings, proRowCost, yearSavings } from "./month-savings";
import type { MonthSavingsInput, SavingsBudget } from "./month-savings";

const NOW = new Date(2026, 10, 5, 12);
const OCTOBER = new Date(2026, 9, 1);

const NAMES = new Map([
    ["dining", "Dining"],
    ["food", "Food"],
    ["groceries", "Groceries"],
    ["travel", "Travel"],
]);

function budget(overrides: Partial<SavingsBudget>): SavingsBudget {
    return {
        amount: 100,
        amountUsd: 100,
        categoryId: "dining",
        currency: "USD",
        dateCreated: new Date(2026, 0, 1),
        name: "Dining",
        overall: false,
        parentId: null,
        rollover: false,
        startDate: new Date(2026, 10, 1),
        type: BUDGET_TYPE.month,
        ...overrides,
    };
}

const overall = (overrides: Partial<SavingsBudget> = {}) =>
    budget({ amount: 1000, amountUsd: 1000, categoryId: null, name: "Everything", overall: true, ...overrides });

function spend(
    amount: number,
    date: Date,
    categoryId: string | null = "dining",
    parentId: string | null = null
): ExpenseContribution {
    return { amount, categoryId, date, parentId };
}

const inOctober = (amount: number, categoryId = "dining", parentId: string | null = null) =>
    spend(amount, new Date(2026, 9, 12), categoryId, parentId);

function savings(
    budgets: SavingsBudget[],
    contributions: ExpenseContribution[],
    overrides: Partial<MonthSavingsInput> = {}
) {
    return monthSavings({
        budgets,
        categoryNames: NAMES,
        contributions,
        month: OCTOBER,
        now: NOW,
        valuation: { displayCurrency: "USD", rates: buildRateTable([]) },
        ...overrides,
    });
}

describe("monthSavings budgets", () => {
    it("sums what each kept budget left unspent and names the ones that went over", () => {
        const result = savings(
            [
                budget({}),
                budget({ amount: 200, categoryId: "travel", name: "Travel" }),
                budget({ amount: 50, categoryId: "food", name: "Food" }),
            ],
            [inOctober(70, "dining"), inOctober(260, "travel"), inOctober(20, "food")]
        );

        expect(result).toMatchObject({
            budgetsKept: 2,
            budgetsTotal: 3,
            overNames: ["Travel"],
            underBudgets: 60,
        });
    });

    it("counts the overall budget alone when it is kept, since it already holds every category budget", () => {
        const result = savings([overall(), budget({})], [inOctober(70, "dining"), inOctober(430, "rent")]);

        expect(result).toMatchObject({ budgetsKept: 2, budgetsTotal: 2, underBudgets: 500 });
    });

    it("falls back to the category budgets when the overall budget went over", () => {
        const result = savings(
            [overall({ amount: 300 }), budget({})],
            [inOctober(70, "dining"), inOctober(430, "rent")]
        );

        expect(result).toMatchObject({ budgetsKept: 1, overNames: ["Everything"], underBudgets: 30 });
    });

    it("counts a parent category budget alone, not the subcategory budget inside it", () => {
        const result = savings(
            [
                budget({ amount: 300, categoryId: "food", name: "Food" }),
                budget({ amount: 200, categoryId: "groceries", name: "Groceries", parentId: "food" }),
            ],
            [inOctober(120, "groceries", "food")]
        );

        expect(result).toMatchObject({ budgetsKept: 2, underBudgets: 180 });
    });

    it("leaves a budget out when nothing was spent on it or it did not exist when the month began", () => {
        const result = savings(
            [budget({ categoryId: "travel", name: "Travel" }), budget({ dateCreated: new Date(2026, 9, 10) })],
            [inOctober(40, "dining")]
        );

        expect(result).toMatchObject({ budgetsTotal: 0, hasBudgets: true, kept: 0, underBudgets: 0 });
    });

    it("places a budget that starts mid-month in the month it starts in, and waits for it to close", () => {
        const mid = budget({ startDate: new Date(2026, 9, 15) });
        const rows = [spend(40, new Date(2026, 9, 20))];

        expect(savings([mid], rows)).toMatchObject({ budgetsTotal: 0 });
        expect(savings([mid], rows, { now: new Date(2026, 10, 20) })).toMatchObject({
            budgetsTotal: 1,
            underBudgets: 60,
        });
    });

    it("gives a month that has not ended no figures", () => {
        const result = savings([budget({})], [spend(40, new Date(2026, 10, 2))], { month: new Date(2026, 10, 1) });

        expect(result).toMatchObject({ budgetsTotal: 0, hasBudgets: false, kept: 0 });
    });

    it("keeps a bad month's total at zero while still naming what went over", () => {
        const result = savings([budget({})], [inOctober(180)]);

        expect(result).toMatchObject({ budgetsKept: 0, kept: 0, overNames: ["Dining"], underBudgets: 0 });
    });
});

describe("monthSavings below the usual", () => {
    const priorMonths = (amounts: [number, number, number], categoryId = "dining") =>
        amounts.map((amount, index) => spend(amount, new Date(2026, 8 - index, 10), categoryId));

    it("reports the largest drop under the three month average", () => {
        const result = savings(
            [],
            [
                ...priorMonths([300, 300, 300]),
                ...priorMonths([200, 200, 200], "travel"),
                inOctober(150, "dining"),
                inOctober(120, "travel"),
            ]
        );

        expect(result.drop).toStrictEqual({ amount: 150, average: 300, id: "dining", name: "Dining" });
        expect(result.kept).toBe(150);
    });

    it("needs spending in at least two of the three months, and counts the quiet one as zero", () => {
        const twoOfThree = savings([], [...priorMonths([300, 300, 0]), inOctober(100)]);
        const oneOfThree = savings([], [...priorMonths([300, 0, 0]), inOctober(100)]);

        expect(twoOfThree.drop).toMatchObject({ amount: 100, average: 200 });
        expect(oneOfThree.drop).toBeNull();
    });

    it("skips a category that spent more than usual, or nothing at all", () => {
        expect(savings([], [...priorMonths([100, 100, 100]), inOctober(130)]).drop).toBeNull();
        expect(savings([], priorMonths([100, 100, 100])).drop).toBeNull();
    });

    it("rolls a subcategory into its parent", () => {
        const rows = [
            spend(300, new Date(2026, 8, 3), "groceries", "food"),
            spend(300, new Date(2026, 7, 3), "food"),
            inOctober(100, "groceries", "food"),
        ];

        expect(savings([], rows).drop).toMatchObject({ amount: 100, id: "food", name: "Food" });
    });

    it("leaves out a category that already has a kept budget, so its underspend is not counted twice", () => {
        const rows = [...priorMonths([300, 300, 300]), inOctober(150)];
        const result = savings([budget({ amount: 200 })], rows);

        expect(result.drop).toBeNull();
        expect(result.kept).toBe(50);
    });

    it("leaves out a category whose budget went over, so it is not both over budget and a saving", () => {
        const rows = [...priorMonths([300, 300, 300]), inOctober(150)];
        const result = savings([budget({ amount: 100 })], rows);

        expect(result.drop).toBeNull();
        expect(result.kept).toBe(0);
    });

    it("adds the drop to the budgets' total", () => {
        const rows = [...priorMonths([300, 300, 300], "travel"), inOctober(60, "dining"), inOctober(100, "travel")];

        expect(savings([budget({})], rows)).toMatchObject({ drop: { id: "travel" }, kept: 240, underBudgets: 40 });
    });
});

describe("yearSavings", () => {
    it("sums the twelve closed months and counts the ones with no budget over", () => {
        const rows = [
            spend(40, new Date(2026, 9, 12)),
            spend(130, new Date(2026, 8, 12)),
            spend(90, new Date(2025, 11, 12)),
            spend(10, new Date(2025, 9, 12)),
        ];

        const year = yearSavings({
            budgets: [budget({ dateCreated: new Date(2025, 0, 1) })],
            categoryNames: NAMES,
            contributions: rows,
            now: NOW,
            valuation: { displayCurrency: "USD", rates: buildRateTable([]) },
        });

        expect(year).toMatchObject({ kept: 70, monthsUnder: 2 });
        expect(year.from).toStrictEqual(new Date(2025, 10, 1));
        expect(year.to).toStrictEqual(new Date(2026, 9, 1));
    });
});

describe("proRowCost", () => {
    const cost = { currency: "USD", monthly: 4.99 };

    it("shows the price only when the kept total beats it and the store prices in the display currency", () => {
        expect(proRowCost(10, cost, "USD")).toBe(4.99);
        expect(proRowCost(4.99, cost, "USD")).toBeNull();
        expect(proRowCost(100, cost, "EUR")).toBeNull();
        expect(proRowCost(100, null, "USD")).toBeNull();
    });
});
