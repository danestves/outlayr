import { buildRateTable } from "@outlayr/money/valuation";
import { and, eq, inArray } from "drizzle-orm";
import { useMemo } from "react";

import type { Database } from "@/db/client";
import { exchangeRates } from "@/db/schema";

import { useGlobalCurrency } from "./app-meta";
import { useRatesRead } from "./live-query";
import type { Valuation } from "./valuation-source";
import { VALUATION_RATE_TYPE } from "./valuation-source";

const NO_OTHERS: readonly string[] = [];

/** Reactive `loadValuationIn`; keep `also` stable across renders. */
export function useValuationIn(db: Database, code: string, also: readonly string[] = NO_OTHERS): Valuation {
    const rows = useRatesRead(
        () =>
            db
                .select({
                    date: exchangeRates.date,
                    quote: exchangeRates.quote,
                    rate: exchangeRates.rate,
                })
                .from(exchangeRates)
                .where(
                    and(inArray(exchangeRates.quote, [code, ...also]), eq(exchangeRates.rateType, VALUATION_RATE_TYPE))
                )
                .all(),
        [db, code, also]
    );

    return useMemo(() => ({ displayCurrency: code, rates: buildRateTable(rows) }), [code, rows]);
}

export function useValuation(db: Database): Valuation {
    return useValuationIn(db, useGlobalCurrency(db));
}
