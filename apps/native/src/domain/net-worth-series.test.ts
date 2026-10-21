import { describe, expect, it } from "@jest/globals";
import { buildRateTable } from "@outlayr/money/valuation";

import type { PlottedCell } from "./goal-balance-series";
import { netWorthSeries } from "./net-worth-series";
import type { NetWorthSeriesAccount } from "./net-worth-series";

const NOW = new Date("2026-08-10T12:00:00Z");
const NO_RATES = buildRateTable([]);

function account(id: string, overrides: Partial<NetWorthSeriesAccount> = {}): NetWorthSeriesAccount {
    return {
        currency: "USD",
        id,
        initialBalance: 0,
        initialBalanceDate: new Date("2026-06-01T12:00:00Z"),
        ...overrides,
    };
}

function cell(overrides: Partial<PlottedCell>): PlottedCell {
    return {
        plotDay: overrides.dateKey ?? "2026-08-01",
        amount: 0,
        amountUsd: 0,
        count: 1,
        currencyCode: "USD",
        dateKey: "2026-08-01",
        income: false,
        unconvertedAmount: 0,
        unconvertedCount: 0,
        ...overrides,
    };
}

function valueAt(series: ReturnType<typeof netWorthSeries>, date: string): number {
    const point = series.find((candidate) => candidate.date === date);
    if (!point) {
        throw new Error(`Missing point for ${date}`);
    }
    return point.value;
}

describe("netWorthSeries", () => {
    it("has nothing to draw with no accounts", () => {
        expect(netWorthSeries([], new Map(), NO_RATES, NOW, "USD")).toStrictEqual([]);
    });

    it("nets a transfer's two legs to zero on the day it happened", () => {
        // The case that would make the chart contradict the accounts card: money
        // leaving one account and arriving in another is not a change in worth.
        const series = netWorthSeries(
            [account("a1", { initialBalance: 100 }), account("a2", { initialBalance: 0 })],
            new Map([
                ["a1", [cell({ amount: 40, amountUsd: 40, dateKey: "2026-08-05", income: false })]],
                ["a2", [cell({ amount: 40, amountUsd: 40, dateKey: "2026-08-05", income: true })]],
            ]),
            NO_RATES,
            NOW,
            "USD"
        );
        expect(valueAt(series, "2026-08-05")).toBe(100);
        expect(valueAt(series, "2026-08-10")).toBe(100);
    });

    it("carries an account forward on days its own series does not cover", () => {
        const series = netWorthSeries(
            [
                account("a1", { initialBalance: 100 }),
                account("a2", { initialBalance: 40, initialBalanceDate: new Date("2026-07-01T12:00:00Z") }),
            ],
            new Map(),
            NO_RATES,
            NOW,
            "USD"
        );
        // a1 opens first at 100, a2 joins at 140. The regression this guards is a
        // day where one account's series has no point and it silently drops out,
        // which would show up as a partial sum neither of those.
        expect(valueAt(series, "2026-08-10")).toBe(140);
        expect(series.every((point) => point.value === 100 || point.value === 140)).toBe(true);
    });

    it("marks a day approximate when any account could not be valued", () => {
        const series = netWorthSeries(
            [account("a1", { currency: "VES", initialBalance: 100 })],
            new Map([
                [
                    "a1",
                    [
                        cell({
                            amount: 10,
                            amountUsd: 0,
                            currencyCode: "EUR",
                            dateKey: "2026-08-05",
                            unconvertedCount: 1,
                        }),
                    ],
                ],
            ]),
            NO_RATES,
            NOW,
            "USD"
        );
        const point = series.find((candidate) => candidate.date === "2026-08-05");
        expect(point?.exact).toBe(false);
    });

    it("restates each day at its own rate, and a day older than every rate at the oldest", () => {
        const rates = buildRateTable([
            { date: "2026-07-01", quote: "EUR", rate: 2 },
            { date: "2026-08-01", quote: "EUR", rate: 4 },
        ]);
        const series = netWorthSeries(
            [account("eur", { currency: "EUR", initialBalance: 100 })],
            new Map(),
            rates,
            NOW,
            "USD"
        );
        expect(series.find((point) => point.date === "2026-06-15")).toStrictEqual({
            date: "2026-06-15",
            exact: false,
            value: 50,
        });
        expect(series.find((point) => point.date === "2026-08-10")).toStrictEqual({
            date: "2026-08-10",
            exact: true,
            value: 25,
        });
    });

    it("ends on today's local day at the accounts card's rate in a Caracas evening", () => {
        // 22:12 on 19 Oct in Caracas is 20 Oct in UTC, the day the card values at,
        // and that day's rate is already out.
        const rates = buildRateTable([
            { date: "2026-10-19", quote: "VES", rate: 100 },
            { date: "2026-10-20", quote: "VES", rate: 200 },
        ]);
        const series = netWorthSeries(
            [account("ves", { currency: "VES", initialBalance: 1000 })],
            new Map(),
            rates,
            new Date("2026-10-19T22:12:00-04:00"),
            "USD"
        );
        expect(series.at(-1)).toStrictEqual({ date: "2026-10-19", exact: true, value: 5 });
    });
});
