import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import { describe, expect, it } from "vite-plus/test";

import { buildTransactionInput } from "./transaction-form-save";
import type { TransactionSaveDraft } from "./transaction-form-save";

const BASE: TransactionSaveDraft = {
    accountId: "acc-1",
    amount: 1250,
    categoryId: "cat-1",
    coefficient: 3,
    currency: "USD",
    customColor: null,
    date: new Date(2026, 2, 10),
    details: "",
    emoji: null,
    endDate: new Date(2026, 5, 10),
    exchangeRate: null,
    exchangeRateType: null,
    hasEndDate: true,
    icon: "cup.and.saucer",
    imageColor: null,
    imageUri: null,
    income: false,
    isSubscription: false,
    leadDays: 2,
    note: "Coffee",
    recurringType: RECURRING_TYPE.weekly,
};

describe("buildTransactionInput", () => {
    it("strips every schedule field for a one-off, regardless of the leftover cadence state", () => {
        const input = buildTransactionInput(BASE);
        expect(input.onceRecurring).toBe(false);
        expect(input.recurringType).toBe(RECURRING_TYPE.none);
        expect(input.recurringCoefficient).toBe(1);
        expect(input.recurringEndDate).toBeNull();
        expect(input.reminderLeadDays).toBeNull();
    });

    it("carries the cadence, coefficient, end date and lead through for a subscription", () => {
        const input = buildTransactionInput({ ...BASE, isSubscription: true });
        expect(input.onceRecurring).toBe(true);
        expect(input.recurringType).toBe(RECURRING_TYPE.weekly);
        expect(input.recurringCoefficient).toBe(3);
        expect(input.recurringEndDate).toBe(BASE.endDate);
        expect(input.reminderLeadDays).toBe(2);
    });

    it("drops the end date for a subscription that has none, even with an endDate value staged", () => {
        const input = buildTransactionInput({
            ...BASE,
            hasEndDate: false,
            isSubscription: true,
        });
        expect(input.recurringEndDate).toBeNull();
    });

    it("clamps the coefficient to at least 1", () => {
        expect(buildTransactionInput({ ...BASE, coefficient: 0, isSubscription: true }).recurringCoefficient).toBe(1);
    });

    it("carries the selected rate type and actual rate into the transaction input", () => {
        const input = buildTransactionInput({
            ...BASE,
            exchangeRate: 55.5,
            exchangeRateType: "custom",
        });
        expect(input).toMatchObject({ exchangeRate: 55.5, exchangeRateType: "custom" });
    });

    it("keeps omitted rate metadata absent for an unrelated edit", () => {
        const { exchangeRate: _exchangeRate, exchangeRateType: _exchangeRateType, ...draft } = BASE;
        const input = buildTransactionInput(draft);
        expect(input).not.toHaveProperty("exchangeRate");
        expect(input).not.toHaveProperty("exchangeRateType");
    });
});
