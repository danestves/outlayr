import { ANCHOR_PAIR_CATALOG, PAIRS_PER_PAGE } from "@outlayr/backend/confect/exchangeRates";
import { utcDateString } from "@outlayr/money/dates";
import { parseFavourites } from "@outlayr/money/favourite-currencies";
import { settingsOf } from "@outlayr/money/ledger-view";

import type { LedgerBooks, RateRow } from "./ledger-books";

export const rateWindowAt = () => Date.parse(utcDateString(Date.now()));

export const publicRateRow = (
    row: Pick<RateRow, "date" | "fetchedAt" | "quote" | "rate" | "rateType" | "source">
): RateRow => ({
    ...row,
    _creationTime: row.fetchedAt,
    _id: `${row.quote}:${row.rateType}:${row.date}`,
});

export function quotedCurrencies(books: Pick<LedgerBooks, "accounts" | "appMeta">): readonly string[] {
    const favourites = books.appMeta.find((row) => row.key === "favouriteCurrencies")?.value ?? null;
    return [
        ...new Set(
            [
                settingsOf(books.appMeta).currency,
                ...parseFavourites(favourites),
                ...books.accounts.filter((row) => row.deletedAt === null).map((row) => row.currency),
            ].filter((code) => code !== "USD")
        ),
    ];
}

export function rateCursors(quotes: Iterable<string>): readonly number[] {
    return [
        ...new Set(
            [...quotes].flatMap((quote) => {
                const index = ANCHOR_PAIR_CATALOG.findIndex(
                    (pair) => pair.quote === quote && pair.rateType === "official"
                );
                return index === -1 ? [] : [Math.floor(index / PAIRS_PER_PAGE) * PAIRS_PER_PAGE];
            })
        ),
    ];
}

export function missingRateQuotes(
    books: Pick<LedgerBooks, "accounts" | "appMeta" | "exchangeRates">
): readonly string[] {
    const present = new Set(books.exchangeRates.map((row) => row.quote));
    return quotedCurrencies(books).filter((code) => !present.has(code));
}
