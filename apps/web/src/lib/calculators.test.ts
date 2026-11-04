import { describe, expect, it } from "vite-plus/test";

import {
    convertAtRate,
    formatAmount,
    installmentCost,
    parseAmount,
    settleUp,
    splitBudget,
    subscriptionCost,
} from "./calculators";

it.each([
    { code: "USD", minor: 123_456, text: "1,234.56" },
    { code: "USD", minor: 123_456, text: "1.234,56" },
    { code: "USD", minor: 150, text: "1,5" },
    { code: "USD", minor: 100_000, text: "1,000" },
    { code: "USD", minor: 4000, text: "$ 40" },
    { code: "USD", minor: 1000, text: "10." },
    { code: "USD", minor: 0, text: "" },
    { code: "CLP", minor: 1000, text: "1.000" },
])("reads '$text' in $code as $minor", ({ code, minor, text }) => {
    expect(parseAmount(text, code)).toBe(minor);
});

it.each([
    { code: "USD", minor: 123_456_789, text: "$1,234,567.89" },
    { code: "CLP", minor: 15_000, text: "$15,000" },
    { code: "PEN", minor: -400, text: "-PEN 4.00" },
])("formats $minor in $code as $text", ({ code, minor, text }) => {
    expect(formatAmount(minor, code)).toBe(text);
});

it.each([
    { expected: 8_911_054, from: "usd", minor: 10_000, rate: 891.1054 },
    { expected: 10_000, from: "local", minor: 8_911_054, rate: 891.1054 },
    { expected: 159_750, from: "usd", minor: 100, rate: 1597.5 },
    { expected: 0, from: "local", minor: 100, rate: 1570 },
    { expected: 1, from: "local", minor: 785, rate: 1570 },
] as const)("converts $minor from $from at $rate to $expected", ({ expected, from, minor, rate }) => {
    expect(convertAtRate(minor, rate, from)).toBe(expected);
});

it("counts a weekly charge 52 times a year, not 48", () => {
    const cost = subscriptionCost([
        { amount: 1000, cadence: "week" },
        { amount: 3000, cadence: "quarter" },
        { amount: 12_000, cadence: "year" },
    ]);
    expect(cost.yearly).toEqual([52_000, 12_000, 12_000]);
    expect(cost.total).toBe(76_000);
    expect(cost.monthly).toBe(6333);
});

