import { describe, expect, it } from "vite-plus/test";

import { proPrices } from "./pro-prices";

describe("proPrices", () => {
    it("falls back to US prices for unknown or missing countries", () => {
        for (const country of [null, "US", "XX", "T1"]) {
            const prices = proPrices(country, "en");
            expect(prices.country).toBeNull();
            expect(`${prices.monthly.whole}${prices.monthly.fraction}`).toBe("$9.99");
            expect(prices.yearly).toBe("$59.99");
        }
    });

    it("splits the cents off at the decimal, not at a group separator", () => {
        expect(proPrices("ES", "es").monthly).toEqual({ fraction: ",99 €", whole: "7" });
        expect(proPrices("CO", "es").monthly).toEqual({ fraction: "", whole: "$ 13.900" });
    });

    it("writes US prices in Spanish the way the FAQ does", () => {
        const prices = proPrices(null, "es");
        expect(`${prices.monthly.whole}${prices.monthly.fraction}`).toBe("US$9.99");
        expect(prices.once).toBe("US$199.99");
    });
});
