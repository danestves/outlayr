import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { buildRateTable } from "@outlayr/money/valuation";
import { describe, expect, it } from "vite-plus/test";

import { accountBalanceSeries } from "./account-balance-series";
import type { AccountBalanceSeriesAccount } from "./account-balance-series";
import { formatDayMonth } from "./dates";
import type { PlottedCell } from "./goal-balance-series";

const NOW = new Date("2026-08-10T12:00:00Z");
const NO_RATES = buildRateTable([]);

function account(overrides: Partial<AccountBalanceSeriesAccount> = {}): AccountBalanceSeriesAccount {
    return {
        currency: "USD",
        initialBalance: 0,
        initialBalanceDate: new Date("2026-08-10T12:00:00Z"),
        ...overrides,
    };
}

const inNewYork = (...args: number[]): string =>
    execFileSync(
        process.execPath,
        ["--import", "tsx", join(import.meta.dirname, "dst-probe.ts"), "balance-series", ...args.map(String)],
        {
            encoding: "utf-8",
            env: { ...process.env, TZ: "America/New_York" },
        }
    );

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

function pointAt(series: ReturnType<typeof accountBalanceSeries>, date: string) {
    const point = series.find((candidate) => candidate.date === date);
    if (!point) {
        throw new Error(`Missing point for ${date}`);
    }
    return point;
}

describe("accountBalanceSeries", () => {
    it("applies the initial balance on the local day it was stamped", () => {
        const series = accountBalanceSeries(
            account({ initialBalance: 100, initialBalanceDate: new Date("2026-08-05T23:30:00-04:00") }),
            [],
            NO_RATES,
            NOW
        );

        expect(series[0]).toMatchObject({ date: "2026-08-05", exact: true, value: 100 });
    });

    it("ends on today's local day in a Caracas evening, with tonight's entry on it", () => {
        // 22:12 on 19 Oct in Caracas is already 20 Oct in UTC.
        const evening = new Date("2026-10-19T22:12:00-04:00");
        const series = accountBalanceSeries(
            account({ initialBalance: 100, initialBalanceDate: new Date("2026-10-01T12:00:00-04:00") }),
            [cell({ amount: 30, amountUsd: 30, dateKey: "2026-10-20", plotDay: "2026-10-19" })],
            NO_RATES,
            evening
        );

        expect(series.slice(-2)).toMatchObject([
            { date: "2026-10-18", value: 100 },
            { date: "2026-10-19", value: 70 },
        ]);
        expect(formatDayMonth(series.at(-1)?.date ?? "", "en")).toBe("19 Oct");
    });

    it("ends on today's local day across a clock change", () => {
        // 23:30 on 1 Nov 2026 in New York, the night clocks fell back: 04:30 on 2 Nov in UTC.
        expect(JSON.parse(inNewYork(2026, 10, 1, 23, 30, 2026, 10, 1, 21, 0))).toStrictEqual({
            last: { date: "2026-11-01", exact: true, value: -30 },
            length: 182,
        });
    });

    it("adds income and subtracts expenses on their cell dates", () => {
        const series = accountBalanceSeries(
            account({ initialBalance: 100, initialBalanceDate: new Date("2026-08-01T12:00:00Z") }),
            [
                cell({ amount: 50, amountUsd: 50, dateKey: "2026-08-03", income: true }),
                cell({ amount: 20, amountUsd: 20, dateKey: "2026-08-06", income: false }),
            ],
            NO_RATES,
            NOW
        );

        expect(pointAt(series, "2026-08-03")).toMatchObject({ value: 150 });
        expect(pointAt(series, "2026-08-06")).toMatchObject({ value: 130 });
    });

    it("values mixed-currency cells with their rate-date and preserves exactness", () => {
        const rates = buildRateTable([{ date: "2026-08-01", quote: "EUR", rate: 0.8 }]);
        const series = accountBalanceSeries(
            account({
                currency: "EUR",
                initialBalance: 100,
                initialBalanceDate: new Date("2026-08-01T12:00:00Z"),
            }),
            [cell({ amount: 10, amountUsd: 10, dateKey: "2026-08-05", income: false })],
            rates,
            NOW
        );

        expect(pointAt(series, "2026-08-05")).toMatchObject({ exact: true, value: 92 });
    });

    it("uses the rate available on the cell date instead of a later rate", () => {
        const rates = buildRateTable([
            { date: "2026-08-01", quote: "EUR", rate: 0.8 },
            { date: "2026-08-05", quote: "EUR", rate: 0.5 },
        ]);
        const series = accountBalanceSeries(
            account({
                currency: "EUR",
                initialBalance: 100,
                initialBalanceDate: new Date("2026-08-01T12:00:00Z"),
            }),
            [cell({ amount: 10, amountUsd: 10, dateKey: "2026-08-02", income: false })],
            rates,
            NOW
        );

        expect(pointAt(series, "2026-08-02")).toMatchObject({ exact: true, value: 92 });
    });

    it("marks later points inexact after cells have no usable rate or unconverted amounts", () => {
        const series = accountBalanceSeries(
            account({
                currency: "VES",
                initialBalance: 100,
                initialBalanceDate: new Date("2026-08-01T12:00:00Z"),
            }),
            [
                cell({ amount: 7, amountUsd: 10, currencyCode: "EUR", dateKey: "2026-08-02", income: false }),
                cell({
                    amount: 12,
                    amountUsd: 10,
                    currencyCode: "EUR",
                    dateKey: "2026-08-03",
                    income: true,
                    unconvertedAmount: 2,
                    unconvertedCount: 1,
                }),
            ],
            NO_RATES,
            NOW
        );

        expect(pointAt(series, "2026-08-02")).toMatchObject({ exact: false, value: 100 });
        expect(pointAt(series, "2026-08-03")).toMatchObject({ exact: false, value: 100 });
    });

    it("folds the opening balance and cells before the 182-day window into its first point", () => {
        const series = accountBalanceSeries(
            account({ initialBalance: 100, initialBalanceDate: new Date("2026-01-01T12:00:00Z") }),
            [
                cell({ amount: 20, amountUsd: 20, dateKey: "2026-01-02", income: true }),
                cell({ amount: 5, amountUsd: 5, dateKey: "2026-01-03", income: false }),
            ],
            NO_RATES,
            NOW
        );

        expect(series[0]).toMatchObject({ date: "2026-02-10", exact: true, value: 115 });
    });

    it("folds in-window cells before a recent opening into its first visible balance", () => {
        const series = accountBalanceSeries(
            account({ initialBalance: 100, initialBalanceDate: new Date("2026-08-06T12:00:00Z") }),
            [cell({ amount: 20, amountUsd: 20, dateKey: "2026-08-03", income: false })],
            NO_RATES,
            NOW
        );

        expect(series[0]).toMatchObject({ date: "2026-08-06", exact: true, value: 80 });
    });

    it("keeps an empty account as an exact zero-valued 182-day series", () => {
        const series = accountBalanceSeries(account(), [], NO_RATES, NOW);

        expect(series).toHaveLength(182);
        expect(series[0]).toMatchObject({ date: "2026-02-10", exact: true, value: 0 });
        expect(series.at(-1)).toMatchObject({ date: "2026-08-10", exact: true, value: 0 });
    });

    it("ends today, drawing an opening stamped later on today's point", () => {
        const series = accountBalanceSeries(
            account({ initialBalance: 100, initialBalanceDate: new Date("2026-08-11T12:00:00Z") }),
            [],
            NO_RATES,
            NOW
        );

        expect(series).toHaveLength(1);
        expect(series[0]).toMatchObject({ date: "2026-08-10", value: 100 });
    });
});
