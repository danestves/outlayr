import { describe, expect, it } from "@jest/globals";

import { detectCurrency } from "./detect-currency";

describe("detectCurrency", () => {
    it("reads an unambiguous symbol", () => {
        expect(detectCurrency("€12,40")).toBe("EUR");
        expect(detectCurrency("¥1,240")).toBe("JPY");
        expect(detectCurrency("₹250")).toBe("INR");
    });

    it("prefers an explicit ISO code, which cannot be ambiguous", () => {
        expect(detectCurrency("12.40 EUR")).toBe("EUR");
        expect(detectCurrency("CAD 25.00")).toBe("CAD");
        expect(detectCurrency("USD 8")).toBe("USD");
    });

    it("reads US$ and U$S as US dollars", () => {
        expect(detectCurrency("US$ 8,75")).toBe("USD");
        expect(detectCurrency("8,75 US$")).toBe("USD");
        expect(detectCurrency("U$S 25,00")).toBe("USD");
    });

    it("declines a shared symbol rather than guessing a country", () => {
        // The catalog has "$" on 22 currencies and "£" on 9.
        expect(detectCurrency("$12.40")).toBeNull();
        expect(detectCurrency("£5.00")).toBeNull();
        expect(detectCurrency("kr 99")).toBeNull();
    });

    it("declines when there is nothing to go on", () => {
        expect(detectCurrency("12.40")).toBeNull();
        expect(detectCurrency("")).toBeNull();
        expect(detectCurrency(null)).toBeNull();
        expect(detectCurrency(undefined)).toBeNull();
    });

    it("survives the spacing and signs a formatter emits", () => {
        expect(detectCurrency("  €  1.234,56  ")).toBe("EUR");
        expect(detectCurrency("-€12,40")).toBe("EUR");
        // A non-breaking space, as most locales put between the number and its symbol.
        expect(detectCurrency("1 234,56 €")).toBe("EUR");
    });
});
