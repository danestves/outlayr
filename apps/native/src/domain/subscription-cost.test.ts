import { describe, expect, it } from "@jest/globals";
import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import { monthlyChargeCount, monthlySubscriptionCost } from "@outlayr/money/subscription-cost";
import type { ScheduleCostEntry } from "@outlayr/money/subscription-cost";
import { buildRateTable } from "@outlayr/money/valuation";

const DAYS_PER_MONTH = 365 / 12;

function isClose(actual: number, expected: number) {
    return Math.abs(actual - expected) < 1e-9;
}

function schedule(
    amount: number,
    recurringType: number,
    recurringCoefficient = 1,
    extra: Partial<ScheduleCostEntry> = {}
): ScheduleCostEntry {
    return {
        amount,
        currency: "USD",
        income: false,
        recurringCoefficient,
        recurringType,
        ...extra,
    };
}

describe("normalizing one schedule to a month", () => {
    it("charges a non-recurring row nothing at all", () => {
        expect(monthlyChargeCount(RECURRING_TYPE.none, 1)).toBe(0);
    });

    it("reads a coefficient below one as every period, matching nextDate", () => {
        expect(monthlyChargeCount(RECURRING_TYPE.monthly, 0)).toBe(1);
        expect(monthlyChargeCount(RECURRING_TYPE.monthly, -3)).toBe(1);
        expect(
            isClose(monthlyChargeCount(RECURRING_TYPE.daily, 0.4), monthlyChargeCount(RECURRING_TYPE.daily, 1))
        ).toBeTruthy();
    });
});

describe("monthlySubscriptionCost", () => {
    it("weighs a daily coffee far above a yearly renewal that costs more per charge", () => {
        const coffee = schedule(5, RECURRING_TYPE.daily);
        const renewal = schedule(12, RECURRING_TYPE.yearly);

        const [coffeeOnly] = monthlySubscriptionCost([coffee], "USD");
        const [renewalOnly] = monthlySubscriptionCost([renewal], "USD");
        expect(isClose(coffeeOnly.amount, -(5 * DAYS_PER_MONTH))).toBeTruthy();
        expect(isClose(renewalOnly.amount, -1)).toBeTruthy();
        expect(Math.abs(coffeeOnly.amount) > Math.abs(renewalOnly.amount) * 100).toBeTruthy();

        const [both] = monthlySubscriptionCost([coffee, renewal], "USD");
        expect(isClose(both.amount, -(5 * DAYS_PER_MONTH + 1))).toBeTruthy();
        expect(both.transactionCount).toBe(2);
    });

    it("lets a retired row open no bucket of its own", () => {
        const buckets = monthlySubscriptionCost(
            [schedule(20, RECURRING_TYPE.monthly), schedule(999, RECURRING_TYPE.none, 1, { currency: "EUR" })],
            "USD"
        );
        expect(buckets).toStrictEqual([{ amount: -20, currencyCode: "USD", transactionCount: 1 }]);
    });

    it("still answers with a zero bucket when nothing recurs", () => {
        expect(monthlySubscriptionCost([schedule(999, RECURRING_TYPE.none)], "USD")).toStrictEqual([
            { amount: 0, currencyCode: "USD", transactionCount: 0 },
        ]);
    });

    it("keeps each currency in its own figure rather than adding them", () => {
        const buckets = monthlySubscriptionCost(
            [schedule(10, RECURRING_TYPE.monthly), schedule(240, RECURRING_TYPE.yearly, 1, { currency: "EUR" })],
            "USD"
        );
        expect(buckets).toHaveLength(2);
        expect(buckets.map((bucket) => [bucket.currencyCode, bucket.amount])).toStrictEqual([
            ["USD", -10],
            ["EUR", -20],
        ]);
    });

    it("leaves a recurring income out of the cost", () => {
        const buckets = monthlySubscriptionCost(
            [schedule(10, RECURRING_TYPE.monthly), schedule(3000, RECURRING_TYPE.monthly, 1, { income: true })],
            "USD"
        );
        expect(buckets.map((bucket) => [bucket.currencyCode, bucket.amount])).toStrictEqual([["USD", -10]]);
    });

    it("keeps a schedule on the day it ends, which still charges", () => {
        const endsToday = new Date(2026, 6, 20);
        const buckets = monthlySubscriptionCost(
            [schedule(1000, RECURRING_TYPE.monthly, 1, { recurringEndDate: endsToday })],
            "USD",
            undefined,
            new Date(2026, 6, 20, 9, 30)
        );

        expect(buckets).toStrictEqual([{ amount: -1000, currencyCode: "USD", transactionCount: 1 }]);
    });

    it("drops it the following day", () => {
        const buckets = monthlySubscriptionCost(
            [schedule(1000, RECURRING_TYPE.monthly, 1, { recurringEndDate: new Date(2026, 6, 20) })],
            "USD",
            undefined,
            new Date(2026, 6, 21, 0, 30)
        );

        expect(buckets).toStrictEqual([{ amount: 0, currencyCode: "USD", transactionCount: 0 }]);
    });

    it("converts the month's figure, not the single charge, at today's rate", () => {
        const rates = buildRateTable([{ date: "2026-07-01", quote: "EUR", rate: 0.9 }]);
        const buckets = monthlySubscriptionCost(
            [
                schedule(1200, RECURRING_TYPE.yearly, 1, {
                    amountUsd: 1200,
                    date: new Date(Date.UTC(2026, 6, 5, 12)),
                }),
            ],
            "EUR",
            rates
        );
        expect(buckets).toStrictEqual([{ amount: -90, currencyCode: "EUR", transactionCount: 1 }]);
    });

    it("converts a schedule first saved before the oldest rate held", () => {
        const rates = buildRateTable([{ date: "2026-07-01", quote: "EUR", rate: 0.9 }]);
        const buckets = monthlySubscriptionCost(
            [
                schedule(1200, RECURRING_TYPE.yearly, 1, {
                    amountUsd: 1200,
                    date: new Date(Date.UTC(2025, 10, 20, 12)),
                }),
            ],
            "EUR",
            rates,
            new Date(Date.UTC(2026, 9, 18, 12))
        );
        expect(buckets).toStrictEqual([{ amount: -90, currencyCode: "EUR", transactionCount: 1 }]);
    });
});
