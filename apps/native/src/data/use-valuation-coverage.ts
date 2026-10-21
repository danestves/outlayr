import { useEffect, useState } from "react";

import type { Database } from "@/db/client";
import type { ValuationCoverage } from "@/domain/valuation-coverage";

import { valuationCoverage } from "./canonicalize-backfill";

const NOTHING: ValuationCoverage = {
    beyondRateHistory: 0,
    converted: 0,
    pending: 0,
};

/**
 * Read once per mount, not live: coverage only moves when a foreground rate pull or canonicalization lands, and
 * the scan is not worth a listener every transaction write would fire.
 */
export function useValuationCoverage(db: Database): ValuationCoverage {
    const [coverage, setCoverage] = useState<ValuationCoverage>(NOTHING);

    useEffect(() => {
        let cancelled = false;
        valuationCoverage(db).then((next) => {
            if (!cancelled) {
                // oxlint-disable-next-line promise/no-callback-in-promise -- an effect body cannot be async, so the setState has nowhere else to be sequenced from
                setCoverage(next);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [db]);

    return coverage;
}
