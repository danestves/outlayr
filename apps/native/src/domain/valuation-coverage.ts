import { utcDateString } from "@outlayr/money/dates";
import { valueExactIn } from "@outlayr/money/valuation";
import type { DatedValuable, RateTable } from "@outlayr/money/valuation";

import type { TranslateFn } from "@/i18n/context";

export interface ValuationCoverage {
    /** Final at face value: the server serves a bounded window and every pull wipe-replaces the local rate table. */
    beyondRateHistory: number;
    converted: number;
    pending: number;
}

function predatesHistory(code: string | null, dateKey: string, rates: RateTable): boolean {
    if (code === null || code === "USD") {
        return false;
    }
    const floor = rates.earliest(code);
    return floor !== null && dateKey < floor;
}

// Both legs are checked: a row with a USD value is still unreachable if the display currency has no rate on its day.
export function coverageOf(
    rows: readonly DatedValuable[],
    displayCurrency: string,
    rates: RateTable
): ValuationCoverage {
    const coverage: ValuationCoverage = {
        beyondRateHistory: 0,
        converted: 0,
        pending: 0,
    };
    for (const row of rows) {
        const dateKey = utcDateString(row.date.getTime());
        const valuable = {
            amount: row.amount,
            amountUsd: row.amountUsd,
            currency: row.currency,
            dateKey,
        };
        if (valueExactIn(valuable, displayCurrency, rates) !== null) {
            coverage.converted += 1;
        } else if (predatesHistory(row.currency, dateKey, rates) || predatesHistory(displayCurrency, dateKey, rates)) {
            coverage.beyondRateHistory += 1;
        } else {
            coverage.pending += 1;
        }
    }
    return coverage;
}

export function coverageNote(coverage: ValuationCoverage, t: TranslateFn): string | null {
    const { converted, pending, beyondRateHistory } = coverage;
    const total = converted + pending + beyondRateHistory;
    if (total === 0 || (pending === 0 && beyondRateHistory === 0)) {
        return null;
    }
    if (pending === 0) {
        return t("coverage.predateOnly", { count: beyondRateHistory, total });
    }
    if (beyondRateHistory === 0) {
        return t("coverage.pending", { count: pending, total });
    }
    return t("coverage.pendingAndPredate", {
        count: pending,
        predate: beyondRateHistory,
        total,
    });
}
