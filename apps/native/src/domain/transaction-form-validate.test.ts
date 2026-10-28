import { describe, expect, it } from "vite-plus/test";

import { TRANSACTION_FORM_ERROR, transactionFormErrors } from "./transaction-form-validate";

const CATEGORY = { id: "cat_1" };
const PENDING = { name: "Coffee" };
const VALID_VALUES = {
    amount: "1200",
    category: CATEGORY,
    currency: "VES",
    exchangeRate: null,
    exchangeRateType: "official" as const,
    pendingCategory: null,
};

describe("transactionFormErrors", () => {
    it("returns null when the amount is positive and a category is chosen", () => {
        expect(transactionFormErrors(VALID_VALUES)).toBeNull();
    });

    it("accepts a pending category in place of a saved one", () => {
        expect(
            transactionFormErrors({
                ...VALID_VALUES,
                category: null,
                pendingCategory: PENDING,
            })
        ).toBeNull();
    });

    it("flags an empty amount", () => {
        expect(
            transactionFormErrors({
                ...VALID_VALUES,
                amount: "",
            })
        ).toStrictEqual({ fields: { amount: TRANSACTION_FORM_ERROR.amountRequired } });
    });

    it("flags a zero amount", () => {
        expect(
            transactionFormErrors({
                ...VALID_VALUES,
                amount: "0",
            })
        ).toStrictEqual({ fields: { amount: TRANSACTION_FORM_ERROR.amountRequired } });
    });

    it("flags a missing category", () => {
        expect(
            transactionFormErrors({
                ...VALID_VALUES,
                category: null,
            })
        ).toStrictEqual({
            fields: { category: TRANSACTION_FORM_ERROR.categoryRequired },
        });
    });

    it("lets a missing category through when the queue will look it up", () => {
        expect(
            transactionFormErrors({
                ...VALID_VALUES,
                category: null,
                categoryDeferred: true,
            })
        ).toBeNull();
    });

    it("flags both when the entry is empty", () => {
        expect(
            transactionFormErrors({
                ...VALID_VALUES,
                amount: "",
                category: null,
            })
        ).toStrictEqual({
            fields: {
                amount: TRANSACTION_FORM_ERROR.amountRequired,
                category: TRANSACTION_FORM_ERROR.categoryRequired,
            },
        });
    });

    it("accepts EUR-reference only for VES", () => {
        expect(transactionFormErrors({ ...VALID_VALUES, exchangeRateType: "eur_reference" })).toBeNull();
        expect(
            transactionFormErrors({
                ...VALID_VALUES,
                currency: "EUR",
                exchangeRateType: "eur_reference",
            })
        ).toStrictEqual({ fields: { exchangeRate: TRANSACTION_FORM_ERROR.eurReferenceRequiresVes } });
    });

    it.each([null, 0, Number.NaN])(
        "rejects custom when the actual rate is blank zero negative or non-finite (%s)",
        (exchangeRate) => {
            expect(transactionFormErrors({ ...VALID_VALUES, exchangeRate, exchangeRateType: "custom" })).toStrictEqual({
                fields: { exchangeRate: TRANSACTION_FORM_ERROR.customRateRequired },
            });
        }
    );

    it("accepts a finite positive custom actual rate", () => {
        expect(transactionFormErrors({ ...VALID_VALUES, exchangeRate: 55.5, exchangeRateType: "custom" })).toBeNull();
    });

    it("ignores all rate validation for USD", () => {
        expect(
            transactionFormErrors({
                ...VALID_VALUES,
                currency: "USD",
                exchangeRate: -1,
                exchangeRateType: "custom",
            })
        ).toBeNull();
    });
});