describe(installmentCost, () => {
    it("reads 0% and a tie when the installments add up to the cash price and nothing else is set", () => {
        expect(installmentCost({ cadence: "month", count: 12, down: 0, payment: 10_000, price: 120_000 })).toEqual({
            annualRate: 0,
            answer: "same",
            cash: 120_000,
            extra: 0,
            present: 120_000,
            total: 120_000,
            verdict: "same",
        });
    });

    it("lets inflation eat the later payments of cuotas sin interés", () => {
        const { present, verdict } = installmentCost({
            cadence: "month",
            count: 6,
            down: 0,
            monthlyInflationPercent: 3,
            payment: 20_000,
            price: 120_000,
        });
        expect(present).toBe(108_344);
        expect(verdict).toBe("installments");
    });

    it.each([
        { inflation: 0, verdict: "cash" },
        { inflation: 1, verdict: "cash" },
        { inflation: 3, verdict: "same" },
        { inflation: 5, verdict: "installments" },
    ])("weighs a 10% cash discount against 6 cuotas sin interés at $inflation% inflation: $verdict", (row) => {
        const { verdict } = installmentCost({
            cadence: "month",
            cashDiscountPercent: 10,
            count: 6,
            down: 0,
            monthlyInflationPercent: row.inflation,
            payment: 20_000,
            price: 120_000,
        });
        expect(verdict).toBe(row.verdict);
    });

    it("compares extra, yearly rate and answer with the discounted cash price", () => {
        const { annualRate, answer, cash, extra } = installmentCost({
            cadence: "month",
            cashDiscountPercent: 10,
            count: 6,
            down: 0,
            payment: 20_000,
            price: 120_000,
        });
        expect(cash).toBe(108_000);
        expect(extra).toBe(12_000);
        expect(answer).toBe("more");
        expect(annualRate).toBeCloseTo(0.4418, 3);
    });

    it.each([
        { cadence: "month", payment: 110_000, present: 100_000 },
        { cadence: "twoWeeks", payment: 100_000, present: 95_696 },
        { cadence: "week", payment: 100_000, present: 97_825 },
    ] as const)(
        "discounts one $cadence payment by the inflation of its own period",
        ({ cadence, payment, present }) => {
            const cost = installmentCost({
                cadence,
                count: 1,
                down: 0,
                monthlyInflationPercent: 10,
                payment,
                price: 100_000,
            });
            expect(cost.present).toBe(present);
        }
    );

    it.each([
        { cashDiscountPercent: 0, down: 0, payment: 0 },
        { cashDiscountPercent: 100, down: 0, payment: 10_000 },
        { cashDiscountPercent: 0, down: 100_000, payment: 0 },
    ])("gives no verdict when there is nothing to finance: %o", (plan) => {
        const cost = installmentCost({
            cadence: "month",
            count: 1,
            monthlyInflationPercent: 5,
            price: 100_000,
            ...plan,
        });
        expect(cost.verdict).toBeNull();
    });

    it("counts the paid today part at face value", () => {
        const { present } = installmentCost({
            cadence: "month",
            count: 1,
            down: 50_000,
            monthlyInflationPercent: 10,
            payment: 55_000,
            price: 100_000,
        });
        expect(present).toBe(100_000);
    });

    it("compounds the rate per period into an effective annual rate", () => {
        const { annualRate, extra } = installmentCost({
            cadence: "month",
            count: 12,
            down: 0,
            payment: 8885,
            price: 100_000,
        });
        expect(extra).toBe(6620);
        expect(annualRate).toBeCloseTo(0.1268, 3);
    });

    it("keeps a positive rate when the extra is a cent on a long plan", () => {
        const payment = 166_666_666_667;
        const { annualRate } = installmentCost({
            cadence: "month",
            count: 600,
            down: 0,
            payment,
            price: payment * 600 - 1,
        });
        expect(annualRate).toBeGreaterThan(0);
    });

    it.each([
        { answer: "more", down: 100, payment: 105, price: 400 },
        { answer: "same", down: 100, payment: 100, price: 400 },
        { answer: "less", down: 100, payment: 90, price: 400 },
        { answer: "covered", down: 400, payment: 105, price: 400 },
        { answer: "paid", down: 400, payment: 0, price: 400 },
        { answer: "empty", down: 0, payment: 105, price: 0 },
        { answer: "empty", down: 100, payment: 0, price: 400 },
    ])("answers $answer for $down down and 3 × $payment on $price", ({ answer, ...plan }) => {
        expect(installmentCost({ cadence: "month", count: 3, ...plan }).answer).toBe(answer);
    });

    it("has no rate when the down payment covers the price", () => {
        expect(
            installmentCost({ cadence: "month", count: 0, down: 5000, payment: 0, price: 5000 }).annualRate
        ).toBeNull();
    });
});

it("splits a budget into parts that add back up to the income", () => {
    expect(splitBudget(100_001, "50-30-20")).toEqual([50_001, 30_000, 20_000]);
    for (const income of [99_999, 7, 0]) {
        for (const split of ["50-30-20", "60-20-20", "70-20-10"] as const) {
            expect(splitBudget(income, split).reduce((sum, part) => sum + part, 0)).toBe(income);
        }
    }
});

describe(settleUp, () => {
    it("has everyone who paid less send it to whoever paid more", () => {
        expect(settleUp([9000, 0, 3000]).transfers).toEqual([
            { amount: 4000, from: 1, to: 0 },
            { amount: 1000, from: 2, to: 0 },
        ]);
    });

    it.each([[[10_000, 0, 0]], [[1, 2, 3, 4, 5]], [[0, 0]], [[12_345, 6789, 0, 101, 99_999, 3]]])(
        "settles %j so everyone ends up paying their share",
        (paid) => {
            const { share, total, transfers } = settleUp(paid);
            const net = paid.map((amount, index) =>
                transfers.reduce(
                    (sum, transfer) =>
                        sum +
                        (transfer.from === index ? transfer.amount : 0) -
                        (transfer.to === index ? transfer.amount : 0),
                    amount
                )
            );
            expect(net).toEqual(share);
            expect(share.reduce((sum, part) => sum + part, 0)).toBe(total);
            expect(Math.max(...share) - Math.min(...share)).toBeLessThanOrEqual(1);
            expect(transfers.length).toBeLessThan(paid.length);
        }
    );
});
