import { buildRateTable } from "@outlayr/money/valuation";
import type { RateTable } from "@outlayr/money/valuation";
import { and, eq, inArray } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { getMeta, META_KEYS } from "@/data/app-meta-core";
import type { SpendDb } from "@/data/budget-spent";
import { exchangeRates } from "@/db/schema";
import { DEFAULT_CURRENCY } from "@/domain/money";

export interface Valuation {
    displayCurrency: string;
    rates: RateTable;
}

/** The rate type plain entries are frozen at, so a conversion back out must use it too. */
const RATE_TYPE = "official";

export class ValuationSourceError extends Schema.TaggedError<ValuationSourceError>()("ValuationSourceError", {
    cause: Schema.Defect(),
    operation: Schema.Literal("rates"),
}) {
    override get message(): string {
        return `Loading the valuation ${this.operation} failed`;
    }
}

export const NO_VALUATION: Valuation = {
    displayCurrency: DEFAULT_CURRENCY,
    rates: buildRateTable([]),
};

/**
 * Scoped to the quotes asked for: the replica holds thousands of rows across every pair. `also` adds currencies
 * a figure is restated out of, such as an account's own.
 */
export const loadValuationIn = Effect.fn("ValuationSource.loadValuationIn")(function* loadValuationIn(
    db: SpendDb,
    code: string,
    also: readonly string[] = []
) {
    // USD needs no table: a canonical value is already in it.
    const quotes = [code, ...also].filter((quote) => quote !== "USD");
    if (quotes.length === 0) {
        return { displayCurrency: code, rates: buildRateTable([]) } satisfies Valuation;
    }

    const rows = yield* Effect.tryPromise({
        catch: (cause) => new ValuationSourceError({ cause, operation: "rates" }),
        try: () =>
            db
                .select({
                    date: exchangeRates.date,
                    quote: exchangeRates.quote,
                    rate: exchangeRates.rate,
                })
                .from(exchangeRates)
                .where(
                    and(
                        inArray(exchangeRates.quote, quotes),
                        // VES alone carries official, eur_reference and binance; mixing them would use a foreign rate.
                        eq(exchangeRates.rateType, RATE_TYPE)
                    )
                ),
    });

    return { displayCurrency: code, rates: buildRateTable(rows) } satisfies Valuation;
});

export const loadValuation = Effect.fn("ValuationSource.loadValuation")(function* loadValuation(db: SpendDb) {
    const currency = yield* getMeta(db, META_KEYS.currency);
    return yield* loadValuationIn(db, currency ?? DEFAULT_CURRENCY);
});

export { RATE_TYPE as VALUATION_RATE_TYPE };
