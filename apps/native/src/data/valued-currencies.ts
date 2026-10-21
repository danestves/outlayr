import { eq } from "drizzle-orm";
import { useMemo } from "react";

import type { Database } from "@/db/client";
import { exchangeRates } from "@/db/schema";

import { useRatesRead } from "./live-query";
import { VALUATION_RATE_TYPE } from "./valuation-source";

/**
 * Distinct quotes, not rates: `useValuationIn` loads one currency's rates, so asking it what else is reachable
 * always answers no (#237). USD is absent by design; callers add it, since it has no row of its own.
 */
export function useValuedCurrencies(db: Database): ReadonlySet<string> {
    const rows = useRatesRead(
        () =>
            db
                .selectDistinct({ quote: exchangeRates.quote })
                .from(exchangeRates)
                .where(eq(exchangeRates.rateType, VALUATION_RATE_TYPE))
                .all(),
        [db]
    );

    return useMemo(() => new Set(rows.map((row) => row.quote)), [rows]);
}
