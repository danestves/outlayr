import { useAtomValue } from "@effect/atom-react/Hooks";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as Atom from "effect/reactivity/Atom";

import type { Database } from "@/db/client";
import type { ValuationCoverage } from "@/domain/valuation-coverage";
import { appRuntime } from "@/lib/runtime";

import { valuationCoverage } from "./canonicalize-backfill";

const NOTHING: ValuationCoverage = {
    beyondRateHistory: 0,
    converted: 0,
    pending: 0,
};

const valuationCoverageAtom = Atom.family((db: Database) =>
    appRuntime.atom(valuationCoverage(db)).pipe(Atom.withLabel("valuation-coverage:read"))
);

/**
 * Read once per mount, not live: coverage only moves when a foreground rate pull or canonicalization lands, and
 * the scan is not worth a listener every transaction write would fire.
 */
export function useValuationCoverage(db: Database): ValuationCoverage {
    return AsyncResult.getOrElse(useAtomValue(valuationCoverageAtom(db)), () => NOTHING);
}
