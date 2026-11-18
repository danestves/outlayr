import { describe, expect, it } from "vite-plus/test";

import { proPrices } from "./pro-prices";

describe("proPrices", () => {
    it("falls back to US prices for unknown or missing countries", () => {
        for (const country of [null, "US", "XX", "T1"]) {
            const prices = proPrices(country, "en");
            expect(prices.country).toBeNull();
            expect(`${prices.monthly.whole}${prices.monthly.fraction}`).toBe("$7.99");
            expect(prices.yearly).toBe("$49.99");
        }
    });

    it("splits the cents off at the decimal, not at a group separator", () => {
        expect(proPrices("ES", "es").monthly).toEqual({ fraction: ",99 €", whole: "5" });
        expect(proPrices("CO", "es").monthly).toEqual({ fraction: "", whole: "$ 9.650" });
    });

    it("writes US prices in Spanish the way the FAQ does", () => {
        const prices = proPrices(null, "es");
        expect(`${prices.monthly.whole}${prices.monthly.fraction}`).toBe("US$7.99");
        expect(prices.once).toBe("US$129.99");
    });
});
