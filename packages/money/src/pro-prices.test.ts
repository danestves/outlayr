import { describe, expect, it } from "vite-plus/test";

import { allProPrices, proPrice, proPriceKey, stripeMinorUnits } from "./pro-prices";

describe("stripeMinorUnits", () => {
    it("follows Stripe's decimals, not ISO's", () => {
        expect(stripeMinorUnits({ amount: 7.99, currency: "USD" })).toBe(799);
        expect(stripeMinorUnits({ amount: 3760, currency: "CLP" })).toBe(3760);
        expect(stripeMinorUnits({ amount: 1.5, currency: "JOD" })).toBe(1500);
        expect(stripeMinorUnits({ amount: 45_300, currency: "ARS" })).toBe(4_530_000);
    });

    it("does not drift on amounts binary floats cannot hold", () => {
        expect(stripeMinorUnits({ amount: 4.07, currency: "USD" })).toBe(407);
        expect(stripeMinorUnits({ amount: 1.1, currency: "USD" })).toBe(110);
    });
});

describe("proPrice", () => {
    it("charges a USD-billed region its own amount and an unknown country the US one", () => {
        expect(proPriceKey(proPrice("VE", "monthly"))).toBe("pro_monthly_usd_390");
        expect(proPriceKey(proPrice("XX", "annual"))).toBe("pro_annual_usd_4999");
        expect(proPriceKey(proPrice(null, "lifetime"))).toBe("pro_lifetime_usd_12999");
    });
});

describe("allProPrices", () => {
    it("lists every price a country can be charged, once", () => {
        const keys = allProPrices().map(proPriceKey);
        expect(new Set(keys).size).toBe(keys.length);
        for (const country of ["US", "VE", "AR", "ES", "JP"]) {
            expect(keys).toContain(proPriceKey(proPrice(country, "annual")));
        }
    });
});
