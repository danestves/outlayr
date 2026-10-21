import { describe, expect, it } from "@jest/globals";
import { canonicalUsd } from "@outlayr/money/canonical-usd";
import type { RateLookup } from "@outlayr/money/rates";

function lookupOf(rows: Record<string, number>, seen?: { calls: number }): RateLookup {
    return async (quote, _rateType, date) => {
        if (seen) {
            seen.calls += 1;
        }
        const rate = rows[quote];
        return rate === undefined ? null : { date, rate };
    };
}

const DATE = new Date("2026-07-15T12:00:00Z");

describe("canonicalUsd", () => {
    it("divides by the rate, because a rate is currency-per-USD", async () => {
        // 0.92 EUR per USD, so €92 is $100, not $84.64.
        const result = await canonicalUsd(lookupOf({ EUR: 0.92 }), {
            amount: 92,
            currency: "EUR",
            date: DATE,
            displayCurrency: "EUR",
        });
        expect(result.amountUsd).toBe(100);
        expect(result.exchangeRate).toBe(0.92);
        expect(result.exchangeRateType).toBe("official");
    });

    it("treats USD as already canonical and never asks for a rate", async () => {
        const seen = { calls: 0 };
        const result = await canonicalUsd(lookupOf({}, seen), {
            amount: 12.4,
            currency: "USD",
            date: DATE,
            displayCurrency: "USD",
        });
        expect(result).toStrictEqual({
            amountUsd: 12.4,
            exchangeRate: 1,
            exchangeRateType: null,
        });
        expect(seen.calls).toBe(0);
    });

    it("falls back to the display currency when the entry names none", async () => {
        const result = await canonicalUsd(lookupOf({ EUR: 0.5 }), {
            amount: 10,
            currency: null,
            date: DATE,
            displayCurrency: "EUR",
        });
        expect(result.amountUsd).toBe(20);
    });

    it("accepts the write with nulls when no rate is cached", async () => {
        const result = await canonicalUsd(lookupOf({ EUR: 0.8 }), {
            amount: 50,
            currency: "GBP",
            date: DATE,
            displayCurrency: "USD",
        });
        expect(result).toStrictEqual({
            amountUsd: null,
            exchangeRate: null,
            exchangeRateType: "official",
        });
    });

    it("accepts the write when the stored rate is unusable", async () => {
        const result = await canonicalUsd(lookupOf({ EUR: 0 }), {
            amount: 10,
            currency: "EUR",
            date: DATE,
            displayCurrency: "EUR",
        });
        expect(result.amountUsd).toBeNull();
    });

    it("freezes a selected custom currency-per-USD rate without consulting the provider", async () => {
        const seen = { calls: 0 };
        const result = await canonicalUsd(lookupOf({}, seen), {
            amount: 100,
            currency: "VES",
            date: DATE,
            displayCurrency: "VES",
            exchangeRate: 55.5,
            exchangeRateType: "custom",
        });
        expect(result).toStrictEqual({ amountUsd: 1.801802, exchangeRate: 55.5, exchangeRateType: "custom" });
        expect(seen.calls).toBe(0);
    });

    it("freezes an EUR (BCV) entry per dollar, without a EUR leg", async () => {
        const lookup: RateLookup = async (quote, rateType, date) => {
            const rows: Record<string, number> = {
                "EUR:official": 0.87428,
                "VES:eur_reference": 747.33,
            };
            const rate = rows[`${quote}:${rateType}`];
            return rate === undefined ? null : { date, rate };
        };
        const result = await canonicalUsd(lookup, {
            amount: 74_733,
            currency: "VES",
            date: DATE,
            displayCurrency: "VES",
            exchangeRateType: "eur_reference",
        });
        expect(result).toStrictEqual({ amountUsd: 100, exchangeRate: 747.33, exchangeRateType: "eur_reference" });
    });

    it("keeps a custom occurrence rate-needed when no actual rate was supplied", async () => {
        const result = await canonicalUsd(lookupOf({}), {
            amount: 100,
            currency: "VES",
            date: DATE,
            displayCurrency: "VES",
            exchangeRate: null,
            exchangeRateType: "custom",
        });
        expect(result).toStrictEqual({ amountUsd: null, exchangeRate: null, exchangeRateType: "custom" });
    });

    it("preserves a provider policy when its occurrence date has no cached rate", async () => {
        const result = await canonicalUsd(lookupOf({}), {
            amount: 100,
            currency: "VES",
            date: DATE,
            displayCurrency: "VES",
            exchangeRateType: "eur_reference",
        });
        expect(result).toStrictEqual({ amountUsd: null, exchangeRate: null, exchangeRateType: "eur_reference" });
    });

    it("forces USD to rate one with no rate type even when metadata was supplied", async () => {
        const result = await canonicalUsd(lookupOf({}), {
            amount: 100,
            currency: "USD",
            date: DATE,
            displayCurrency: "USD",
            exchangeRate: 55.5,
            exchangeRateType: "custom",
        });
        expect(result).toStrictEqual({ amountUsd: 100, exchangeRate: 1, exchangeRateType: null });
    });

    it("uses a positive supplied provider rate verbatim for CSV restoration", async () => {
        const seen = { calls: 0 };
        const result = await canonicalUsd(lookupOf({}, seen), {
            amount: 100,
            currency: "VES",
            date: DATE,
            displayCurrency: "VES",
            exchangeRate: 50,
            exchangeRateType: "eur_reference",
        });
        expect(result).toStrictEqual({ amountUsd: 2, exchangeRate: 50, exchangeRateType: "eur_reference" });
        expect(seen.calls).toBe(0);
    });

    it.each([
        ["non-finite amount", Number.POSITIVE_INFINITY, 50, "eur_reference" as const],
        ["unrepresentable custom conversion", Number.MAX_VALUE, Number.MIN_VALUE, "custom" as const],
    ])(
        "does not preserve a supplied rate after a %s validation failure",
        async (_case, amount, rate, exchangeRateType) => {
            const result = await canonicalUsd(lookupOf({}), {
                amount,
                currency: "VES",
                date: DATE,
                displayCurrency: "VES",
                exchangeRate: rate,
                exchangeRateType,
            });

            expect(result).toStrictEqual({ amountUsd: null, exchangeRate: null, exchangeRateType });
        }
    );

    it("rejects a supplied EUR-reference rate outside VES", async () => {
        const result = await canonicalUsd(lookupOf({ EUR: 0.8 }), {
            amount: 100,
            currency: "EUR",
            date: DATE,
            displayCurrency: "EUR",
            exchangeRate: 0.8,
            exchangeRateType: "eur_reference",
        });
        expect(result).toStrictEqual({ amountUsd: null, exchangeRate: null, exchangeRateType: "eur_reference" });
    });
});
