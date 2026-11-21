import { assert, integer, property } from "fast-check";
import { describe, expect, it } from "vite-plus/test";

import { overallBudgetFigures } from "./budget-figures";
import type { StoredBudget } from "./budget-figures";
import type { ExpenseContribution } from "./budget-spent";
import { BUDGET_TYPE } from "./budget-window";
import { roundMoney } from "./round";
import { buildRateTable } from "./valuation";

const NOW = new Date(2026, 6, 15, 12);
const START = new Date(2024, 0, 1);
const CLOSED_PERIODS = 30;
const AT = { displayCurrency: "USD", now: NOW, rates: buildRateTable([]) };
const LIMIT = 100;

const BUDGET: StoredBudget = {
    amount: LIMIT,
    amountUsd: LIMIT,
    currency: "USD",
    dateCreated: START,
    rollover: true,
    startDate: START,
    type: BUDGET_TYPE.month,
};

const spendCents = integer({ max: 1_000_000, min: 0 });

const spend = (cents: number, date: Date): ExpenseContribution => ({
    amount: cents / 100,
    categoryId: "food",
    date,
    parentId: null,
});

describe("a rollover budget's figures", () => {
    it("carries every closed period and counts only the current one as spent", () => {
        assert(
            property(spendCents, spendCents, spendCents, (january, june, current) => {
                const rows = [
                    spend(january, new Date(2024, 0, 10)),
                    spend(june, new Date(2025, 5, 10)),
                    spend(current, new Date(2026, 6, 10)),
                ];
                const figures = overallBudgetFigures(BUDGET, rows, AT);
                const amount = Math.max(0, LIMIT + CLOSED_PERIODS * LIMIT - january / 100 - june / 100);

                expect(roundMoney(figures.amount, 2)).toBe(roundMoney(amount, 2));
                expect(roundMoney(figures.spent, 2)).toBe(roundMoney(current / 100, 2));
                expect(roundMoney(figures.leftover, 2)).toBe(roundMoney(amount - current / 100, 2));
                expect(figures.overBudget).toBe(current / 100 > amount);
            })
        );
    });
});
