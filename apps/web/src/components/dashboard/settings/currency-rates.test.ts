import { describe, expect, it } from "vite-plus/test";

import { crossRate, formatRate, usdRates } from "./currency-rates";

const row = (quote: string, date: string, rate: number, rateType = "official") => ({ date, quote, rate, rateType });

describe("usdRates", () => {
    it("keeps the newest official rate and ignores parallel ones", () => {
        const { latest, rate } = usdRates([
            row("EUR", "2026-10-30", 0.9),
            row("EUR", "2026-10-31", 0.92),
            row("EUR", "2026-11-01", 5, "parallel"),
        ]);
        expect(rate("EUR")).toBe(0.92);
        expect(latest).toBe("2026-10-31");
    });
});

describe("crossRate", () => {
    const { rate } = usdRates([row("EUR", "2026-10-31", 0.5), row("MXN", "2026-10-31", 18)]);

    it("converts through the dollar when neither side is USD", () => {
        expect(crossRate(rate, "EUR", "MXN")).toBe(36);
    });

    it("gives no rate for a currency it does not know", () => {
        expect(crossRate(rate, "USD", "XXX")).toBeNull();
    });
});

describe("formatRate", () => {
    it("keeps a rate below one from rounding to zero", () => {
        expect(formatRate(1 / 4000)).toBe("0.00025");
    });

    it("shows two decimals from one up", () => {
        expect(formatRate(4012.5)).toBe("4,012.50");
    });
});
