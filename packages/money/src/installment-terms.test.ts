import { describe, expect, it } from "vite-plus/test";

import { startingDraft, termsFromPlan } from "./installment-terms";

const day = (year: number, month: number, date: number) => new Date(year, month - 1, date);
const row = (sequence: number, amount: number, dueDate: Date) => ({ amount, dueDate, sequence });

describe("termsFromPlan", () => {
    it("reads count, cadence and upfront share from a fortnightly plan", () => {
        const rows = [
            row(0, 144, day(2026, 10, 14)),
            row(1, 32, day(2026, 10, 28)),
            row(2, 32, day(2026, 11, 11)),
            row(3, 32, day(2026, 11, 25)),
        ];
        expect(termsFromPlan(rows)).toStrictEqual({ count: 3, every: "days14", upfront: { share: 0.6 } });
    });

    it("keeps a month clamped to its last day monthly", () => {
        const rows = [row(1, 50, day(2027, 1, 31)), row(2, 50, day(2027, 2, 28)), row(3, 50, day(2027, 3, 31))];
        expect(termsFromPlan(rows)).toStrictEqual({ count: 3, every: "monthly", upfront: { amount: 0 } });
    });

    it("leaves the cadence out when an edited date fits no option", () => {
        const rows = [row(1, 50, day(2026, 10, 28)), row(2, 50, day(2026, 11, 13)), row(3, 50, day(2026, 11, 25))];
        expect(termsFromPlan(rows)).toStrictEqual({ count: 3, upfront: { amount: 0 } });
    });
});

describe("startingDraft", () => {
    it("prefers the last plan on the account over the app's own terms", () => {
        const lastPlan = [row(1, 50, day(2026, 10, 1)), row(2, 50, day(2026, 11, 1))];
        const draft = startingDraft({ kind: "liability", name: "Klarna" }, lastPlan, "bank");
        expect([draft.count, draft.every, draft.upfront]).toStrictEqual([2, "monthly", { amount: 0 }]);
    });

    it("starts a pay-in-4 app at a quarter upfront and three fortnightly cuotas", () => {
        const draft = startingDraft({ kind: "liability", name: "Afterpay" }, [], "bank");
        expect([draft.count, draft.every, draft.upfront]).toStrictEqual([3, "days14", { share: 0.25 }]);
    });

    it("charges a card monthly with nothing upfront", () => {
        const draft = startingDraft({ kind: "liability", name: "Visa Banesco" }, [], "bank");
        expect([draft.count, draft.every, draft.upfront]).toStrictEqual([3, "monthly", { amount: 0 }]);
    });
});
