import { describe, expect, it } from "@jest/globals";
import { currencyTotals } from "@outlayr/money/currency-totals";
import { buildRateTable } from "@outlayr/money/valuation";

import { netTotal } from "./log-measure";
import { scopeHasFigures, scopeTotals } from "./log-scope-figures";

const JULY_5 = new Date(Date.UTC(2026, 6, 5, 12));

function entry(amount: number, currency: string | null = null, income = false) {
    return { amount, currency, income };
}

describe("scopeTotals", () => {
    it("gives an empty scope a zero bucket in the currency the screen is read in", () => {
        const { shown, others } = scopeTotals([], "EUR");
        expect(shown).toStrictEqual({
            count: 0,
            currencyCode: "EUR",
            expense: 0,
            income: 0,
        });
        expect(others).toStrictEqual([]);
    });

    it("keeps in and out apart rather than only reporting the net", () => {
        const { shown } = scopeTotals([entry(40), entry(15, null, true)], "USD");
        expect(shown.expense).toBe(40);
        expect(shown.income).toBe(15);
        expect(netTotal(shown)).toBe(-25);
        expect(shown.count).toBe(2);
    });

    it("splits a mixed-currency scope instead of inventing a sum", () => {
        const scope = [entry(40, "USD"), entry(10, "EUR"), entry(10, "EUR")];
        const { shown, others } = scopeTotals(scope, "USD");

        expect(others).toHaveLength(1);
        const buckets = new Map(currencyTotals(scope, "USD").map((bucket) => [bucket.currencyCode, bucket.amount]));
        expect(buckets.size).toBe(2);
        for (const figures of [shown, ...others]) {
            expect(netTotal(figures)).toBe(buckets.get(figures.currencyCode));
        }
        // -60 is what adding two currencies together would have produced.
        expect([shown, ...others].every((figures) => netTotal(figures) !== -60)).toBeTruthy();
    });

    it("promotes the currency the screen is read in over the dominant one", () => {
        const { shown } = scopeTotals([entry(40, "USD"), entry(10, "EUR"), entry(10, "EUR")], "USD");
        expect(shown.currencyCode).toBe("USD");
        expect(netTotal(shown)).toBe(-40);
    });

    it("falls back to the dominant bucket when the scope holds no such currency", () => {
        const { shown, others } = scopeTotals([entry(10, "EUR")], "USD");
        expect(shown.currencyCode).toBe("EUR");
        expect(netTotal(shown)).toBe(-10);
        expect(others).toStrictEqual([]);
    });

    it("folds a foreign entry in once a rate reaches it", () => {
        const rates = buildRateTable([{ date: "2026-07-01", quote: "EUR", rate: 0.9 }]);
        const { shown, others } = scopeTotals(
            [
                {
                    amount: 100,
                    amountUsd: 100,
                    currency: "USD",
                    date: JULY_5,
                    income: false,
                },
            ],
            "EUR",
            rates
        );
        expect(others).toHaveLength(0);
        expect(shown.currencyCode).toBe("EUR");
        expect(shown.expense).toBe(90);
    });
});

describe("a transfer never reaches the scope header", () => {
    const DAY = new Date(2026, 7, 9);
    const scopeEntry = (amount: number, extra: Record<string, unknown> = {}) => ({
        amount,
        currency: "USD",
        date: DAY,
        income: false,
        ...extra,
    });

    it("leaves the header to the real entries", () => {
        const totals = scopeTotals([scopeEntry(40), scopeEntry(500, { excludedFromTotals: true })], "USD");
        expect(totals.shown.expense).toBe(40);
        expect(totals.shown.count).toBe(1);
    });

    it("says a scope of nothing but transfers has no figures to print", () => {
        expect(scopeHasFigures([scopeEntry(500, { excludedFromTotals: true })])).toBe(false);
        expect(scopeHasFigures([scopeEntry(40), scopeEntry(500, { excludedFromTotals: true })])).toBe(true);
    });
});
