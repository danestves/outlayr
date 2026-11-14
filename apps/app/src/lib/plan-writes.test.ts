import { fixedOffset } from "@outlayr/money/ledger-zone";
import { describe, expect, it } from "vite-plus/test";

import { planPurchase, purchaseInInstallments } from "./plan-writes";

const NOW = Date.UTC(2026, 10, 8, 15);
const DAY = 86_400_000;
const HOUR = 3_600_000;

function rows(paidBefore: number, offsetAt = fixedOffset(0)) {
    let next = 0;
    return purchaseInInstallments(
        { books: { exchangeRates: [] }, offsetAt },
        {
            accountId: "card",
            categoryId: null,
            categoryName: null,
            currency: "USD",
            name: "Sony headphones",
            paidBefore,
            price: 600,
            purchasedAt: NOW - 30 * DAY,
            schedule: [
                { amount: 100, dueDate: new Date(NOW - 30 * DAY), sequence: 0 },
                { amount: 250, dueDate: new Date(NOW - 10 * DAY), sequence: 1 },
                { amount: 250, dueDate: new Date(NOW + 4 * DAY), sequence: 2 },
            ],
        },
        () => {
            next += 1;
            return `id-${next}`;
        },
        NOW
    );
}

describe("purchaseInInstallments", () => {
    it("charges the whole price to the card and links the plan to that charge", () => {
        const all = rows(0);
        const charge = all.find((row) => row.table === "transactions");
        const plan = all.find((row) => row.table === "installmentPlans");
        expect(charge?.fields).toMatchObject({ accountId: "card", amount: 600, amountUsd: 600, income: false });
        expect(plan?.fields).toMatchObject({ accountId: "card", transactionId: charge?.localId });
    });

    it("pays the upfront from outside on the purchase day, and only the installments already settled", () => {
        const paid = (count: number) =>
            rows(count).flatMap((row) => (row.table === "outsidePayments" ? [row.fields] : []));
        expect(paid(0)).toStrictEqual([{ amount: 100, amountUsd: 100, date: NOW - 30 * DAY, planId: "id-1" }]);
        expect(paid(1).at(-1)).toStrictEqual({ amount: 250, amountUsd: 250, date: NOW - 10 * DAY, planId: "id-1" });
    });

    it("files the charge on the ledger's day and month, not the browser's", () => {
        const charge = rows(0, fixedOffset(14 * HOUR)).find((row) => row.table === "transactions");
        expect(charge?.fields).toMatchObject({
            day: Date.parse("2026-10-09T10:00:00Z"),
            month: Date.parse("2026-09-30T10:00:00Z"),
        });
    });

    it("never dates an outside payment in the future", () => {
        const dates = rows(2).flatMap((row) => (row.table === "outsidePayments" ? [row.fields.date] : []));
        expect(Math.max(...dates)).toBe(NOW);
    });
});

describe("planPurchase", () => {
    const choices = {
        count: 5,
        currency: "USD",
        each: null,
        every: "days14",
        firstDue: null,
        now: new Date(2026, 10, 8, 15),
        price: 600,
        upfront: 100,
    } as const;

    it("splits what the upfront leaves and flags an amount over the price", () => {
        expect(planPurchase(choices)).toMatchObject({ over: 0, paidNow: 100, split: 100, total: 600 });
        expect(planPurchase({ ...choices, each: 125 })).toMatchObject({ over: 125, split: null, total: 725 });
    });

    it("counts installments already due as paid when the first due day is in the past", () => {
        const late = planPurchase({ ...choices, firstDue: new Date(2026, 9, 1) });
        expect(late.paidBefore).toBe(3);
        expect(late.paidNow).toBe(400);
        expect(late.ahead.map((row) => row.sequence)).toStrictEqual([4, 5]);
    });

    it("refuses an upfront that leaves nothing to split", () => {
        expect(planPurchase({ ...choices, upfront: 600 })).toMatchObject({ schedule: null, upfrontTooHigh: true });
    });
});
