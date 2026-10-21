import { describe, expect, it } from "@jest/globals";
import { currencyTotals } from "@outlayr/money/currency-totals";
import { roundMoney } from "@outlayr/money/round";
import { buildRateTable, isExact, limitIn, sumValuedIn, valueIn, valueRowsIn } from "@outlayr/money/valuation";

const rates = buildRateTable([
    { date: "2026-07-01", quote: "EUR", rate: 0.9 },
    { date: "2026-07-10", quote: "EUR", rate: 0.95 },
    { date: "2026-07-10", quote: "VES", rate: 40 },
]);

describe("buildRateTable", () => {
    it("answers with the newest rate on or before the date", () => {
        expect(rates.get("EUR", "2026-07-15")).toBe(0.95);
        expect(rates.get("EUR", "2026-07-10")).toBe(0.95);
        expect(rates.get("EUR", "2026-07-05")).toBe(0.9);
    });

    it("declines before its earliest row, and for an unknown code", () => {
        expect(rates.get("EUR", "2026-06-30")).toBeNull();
        expect(rates.get("JPY", "2026-07-15")).toBeNull();
    });
});

describe("valueIn", () => {
    it("returns the stored amount untouched when already in display currency", () => {
        const value = valueIn(
            {
                amount: 12.4,
                amountUsd: 13.78,
                currency: "EUR",
                dateKey: "2026-07-15",
            },
            "EUR",
            rates
        );
        expect(value).toBe(12.4);
    });

    it("converts a null-currency row instead of relabelling it", () => {
        const value = valueIn({ amount: 99, amountUsd: 110, currency: null, dateKey: "2026-07-15" }, "EUR", rates);
        expect(value).toBe(104.5);
    });

    it("still takes a null-currency row at face value when it has no USD value", () => {
        const value = valueIn({ amount: 99, amountUsd: null, currency: null, dateKey: "2026-07-15" }, "EUR", rates);
        expect(value).toBe(99);
    });

    it("converts a cross-currency row at the rate of ITS OWN day", () => {
        const value = valueIn({ amount: 100, amountUsd: 100, currency: "USD", dateKey: "2026-07-05" }, "EUR", rates);
        expect(value).toBe(90);
    });

    it("converts a USD row that was never canonicalized", () => {
        const value = valueIn({ amount: 100, amountUsd: null, currency: "USD", dateKey: "2026-07-05" }, "EUR", rates);
        expect(value).toBe(90);
    });

    it("uses the canonical value directly when display is USD", () => {
        const value = valueIn({ amount: 90, amountUsd: 100, currency: "EUR", dateKey: "2026-07-05" }, "USD", rates);
        expect(value).toBe(100);
    });

    it("rounds to the display currency's own exponent", () => {
        const jpy = buildRateTable([{ date: "2026-07-01", quote: "JPY", rate: 157.3 }]);
        const value = valueIn({ amount: 1, amountUsd: 1, currency: "USD", dateKey: "2026-07-05" }, "JPY", jpy);
        expect(value).toBe(157);
    });

    it("falls back to face value rather than dropping money", () => {
        const noUsd = valueIn({ amount: 50, amountUsd: null, currency: "GBP", dateKey: "2026-07-15" }, "EUR", rates);
        expect(noUsd).toBe(50);

        const noRate = valueIn({ amount: 50, amountUsd: 50, currency: "USD", dateKey: "2020-01-01" }, "EUR", rates);
        expect(noRate).toBe(50);
    });

    it("contributes zero when a pending custom row is valued in another currency", () => {
        expect(
            valueIn(
                {
                    amount: 40,
                    amountUsd: null,
                    currency: "VES",
                    dateKey: "2026-07-15",
                    exchangeRate: null,
                    exchangeRateType: "custom",
                },
                "EUR",
                rates
            )
        ).toBe(0);
    });

    it("uses a pending custom row's native amount when display currency matches", () => {
        expect(
            valueIn(
                {
                    amount: 40,
                    amountUsd: null,
                    currency: "VES",
                    dateKey: "2026-07-15",
                    exchangeRate: null,
                    exchangeRateType: "custom",
                },
                "VES",
                rates
            )
        ).toBe(40);
    });
});

describe("isExact", () => {
    it("is true for a same-currency row and for a canonicalized one", () => {
        expect(isExact({ amount: 1, amountUsd: null, currency: "EUR", dateKey: "2026-07-15" }, "EUR", rates)).toBe(
            true
        );
        expect(isExact({ amount: 1, amountUsd: 1, currency: "USD", dateKey: "2026-07-15" }, "EUR", rates)).toBe(true);
    });

    it("is false for a cross-currency row that was never canonicalized", () => {
        expect(isExact({ amount: 1, amountUsd: null, currency: "GBP", dateKey: "2026-07-15" }, "EUR", rates)).toBe(
            false
        );
    });

    it("is true for a USD row with no frozen value", () => {
        expect(isExact({ amount: 1, amountUsd: null, currency: "USD", dateKey: "2026-07-15" }, "EUR", rates)).toBe(
            true
        );
    });

    it("is false when canonical but no rate reaches that far back", () => {
        expect(isExact({ amount: 1, amountUsd: 1, currency: "USD", dateKey: "2020-01-01" }, "EUR", rates)).toBe(false);
    });
});

