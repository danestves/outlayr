import { describe, expect, it } from "vite-plus/test";

import { draftSchedule, newInstallmentDraft, overPrice, paidBeforeCount, planPrice } from "./installment-draft";

const day = (year: number, month: number, date: number) => new Date(year, month - 1, date);
const amounts = (rows: { amount: number }[] | null) => rows?.map((row) => row.amount);

describe("draftSchedule", () => {
    it("takes a Cashea 60% upfront and splits the rest over the cuotas", () => {
        const rows = draftSchedule(newInstallmentDraft("bank"), 240, day(2026, 10, 14), "USD");
        expect(amounts(rows)).toStrictEqual([144, 32, 32, 32]);
        expect(rows?.[1]?.dueDate).toStrictEqual(day(2026, 10, 28));
    });

    it("puts the cent the split cannot share in the last cuota", () => {
        const draft = { ...newInstallmentDraft(null), upfront: { amount: 0 } };
        expect(amounts(draftSchedule(draft, 100, day(2026, 10, 14), "USD"))).toStrictEqual([33.33, 33.33, 33.34]);
    });

    it("rounds a share of the price to the currency's cents", () => {
        const draft = { ...newInstallmentDraft("bank"), upfront: { share: 0.4 } };
        expect(amounts(draftSchedule(draft, 99.99, day(2026, 10, 14), "USD"))?.[0]).toBe(40);
    });

    it("keeps a typed cuota amount, so a plan with fees can add up to more than the price", () => {
        const draft = { ...newInstallmentDraft("bank"), each: 45 };
        expect(amounts(draftSchedule(draft, 240, day(2026, 10, 14), "USD"))).toStrictEqual([144, 45, 45, 45]);
    });

    it("makes nothing when the upfront already covers the price", () => {
        const draft = { ...newInstallmentDraft("bank"), upfront: { amount: 240 } };
        expect(draftSchedule(draft, 240, day(2026, 10, 14), "USD")).toBeNull();
    });
});

describe("paidBeforeCount", () => {
    const bought = day(2026, 9, 26);
    const draft = { ...newInstallmentDraft(null), upfront: { amount: 60 } };
    const schedule = draftSchedule(draft, 150, bought, "USD") ?? [];

    it("checks the cuotas already due, up to the first one that is not", () => {
        // Due Oct 10, Oct 24 and Nov 7.
        expect(paidBeforeCount(draft, schedule, day(2026, 10, 18))).toBe(1);
        expect(paidBeforeCount(draft, schedule, day(2026, 10, 10))).toBe(0);
        expect(paidBeforeCount(draft, schedule, day(2026, 12, 1))).toBe(3);
    });

    it("keeps a picked count, within the schedule", () => {
        expect(paidBeforeCount({ ...draft, paidBefore: 2 }, schedule, day(2026, 10, 18))).toBe(2);
        expect(paidBeforeCount({ ...draft, paidBefore: 5 }, schedule, day(2026, 10, 18))).toBe(3);
    });
});

describe("overPrice", () => {
    it("says how much the cuotas add beyond the price, and nothing when they fit it", () => {
        const draft = { ...newInstallmentDraft("bank"), each: 52, upfront: { share: 0.4 } };
        expect(overPrice(draftSchedule(draft, 240, day(2026, 10, 18), "USD") ?? [], 240, "USD")).toBe(12);
        expect(
            overPrice(draftSchedule(newInstallmentDraft("bank"), 100, day(2026, 10, 18), "USD") ?? [], 100, "USD")
        ).toBe(0);
    });
});

describe("planPrice", () => {
    const purchase = { amount: 21_853, currency: "VES", date: new Date(2026, 9, 18), rateType: "official" as const };

    it("prices a bolívar purchase on a dollar plan at the entry's rate, and waits for a rate", () => {
        expect(planPrice(purchase, "USD", { entryRate: 218.53, planPerUsd: 1 })).toBe(100);
        expect(planPrice({ ...purchase, amount: 1000 }, "USD", { entryRate: 218.53, planPerUsd: 1 })).toBe(4.58);
        expect(planPrice(purchase, "USD", { entryRate: null, planPerUsd: 1 })).toBeNull();
    });

    it("prices a plan in a third currency from the entry's own dollars, as the balance values it", () => {
        // Custom 230 against an official 218.53: the entry books $95.01, which is €87.41 at 0.92.
        expect(planPrice(purchase, "EUR", { entryRate: 230, planPerUsd: 0.92 })).toBe(87.41);
        expect(planPrice(purchase, "EUR", { entryRate: 230, planPerUsd: null })).toBeNull();
    });
});
