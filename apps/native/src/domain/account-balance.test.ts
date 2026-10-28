import { accountBalance } from "@outlayr/money/account-balance";
import type { CurrencyCell } from "@outlayr/money/currency-totals";
import { buildRateTable } from "@outlayr/money/valuation";
import { describe, expect, it } from "vite-plus/test";

function cell(overrides: Partial<CurrencyCell>): CurrencyCell {
    return {
        amount: 0,
        amountUsd: 0,
        count: 1,
        currencyCode: "USD",
        dateKey: "2026-01-05",
        income: false,
        unconvertedAmount: 0,
        unconvertedCount: 0,
        ...overrides,
    };
}

const NO_RATES = buildRateTable([]);

describe("accountBalance", () => {
    it("adds income and subtracts expense at face value in the account currency", () => {
        const result = accountBalance(
            { currency: "USD", initialBalance: 100 },
            [cell({ amount: 50, amountUsd: 50, income: true }), cell({ amount: 30, amountUsd: 30, income: false })],
            NO_RATES
        );

        expect(result.total).toBe(120);
        expect(result.exact).toBe(true);
        expect(result.composition).toStrictEqual([{ amount: 20, currencyCode: "USD" }]);
    });

    it("values a foreign cell through its frozen USD sum at the day's rate", () => {
        const rates = buildRateTable([{ date: "2026-01-01", quote: "EUR", rate: 0.8 }]);

        const result = accountBalance(
            { currency: "EUR", initialBalance: 100 },
            [
                cell({
                    amount: 10,
                    amountUsd: 10,
                    currencyCode: "USD",
                    income: false,
                }),
            ],
            rates
        );

        // 10 USD × 0.8 EUR/USD = 8 EUR off a 100 EUR opening balance.
        expect(result.total).toBe(92);
        expect(result.exact).toBe(true);
        expect(result.composition).toStrictEqual([{ amount: -10, currencyCode: "USD" }]);
    });

    it("mixes same-currency and foreign cells into one USD total", () => {
        const result = accountBalance(
            { currency: "USD", initialBalance: 0 },
            [
                cell({ amount: 10, amountUsd: 10, currencyCode: "USD", income: true }),
                cell({ amount: 20, amountUsd: 25, currencyCode: "EUR", income: false }),
            ],
            NO_RATES
        );

        expect(result.total).toBe(-15);
        expect(result.exact).toBe(true);
        expect(result.composition).toStrictEqual([
            { amount: 10, currencyCode: "USD" },
            { amount: -20, currencyCode: "EUR" },
        ]);
    });

    it("excludes a foreign cell from the scalar balance when no rate reaches it", () => {
        const result = accountBalance(
            { currency: "EUR", initialBalance: 100 },
            [cell({ amount: 5, amountUsd: 6, currencyCode: "GBP", income: false })],
            NO_RATES
        );

        expect(result.total).toBe(100);
        expect(result.exact).toBe(false);
        expect(result.composition).toStrictEqual([{ amount: -5, currencyCode: "GBP" }]);
    });

    it("reports inexact when a foreign cell carries unconverted rows", () => {
        const result = accountBalance(
            { currency: "USD", initialBalance: 0 },
            [
                cell({
                    amount: 27,
                    amountUsd: 25,
                    count: 3,
                    currencyCode: "EUR",
                    income: false,
                    unconvertedAmount: 7,
                    unconvertedCount: 1,
                }),
            ],
            NO_RATES
        );

        expect(result.total).toBe(-25);
        expect(result.exact).toBe(false);
    });

    it("places a currency-less cell through its USD value, never at face value", () => {
        const result = accountBalance(
            { currency: "USD", initialBalance: 0 },
            [cell({ amount: 999, amountUsd: 12, currencyCode: null, income: true })],
            NO_RATES
        );

        expect(result.total).toBe(12);
        expect(result.exact).toBe(true);
        expect(result.composition).toStrictEqual([{ amount: 999, currencyCode: null }]);
    });
});
