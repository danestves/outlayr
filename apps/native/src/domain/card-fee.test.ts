import { describe, expect, it, test } from "vite-plus/test";

import { cardFeeAmount, cardFeeBase, cardFeeOf, feeDraftOf, formatFeeRate } from "./card-fee";

describe("cardFeeAmount", () => {
    it.each([[12.53, 0.035, 0.44]])("charges %d at %d as the bank did, %d", (base, rate, fee) => {
        expect(cardFeeAmount({ kind: "percent", rate }, base, "USD")).toBe(fee);
    });

    it("keeps a typed amount as typed", () => {
        expect(cardFeeAmount({ amount: 0.5, currency: "USD", kind: "amount" }, 12.53, "USD")).toBe(0.5);
    });
});

describe("cardFeeOf", () => {
    it("reads a typed percent as a fraction", () => {
        expect(cardFeeOf({ kind: "typed", text: "3.5", unit: "percent" })).toStrictEqual({
            kind: "percent",
            rate: 0.035,
        });
    });

    it("treats an empty keypad as no fee", () => {
        expect(cardFeeOf({ currency: "USD", kind: "typed", text: "", unit: "amount" })).toBeNull();
    });
});

test("formats a rate with the language's decimal", () => {
    expect(formatFeeRate(0.035, "en")).toBe("3.5%");
    expect(formatFeeRate(0.01, "en")).toBe("1%");
});

test("opens a saved fee as the draft it was saved from", () => {
    expect(feeDraftOf({ amount: 0.44, currency: "USD", feeRate: 0.035 })).toStrictEqual({
        kind: "percent",
        rate: 0.035,
    });
    expect(feeDraftOf({ amount: 2, currency: "EUR", feeRate: null })).toStrictEqual({
        currency: "EUR",
        kind: "typed",
        text: "2",
        unit: "amount",
    });
    expect(feeDraftOf(null)).toStrictEqual({ kind: "none" });
});

describe("cardFeeBase", () => {
    const eurToUsd = (amount: number) => amount * 1.1485;

    it("takes a same-currency charge as it is", () => {
        expect(cardFeeBase(10, { card: "USD", entry: "USD" }, eurToUsd, null)).toBe(10);
    });

    it("converts a foreign charge into a USD card's dollars", () => {
        expect(cardFeeBase(10.91, { card: "USD", entry: "EUR" }, eurToUsd, null)).toBe(12.53);
    });

    it("carries a foreign charge through USD into a non-USD card's own currency", () => {
        expect(cardFeeBase(10, { card: "EUR", entry: "USD" }, eurToUsd, 0.87)).toBe(8.7);
    });

    it.each([0, -10])("has no base for a charge of %d", (amount) => {
        expect(cardFeeBase(amount, { card: "USD", entry: "USD" }, eurToUsd, null)).toBeNull();
    });

    it("has no base while a rate is missing", () => {
        expect(cardFeeBase(10, { card: "EUR", entry: "USD" }, eurToUsd, null)).toBeNull();
        expect(cardFeeBase(10.91, { card: "USD", entry: "EUR" }, () => null, null)).toBeNull();
    });
});
