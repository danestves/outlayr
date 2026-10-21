import { utcDateString } from "./dates";
import { MoneyValidationError } from "./errors";
import { computeAmountUSD, resolveEntryRate } from "./rates";
import type { EntryRateType, RateLookup } from "./rates";

export interface CanonicalUsd {
    amountUsd: number | null;
    exchangeRate: number | null;
    exchangeRateType: string | null;
}

export interface CanonicalUsdInput {
    amount: number;
    /** Null means the entry is already in the ledger's display currency. */
    currency: string | null;
    date: Date;
    displayCurrency: string;
    exchangeRate?: number | null;
    /** Absent means official for a non-USD entry. */
    exchangeRateType?: EntryRateType | null;
}

const UNRESOLVED: CanonicalUsd = {
    amountUsd: null,
    exchangeRate: null,
    exchangeRateType: null,
};

const DEFAULT_RATE_TYPE: EntryRateType = "official";

// A stored rate is currency PER USD, so USD is the amount divided by it, in scaled integers inside `computeAmountUSD`.
export async function canonicalUsd(lookup: RateLookup, input: CanonicalUsdInput): Promise<CanonicalUsd> {
    const currency = input.currency ?? input.displayCurrency;

    if (currency === "USD") {
        return {
            amountUsd: input.amount,
            exchangeRate: 1,
            exchangeRateType: null,
        };
    }

    const exchangeRateType = input.exchangeRateType ?? DEFAULT_RATE_TYPE;
    if (exchangeRateType === "eur_reference" && currency !== "VES") {
        return { amountUsd: null, exchangeRate: null, exchangeRateType };
    }
    if (exchangeRateType === "custom" && input.exchangeRate == null) {
        return { amountUsd: null, exchangeRate: null, exchangeRateType };
    }

    const date = utcDateString(input.date.getTime());
    try {
        const suppliedRate = input.exchangeRate;
        let exchangeRate: number | null;
        if (suppliedRate == null) {
            exchangeRate = await resolveEntryRate(lookup, currency, exchangeRateType, undefined, date);
        } else if (Number.isFinite(suppliedRate) && suppliedRate > 0) {
            exchangeRate = suppliedRate;
        } else {
            exchangeRate = null;
        }
        if (exchangeRate === null) {
            return { amountUsd: null, exchangeRate: null, exchangeRateType };
        }
        const amountUsd = computeAmountUSD({
            baseAmount: input.amount,
            date,
            exchangeRate,
            exchangeRateType,
        });
        return { amountUsd, exchangeRate, exchangeRateType };
    } catch (error) {
        // A validation failure is the same as having no rate, never a reason to refuse the write.
        if (error instanceof MoneyValidationError) {
            return { ...UNRESOLVED, exchangeRateType };
        }
        throw error;
    }
}
