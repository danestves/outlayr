import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import { describe, expect, it } from "vite-plus/test";

import type { Category } from "@/data/categories-core";

import { formEntry } from "./entry-draft";
import type { FormEntryFacts } from "./entry-draft";
import { NO_RATE } from "./entry-rate";
import type { TransactionFormValues } from "./form-values";

const DAY = new Date("2026-03-10T15:00:00.000Z");
const END = new Date("2027-03-10T15:00:00.000Z");

const groceries: Category = {
    color: "#34C759",
    customName: false,
    dateCreated: new Date(0),
    deletedAt: null,
    emoji: null,
    icon: "ShoppingCart01",
    id: "groceries",
    income: false,
    name: "Groceries",
    parentId: null,
    preset: null,
    sortOrder: 0,
    updatedAt: new Date(0),
};

const suggested = { color: "#FF9500", emoji: null, icon: "Coffee01", name: "Coffee", parentName: null };

function typed(overrides: Partial<TransactionFormValues> = {}): TransactionFormValues {
    return {
        account: null,
        amount: "12.34",
        category: groceries,
        coefficient: 1,
        date: DAY,
        endDate: END,
        exchangeRateType: null,
        fee: null,
        feeCategoryId: null,
        hasEndDate: false,
        income: false,
        isSubscription: false,
        leadDays: null,
        merchant: "Farmatodo",
        merchantSeed: "",
        paidVia: null,
        pendingCategory: null,
        pendingTagNames: [],
        rateEntry: NO_RATE,
        recurringType: RECURRING_TYPE.monthly,
        tagIds: [],
        txCurrency: null,
        ...overrides,
    };
}

function known(overrides: Partial<FormEntryFacts> = {}): FormEntryFacts {
    return {
        allocations: [],
        details: null,
        fee: () => null,
        identity: { color: null, emoji: null, icon: null, photoColor: null, photoUri: null },
        ledgerCurrency: "USD",
        paidVia: null,
        receipt: undefined,
        siblings: [groceries],
        ...overrides,
    };
}

describe("formEntry", () => {
    it("rounds the typed amount to the entry currency's units, not the ledger's", () => {
        const yen = formEntry(typed({ amount: "1234.56", txCurrency: "JPY" }), known());
        expect([yen.amount, yen.draft.amount, yen.splits.decimals, yen.currency]).toStrictEqual([1235, 1235, 0, "JPY"]);

        const dollars = formEntry(typed({ amount: "1234.567" }), known());
        expect([dollars.amount, dollars.draft.amount, dollars.splits.decimals]).toStrictEqual([1234.57, 1234.57, 2]);
        expect([dollars.currency, dollars.draft.currency]).toStrictEqual(["USD", null]);
    });

    it("prices the card fee on the rounded amount, under the category's name when no merchant was typed", () => {
        const asked: [string, string | null, number][] = [];
        const fee: FormEntryFacts["fee"] = (label, categoryId, amount) => {
            asked.push([label, categoryId, amount]);
            return null;
        };
        formEntry(typed({ amount: "99.6", txCurrency: "JPY" }), known({ fee })).draft.fee?.("groceries");
        formEntry(typed({ merchant: "  " }), known({ fee })).draft.fee?.(null);
        expect(asked).toStrictEqual([
            ["Farmatodo", "groceries", 100],
            ["Groceries", null, 12.34],
        ]);
    });

    it("schedules a subscription, ends it only when an end date was asked for, and schedules nothing for a one-off", () => {
        const subscription = typed({
            coefficient: 2,
            isSubscription: true,
            leadDays: 3,
            recurringType: RECURRING_TYPE.weekly,
        });
        expect(formEntry(subscription, known()).draft.schedule).toStrictEqual({
            coefficient: 2,
            endDate: null,
            leadDays: 3,
            type: RECURRING_TYPE.weekly,
        });
        expect(formEntry({ ...subscription, hasEndDate: true }, known()).draft.schedule?.endDate).toBe(END);
        expect(formEntry(typed({ coefficient: 2, hasEndDate: true }), known()).draft.schedule).toBeNull();
    });

    it("reads the typed rate as a quote of the entry currency, which may not be the ledger's", () => {
        const rate = { exchangeRateType: "custom", rateEntry: { seed: null, text: "1.25" } } as const;
        expect(formEntry(typed({ ...rate, txCurrency: "EUR" }), known({ ledgerCurrency: "VES" })).draft).toMatchObject({
            exchangeRate: 0.8,
            exchangeRateType: "custom",
        });
        expect(
            formEntry(typed({ ...rate, txCurrency: "VES" }), known({ ledgerCurrency: "EUR" })).draft.exchangeRate
        ).toBe(1.25);
        expect(formEntry(typed(rate), known({ ledgerCurrency: "EUR" })).draft.exchangeRate).toBe(0.8);
        expect(formEntry(typed({ ...rate, exchangeRateType: null }), known()).draft.exchangeRate).toBeNull();
    });

    it("drops a split of one category and keeps a real one", () => {
        const whole = [{ amount: 12.34, categoryId: "groceries" }];
        const real = [...whole, { amount: 2, categoryId: "pharmacy" }];
        expect(formEntry(typed(), known({ allocations: whole })).splits.allocations).toStrictEqual([]);
        expect(formEntry(typed(), known({ allocations: real })).splits.allocations).toStrictEqual(real);
    });

    it("asks for the suggested category only when none was picked", () => {
        expect(formEntry(typed({ pendingCategory: suggested }), known()).pendingCategory).toBeUndefined();
        expect(formEntry(typed({ category: null, pendingCategory: suggested }), known()).pendingCategory).toStrictEqual(
            {
                siblings: [groceries],
                value: suggested,
            }
        );
    });
});
