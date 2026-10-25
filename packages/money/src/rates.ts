import { dinero, toDecimal, USD } from "dinero.js/bigint";
import * as Schema from "effect/Schema";

import { MoneyValidationError } from "./errors";
import { DECIMAL_RADIX, divideHalfEven, toScaledInt, USD_SCALE } from "./scaled-int";
import type { ScaledInt } from "./scaled-int";

/** `binance` is VES-per-USDT market data only, never an entry type. */
export const MarketRateType = Schema.Literals(["official", "eur_reference", "binance"]);
export type MarketRateType = typeof MarketRateType.Type;
export const MARKET_RATE_TYPES = MarketRateType.literals;

// Not `MarketRateType`: `binance` is USDT, not USD, and `custom` is a user-supplied operation rate.
export const EntryRateType = Schema.Literals(["official", "eur_reference", "custom"]);
export type EntryRateType = typeof EntryRateType.Type;
export const ENTRY_RATE_TYPES = EntryRateType.literals;

export interface RateRow {
    date: string;
    rate: number;
}

/** Must return the newest row on or before `date`, else `null`. */
export type RateLookup = (quote: string, rateType: MarketRateType, date: string) => Promise<RateRow | null>;

export async function resolveEntryRate(
    lookup: RateLookup,
    currency: string,
    rateType: EntryRateType,
    customRate: number | undefined,
    date: string
): Promise<number> {
    if (rateType === "custom") {
        if (customRate === undefined) {
            throw new MoneyValidationError({ message: 'customRate is required when exchangeRateType is "custom"' });
        }
        if (!Number.isFinite(customRate) || customRate <= 0) {
            throw new MoneyValidationError({ message: "customRate must be a positive number" });
        }
        return customRate;
    }
    if (customRate !== undefined) {
        throw new MoneyValidationError({ message: 'customRate is only allowed when exchangeRateType is "custom"' });
    }
    if (rateType === "eur_reference" && currency !== "VES") {
        throw new MoneyValidationError({ message: "eur_reference rates are only available for VES amounts" });
    }
    const row = await lookup(currency, rateType, date);
    if (!row) {
        throw new MoneyValidationError({ message: `No ${rateType} rate available for ${currency} on ${date}` });
    }
    return requirePositiveRate(row.rate, currency, rateType, date);
}

function requirePositiveRate(rate: number, currency: string, rateType: string, date: string): number {
    if (!Number.isFinite(rate) || rate <= 0) {
        throw new MoneyValidationError({
            message: `Resolved ${rateType} rate for ${currency} on ${date} must be a positive number, got: ${rate}`,
        });
    }
    return rate;
}

export interface ComputeAmountUSDInput {
    baseAmount: number;
    date: string;
    exchangeRate: number;
    exchangeRateType: EntryRateType;
}

function divideToUsd(numerator: ScaledInt, denominator: ScaledInt): number {
    if (denominator.amount === 0n) {
        return Number.POSITIVE_INFINITY;
    }
    const scaledNumerator = numerator.amount * DECIMAL_RADIX ** (denominator.scale + USD_SCALE);
    const scaledDenominator = denominator.amount * DECIMAL_RADIX ** numerator.scale;
    const micro = divideHalfEven(scaledNumerator, scaledDenominator);
    const money = dinero({ amount: micro, currency: USD, scale: USD_SCALE });
    return Number(toDecimal(money));
}

// Unrounded, at micro-dollar precision. A finite pair can still overflow the division, which is rejected, not stored.
export function computeAmountUSD(input: ComputeAmountUSDInput): number {
    const amountUSD = divideToUsd(
        toScaledInt(input.baseAmount),
        toScaledInt(requirePositiveRate(input.exchangeRate, "the entry", input.exchangeRateType, input.date))
    );
    if (!Number.isFinite(amountUSD)) {
        throw new MoneyValidationError({
            message: `Computed USD amount is not finite (baseAmount ${input.baseAmount} at rate ${input.exchangeRate})`,
        });
    }
    return amountUSD;
}

export interface CanonicalRateFields {
    amountUsd?: number | null;
    exchangeRate?: number | null;
    exchangeRateType?: string | null;
}

export function isTransactionRateNeeded(fields: CanonicalRateFields): boolean {
    return fields.amountUsd === null && fields.exchangeRate === null && fields.exchangeRateType === "custom";
}
