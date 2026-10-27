import * as Effect from "effect/Effect";
import { describe, expect, it } from "vite-plus/test";

import {
    assertFiniteNumber,
    assertOptionalFiniteNumber,
    assertOptionalValidEpochMs,
    assertValidEpochMs,
} from "./assert";
import { utcDateString } from "./dates";
import { MoneyValidationError } from "./errors";
import { makeRateLookup } from "./fixtures";
import { computeAmountUSD, resolveEntryRate } from "./rates";

const FINITE_PATTERN = /amountUSD must be a finite number/;
const EPOCH_PATTERN = /epoch-milliseconds/;
const CUSTOM_REQUIRED_PATTERN = /customRate is required/;
const CUSTOM_POSITIVE_PATTERN = /customRate must be a positive number/;
const CUSTOM_ONLY_PATTERN = /customRate is only allowed/;
const EUR_VES_ONLY_PATTERN = /eur_reference rates are only available for VES/;
const NO_MARKET_RATE_PATTERN = /No official rate available for VES on 2020-01-01/;
const RESOLVED_RATE_POSITIVE_PATTERN = /Resolved official rate for VES on .* must be a positive number/;

describe(utcDateString, () => {
    it("derives the UTC calendar date from an epoch", () => {
        expect(utcDateString(Date.UTC(2026, 5, 30, 23, 59))).toBe("2026-06-30");
        expect(utcDateString(Date.UTC(2020, 0, 1, 0, 0))).toBe("2020-01-01");
    });
});

describe("finite / epoch assertions", () => {
    it("throws MoneyValidationError for non-finite numbers", () => {
        expect(() => assertFiniteNumber(Number.NaN, "amountUSD")).toThrow(MoneyValidationError);
        expect(() => assertFiniteNumber(Number.POSITIVE_INFINITY, "amountUSD")).toThrow(FINITE_PATTERN);
    });

    it("treats absent optional values as valid", () => {
        expect(() => assertOptionalFiniteNumber(undefined, "x")).not.toThrow();
        expect(() => assertOptionalValidEpochMs(undefined, "occurredAt")).not.toThrow();
        expect(() => assertOptionalFiniteNumber(Number.NaN, "x")).toThrow(MoneyValidationError);
    });

    it("rejects epoch magnitudes Date cannot represent", () => {
        expect(() => assertValidEpochMs(8.7e15, "updatedAt")).toThrow(EPOCH_PATTERN);
        expect(() => assertValidEpochMs(Date.UTC(2020, 0, 1), "updatedAt")).not.toThrow();
    });
});

describe(resolveEntryRate, () => {
    const lookup = makeRateLookup([
        { date: "2026-06-01", quote: "VES", rate: 40, rateType: "official" },
        {
            date: "2026-06-01",
            quote: "VES",
            rate: 747.33,
            rateType: "eur_reference",
        },
    ]);

    it("returns a positive custom rate verbatim", async () => {
        await expect(Effect.runPromise(resolveEntryRate(lookup, "VES", "custom", 55.5, "2026-06-30"))).resolves.toBe(
            55.5
        );
    });

    it("requires a customRate for the custom type", async () => {
        await expect(
            Effect.runPromise(resolveEntryRate(lookup, "VES", "custom", undefined, "2026-06-30"))
        ).rejects.toThrow(CUSTOM_REQUIRED_PATTERN);
    });

    it("rejects a non-positive custom rate", async () => {
        await expect(Effect.runPromise(resolveEntryRate(lookup, "VES", "custom", 0, "2026-06-30"))).rejects.toThrow(
            CUSTOM_POSITIVE_PATTERN
        );
    });

    it("rejects a customRate supplied with a market type", async () => {
        await expect(Effect.runPromise(resolveEntryRate(lookup, "VES", "official", 10, "2026-06-30"))).rejects.toThrow(
            CUSTOM_ONLY_PATTERN
        );
    });

    it("resolves a market rate on the effective date", async () => {
        await expect(
            Effect.runPromise(resolveEntryRate(lookup, "VES", "official", undefined, "2026-06-30"))
        ).resolves.toBe(40);
    });

    it("rejects eur_reference for a non-VES currency", async () => {
        await expect(
            Effect.runPromise(resolveEntryRate(lookup, "COP", "eur_reference", undefined, "2026-06-30"))
        ).rejects.toThrow(EUR_VES_ONLY_PATTERN);
    });

    it("throws when no market rate is available", async () => {
        await expect(
            Effect.runPromise(resolveEntryRate(lookup, "VES", "official", undefined, "2020-01-01"))
        ).rejects.toThrow(NO_MARKET_RATE_PATTERN);
    });

    it("rejects a resolved market rate that is zero or negative (S1)", async () => {
        const badLookup = makeRateLookup([{ date: "2026-06-01", quote: "VES", rate: 0, rateType: "official" }]);
        await expect(
            Effect.runPromise(resolveEntryRate(badLookup, "VES", "official", undefined, "2026-06-30"))
        ).rejects.toThrow(RESOLVED_RATE_POSITIVE_PATTERN);
        await expect(
            Effect.runPromise(resolveEntryRate(badLookup, "VES", "official", undefined, "2026-06-30"))
        ).rejects.toThrow(MoneyValidationError);
    });

    it("rejects a negative entry rate rather than flipping the amount's sign", () => {
        expect(() =>
            computeAmountUSD({
                baseAmount: 100,
                date: "2026-06-30",
                exchangeRate: -40,
                exchangeRateType: "official",
            })
        ).toThrow(MoneyValidationError);
    });
});