describe("limitIn", () => {
    it("restates a target at the rate of the day its window opened", () => {
        // 4000 VES / 40 = $100 at the window's rate, and $100 * 0.95 = €95; the stored 200 is a stale freeze.
        expect(
            limitIn({ amount: 4000, amountUsd: 200, currency: "VES" }, new Date(Date.UTC(2026, 6, 15)), "EUR", rates)
        ).toBe(95);
    });

    it("falls back to the frozen value when no rate reaches the window", () => {
        expect(
            limitIn({ amount: 4000, amountUsd: 200, currency: "VES" }, new Date(Date.UTC(2026, 6, 1)), "EUR", rates)
        ).toBe(180);
    });

    it("hands back a target already in the display currency untouched", () => {
        expect(
            limitIn(
                { amount: 250.5, amountUsd: 278.33, currency: "EUR" },
                new Date(Date.UTC(2026, 6, 15)),
                "EUR",
                rates
            )
        ).toBe(250.5);
    });
});

describe("sumValuedIn", () => {
    const JULY_15 = new Date(Date.UTC(2026, 6, 15, 12));

    it("adds a mixed-currency list in the display currency", () => {
        expect(
            sumValuedIn(
                [
                    { amount: 40, amountUsd: 44.44, currency: "EUR", date: JULY_15 },
                    { amount: 50, amountUsd: null, currency: "USD", date: JULY_15 },
                ],
                "EUR",
                rates
            )
        ).toBe(87.5);
    });

    it("values each row at its own day", () => {
        expect(
            sumValuedIn(
                [
                    {
                        amount: 100,
                        amountUsd: null,
                        currency: "USD",
                        date: new Date(Date.UTC(2026, 6, 5, 12)),
                    },
                    { amount: 100, amountUsd: null, currency: "USD", date: JULY_15 },
                ],
                "EUR",
                rates
            )
        ).toBe(185);
    });
});

describe("valueRowsIn", () => {
    const JULY_5 = new Date(Date.UTC(2026, 6, 5, 12));
    const JULY_15 = new Date(Date.UTC(2026, 6, 15, 12));
    const cents = (value: number) => roundMoney(value);
    const added = (values: readonly number[]) => cents(values.reduce((total, value) => total + value, 0));

    // $2.15 is €1.935 at 0.9 and €2.0425 at 0.95: rounding each row alone leaves a fifth of a cent per row.
    const entries = [JULY_5, JULY_15].flatMap((date) =>
        Array.from({ length: 4 }, () => ({
            amount: 2.15,
            amountUsd: 2.15,
            currency: "USD",
            date,
            income: true,
        }))
    );
    const asValuable = (entry: (typeof entries)[number]) => ({
        amount: entry.amount,
        amountUsd: entry.amountUsd,
        currency: entry.currency,
        dateKey: entry.date.toISOString().slice(0, 10),
        income: entry.income,
    });

    it("reconciles a header total with the day subtotals under it", () => {
        const header = currencyTotals(entries, "EUR", rates);
        const subtotals = [JULY_5, JULY_15].map((day) =>
            currencyTotals(
                entries.filter((entry) => entry.date === day),
                "EUR",
                rates
            )
        );

        expect({
            header: cents(header[0].amount),
            perRowAdded: added(valueRowsIn(entries.map(asValuable), "EUR", rates)),
            subtotals: subtotals.map((day) => cents(day[0].amount)),
            subtotalsAdded: added(subtotals.map((day) => day[0].amount)),
        }).toStrictEqual({
            header: 15.91,
            perRowAdded: 15.91,
            subtotals: [7.74, 8.17],
            subtotalsAdded: 15.91,
        });
    });

    it("leaves a row already in the display currency untouched", () => {
        expect(
            valueRowsIn(
                [
                    {
                        amount: 12.4,
                        amountUsd: 13.78,
                        currency: "EUR",
                        dateKey: "2026-07-15",
                    },
                    {
                        amount: 5,
                        amountUsd: null,
                        currency: "GBP",
                        dateKey: "2026-07-15",
                    },
                ],
                "EUR",
                rates
            )
        ).toStrictEqual([12.4, 5]);
    });

    it("keeps income and expense apart, as the Log's cells do", () => {
        // Rounding all four as one cell gives €0.19; the Log rounds each direction separately and prints €0.20.
        const rows = [true, false].flatMap((income) =>
            Array.from({ length: 2 }, () => ({
                amount: 0.05,
                amountUsd: 0.05,
                currency: "USD",
                dateKey: "2026-07-15",
                income,
            }))
        );
        expect(added(valueRowsIn(rows, "EUR", rates))).toBe(0.2);
    });

    it("falls back to face value when no rate reaches the day", () => {
        expect(
            valueRowsIn(
                [
                    { amount: 10, amountUsd: 10, currency: "USD", dateKey: "2020-01-01" },
                    { amount: 20, amountUsd: 20, currency: "USD", dateKey: "2020-01-01" },
                ],
                "EUR",
                rates
            )
        ).toStrictEqual([10, 20]);
    });
});

describe("valueRowsIn in a three-decimal currency", () => {
    const bhdRates = buildRateTable([{ date: "2026-07-10", quote: "BHD", rate: 0.377 }]);
    const row = (amountUsd: number) => ({
        amount: amountUsd,
        amountUsd,
        currency: "USD",
        dateKey: "2026-07-10",
        income: false,
    });

    it("hands out rows that sum back to the cell's own conversion", () => {
        const values = valueRowsIn([row(3.274), row(3.274)], "BHD", bhdRates);

        // 6.548 USD is 2.468596 BHD, which is 2.469 at three decimals.
        expect(roundMoney(values[0] + values[1], 3)).toBe(2.469);
    });

    it("keeps the fils rather than rounding each row to cents", () => {
        const values = valueRowsIn([row(3.274)], "BHD", bhdRates);

        expect(values[0]).toBe(1.234);
    });
});
