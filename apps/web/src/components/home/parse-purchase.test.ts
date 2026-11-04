import { describe, expect, it } from "vite-plus/test";

import { parsePurchase } from "./parse-purchase";

describe("parsePurchase", () => {
    it("reads the hero example into its three fields", () => {
        expect(parsePurchase("blue bottle 4.50", "en")).toStrictEqual({
            amount: 4.5,
            category: "Coffee",
            merchant: "Blue Bottle",
        });
    });

    it("reads a decimal comma and a localized merchant", () => {
        expect(parsePurchase("juan valdez 4,50", "es")).toStrictEqual({
            amount: 4.5,
            category: "Coffee",
            merchant: "Juan Valdez",
        });
    });

    it("leaves unfinished fields empty instead of inventing them", () => {
        expect(parsePurchase("corner shop", "en")).toStrictEqual({
            amount: null,
            category: null,
            merchant: "Corner Shop",
        });
    });
});
