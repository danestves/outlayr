import { buildRateTable } from "@outlayr/money/valuation";
import { describe, expect, it } from "vite-plus/test";

import { spendingCalendarEntries } from "./spending-calendar";
import type { SpendingCalendarRow } from "./spending-calendar";

const at = (year: number, month: number, day: number, hour = 0, minute = 0, second = 0): Date =>
    new Date(year, month - 1, day, hour, minute, second);

const NOW = at(2026, 8, 10, 23, 59, 59);

/** Mirrors the `LOCAL_DAY` key the query hands the aggregate. */
const plotKeyFor = (date: Date): string =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

function row({
    date = at(2026, 8, 10, 9),
    ...overrides
}: Partial<SpendingCalendarRow> & { date?: Date } = {}): SpendingCalendarRow {
    return {
        amount: 0,
        amountUsd: 0,
        currency: "USD",
        income: false,
        plotKey: plotKeyFor(date),
        valuationDate: new Date(Date.UTC(2026, 7, 10, 13)),
        ...overrides,
    };
}

describe("spendingCalendarEntries", () => {
    it("aggregates expenses on the same local day and returns dates oldest first", () => {
        const result = spendingCalendarEntries(
            [
                row({ amount: 12, amountUsd: 12, date: at(2026, 8, 10, 1) }),
                row({ amount: 30, amountUsd: 30, date: at(2026, 8, 10, 23, 30) }),
                row({ amount: 5, amountUsd: 5, date: at(2026, 8, 8, 12) }),
            ],
            { displayCurrency: "USD", rates: buildRateTable([]) },
            NOW
        );

        expect(result).toStrictEqual([
            { date: "2026-08-08", exact: true, value: 5 },
            { date: "2026-08-10", exact: true, value: 42 },
        ]);
    });

    it("excludes income and future rows", () => {
        const result = spendingCalendarEntries(
            [
                row({ amount: 42, amountUsd: 42 }),
                row({ amount: 100, amountUsd: 100, income: true }),
                row({ amount: 7, amountUsd: 7, date: at(2026, 8, 11) }),
            ],
            { displayCurrency: "USD", rates: buildRateTable([]) },
            NOW
        );

        expect(result).toStrictEqual([{ date: "2026-08-10", exact: true, value: 42 }]);
    });

    it("values mixed currencies at the rate for each row's date", () => {
        const rates = buildRateTable([
            { date: "2026-08-09", quote: "EUR", rate: 0.5 },
            { date: "2026-08-10", quote: "EUR", rate: 0.8 },
        ]);

        const result = spendingCalendarEntries(
            [
                row({
                    amount: 10,
                    amountUsd: 10,
                    currency: "USD",
                    date: at(2026, 8, 10, 9),
                    valuationDate: new Date(Date.UTC(2026, 7, 9, 12)),
                }),
                row({
                    amount: 10,
                    amountUsd: 10,
                    currency: "USD",
                    date: at(2026, 8, 10, 10),
                    valuationDate: new Date(Date.UTC(2026, 7, 10, 12)),
                }),
                row({
                    amount: 7,
                    amountUsd: 8.75,
                    currency: "EUR",
                    date: at(2026, 8, 10, 11),
                    valuationDate: new Date(Date.UTC(2026, 7, 10, 12)),
                }),
            ],
            { displayCurrency: "EUR", rates },
            NOW
        );

        expect(result).toStrictEqual([{ date: "2026-08-10", exact: true, value: 20 }]);
    });

    it("marks partially valued local days approximate while retaining their useful total", () => {
        const result = spendingCalendarEntries(
            [row({ amount: 10, amountUsd: 10, currency: "USD" }), row({ amount: 7, amountUsd: null, currency: "EUR" })],
            { displayCurrency: "CAD", rates: buildRateTable([]) },
            NOW
        );

        expect(result).toStrictEqual([{ date: "2026-08-10", exact: false, value: 17 }]);
    });

    it("assigns rounded values to local days deterministically across input order", () => {
        const previousTimezone = process.env.TZ;
        process.env.TZ = "America/Los_Angeles";

        try {
            const rows = [
                row({
                    amount: 1,
                    amountUsd: 0.004,
                    currency: "GBP",
                    date: at(2026, 8, 9, 23),
                    valuationDate: new Date(Date.UTC(2026, 7, 10, 0, 0)),
                }),
                row({
                    amount: 1,
                    amountUsd: 0.004,
                    currency: "GBP",
                    date: at(2026, 8, 10, 1),
                    valuationDate: new Date(Date.UTC(2026, 7, 10, 0, 0)),
                }),
            ];
            const valuation = {
                displayCurrency: "EUR",
                rates: buildRateTable([{ date: "2026-08-10", quote: "EUR", rate: 1.5 }]),
            };

            const expected = [
                { date: "2026-08-09", exact: true, value: 0.01 },
                { date: "2026-08-10", exact: true, value: 0 },
            ];

            expect(spendingCalendarEntries(rows, valuation, NOW)).toStrictEqual(expected);
            expect(spendingCalendarEntries([...rows].reverse(), valuation, NOW)).toStrictEqual(expected);
        } finally {
            if (previousTimezone === undefined) {
                delete process.env.TZ;
            } else {
                process.env.TZ = previousTimezone;
            }
        }
    });
});
