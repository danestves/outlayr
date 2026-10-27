import * as Effect from "effect/Effect";

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
export const canonicalUsd = Effect.fn("CanonicalUsd.canonicalUsd")(function* canonicalUsd<E>(
    lookup: RateLookup<E>,
    input: CanonicalUsdInput
) {
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
    const resolve = Effect.gen(function* resolve() {
        const suppliedRate = input.exchangeRate;
        let exchangeRate: number | null;
        if (suppliedRate == null) {
            exchangeRate = yield* resolveEntryRate(lookup, currency, exchangeRateType, undefined, date);
        } else if (Number.isFinite(suppliedRate) && suppliedRate > 0) {
            exchangeRate = suppliedRate;
        } else {
            exchangeRate = null;
        }
        if (exchangeRate === null) {
            return { amountUsd: null, exchangeRate: null, exchangeRateType };
        }
        const amountUsd = yield* Effect.try({
            catch: (error) => error,
            try: () => computeAmountUSD({ baseAmount: input.amount, date, exchangeRate, exchangeRateType }),
        }).pipe(
            Effect.catch((error) => (error instanceof MoneyValidationError ? Effect.fail(error) : Effect.die(error)))
        );
        return { amountUsd, exchangeRate, exchangeRateType };
    });
    // A validation failure is the same as having no rate, never a reason to refuse the write.
    return yield* resolve.pipe(
        Effect.catchTags({ MoneyValidationError: () => Effect.succeed({ ...UNRESOLVED, exchangeRateType }) })
    );
});
