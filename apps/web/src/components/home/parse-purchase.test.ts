import { describe, expect, it } from "vite-plus/test";

import { parsePurchase } from "./parse-purchase";

describe("parsePurchase", () => {
    it("reads the hero example into its three fields", () => {
        expect(parsePurchase("blue bottle 4.50", "en")).toStrictEqual({
            amount: 4.5,
            category: "Coffee",
            currency: "USD",
            merchant: "Blue Bottle",
        });
    });

    it("reads a decimal comma and a localized merchant", () => {
        expect(parsePurchase("juan valdez 4,50", "es")).toStrictEqual({
            amount: 4.5,
            category: "Coffee",
            currency: "USD",
            merchant: "Juan Valdez",
        });
    });

    it("leaves unfinished fields empty instead of inventing them", () => {
        expect(parsePurchase("corner shop", "en")).toStrictEqual({
            amount: null,
            category: null,
            currency: "USD",
            merchant: "Corner Shop",
        });
    });

    it("keeps digits in a merchant name when a decimal amount follows", () => {
        expect(parsePurchase("7 Eleven 4.50", "en")).toStrictEqual({
            amount: 4.5,
            category: null,
            currency: "USD",
            merchant: "7 Eleven",
        });
    });

    it("uses the currency symbol from the amount", () => {
        expect(parsePurchase("nike €4.50", "en")).toStrictEqual({
            amount: 4.5,
            category: "Fashion",
            currency: "EUR",
            merchant: "Nike",
        });
    });

    it("normalizes natural spacing and punctuation around a known merchant", () => {
        expect(parsePurchase("blue  bottle for $4.50.", "en")).toStrictEqual({
            amount: 4.5,
            category: "Coffee",
            currency: "USD",
            merchant: "Blue Bottle",
        });
    });

    it("preserves the cast spelling of known merchants", () => {
        expect(parsePurchase("github 9", "en").merchant).toBe("GitHub");
        expect(parsePurchase("didi 9", "es").merchant).toBe("DiDi");
    });
});
