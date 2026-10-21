import { cellFigures, toCells } from "@outlayr/money/currency-totals";
import type { CurrencyEntry } from "@outlayr/money/currency-totals";
import type { RateTable } from "@outlayr/money/valuation";

import { ZERO_FIGURES } from "./log-measure";
import type { LogFigures } from "./log-measure";

export interface ScopeTotals {
    others: LogFigures[];
    /** Falls back to the dominant bucket: a figure labelled with a currency its numbers are not in is untrue. */
    shown: LogFigures;
}

function totalled(entries: readonly CurrencyEntry[]): CurrencyEntry[] {
    return entries.filter((entry) => !("excludedFromTotals" in entry && entry.excludedFromTotals));
}

export function scopeHasFigures(entries: readonly CurrencyEntry[]): boolean {
    return totalled(entries).length > 0;
}

// Hand in every matched entry: only the `all` list is paged, and a total over scrolled rows answers another question.
export function scopeTotals(
    entries: readonly CurrencyEntry[],
    displayCurrency: string,
    rates?: RateTable
): ScopeTotals {
    const ordered = cellFigures(toCells(totalled(entries)), displayCurrency, rates);
    const shown = ordered.find((figures) => figures.currencyCode === displayCurrency) ??
        ordered[0] ?? { currencyCode: displayCurrency, ...ZERO_FIGURES };

    return { others: ordered.filter((figures) => figures !== shown), shown };
}
