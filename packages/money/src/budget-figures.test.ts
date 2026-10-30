import { describe, expect, it } from "vite-plus/test";

import { categoryBudgetFigures, overallBudgetFigures } from "./budget-figures";
import type { StoredBudget } from "./budget-figures";
import type { ExpenseContribution } from "./budget-spent";
import { BUDGET_TYPE } from "./budget-window";
import { buildRateTable } from "./valuation";

const NOW = new Date(2026, 2, 15, 12);
const AT = { displayCurrency: "USD", now: NOW, rates: buildRateTable([]) };

const BUDGET: StoredBudget = {
    amount: 100,
    amountUsd: 100,
    currency: "USD",
    dateCreated: new Date(2026, 0, 1),
    rollover: true,
    startDate: new Date(2026, 0, 1),
    type: BUDGET_TYPE.month,
};

function spend(amount: number, date: Date, categoryId: string | null = "food"): ExpenseContribution {
    return { amount, categoryId, date, parentId: null };
}

describe("a rollover budget's figures", () => {
    it.each([
        ["an unspent allowance lets the window spend past its own limit", 70, 90, 120, 140, false],
        ["a carried overspend makes the window over before its own limit", 150, 100, 60, 50, true],
    ])("%s", (_, january, february, march, amount, overBudget) => {
        const rows = [
            spend(january, new Date(2026, 0, 10)),
            spend(february, new Date(2026, 1, 10)),
            spend(march, new Date(2026, 2, 10)),
        ];

        expect(categoryBudgetFigures({ ...BUDGET, categoryId: "food" }, rows, AT)).toMatchObject({
            amount,
            carry: amount - 100,
            leftover: amount - march,
            limit: 100,
            overBudget,
            spent: march,
        });
    });

    it("counts nothing for a category budget whose category is gone", () => {
        const rows = [spend(40, new Date(2026, 1, 10), null), spend(500, new Date(2026, 2, 10), "rent")];

        expect(categoryBudgetFigures({ ...BUDGET, categoryId: null }, rows, AT)).toMatchObject({
            amount: 100,
            carry: 0,
            overBudget: false,
            spent: 0,
        });
    });

    it("shows a past window only its own spending and what it inherited", () => {
        const rows = [
            spend(70, new Date(2026, 0, 10)),
            spend(30, new Date(2026, 1, 10), "rent"),
            spend(500, new Date(2026, 2, 1)),
        ];

        const february = overallBudgetFigures(BUDGET, rows, { ...AT, periodOffset: -1 });

        expect(february).toMatchObject({ amount: 130, carry: 30, overBudget: false, spent: 30 });
        expect(february.window.start).toStrictEqual(new Date(2026, 1, 1));
    });
});
