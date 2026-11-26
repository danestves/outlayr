import { describe, expect, it } from "vite-plus/test";

import type { LedgerBooks } from "./ledger-books";
import { missingRateQuotes } from "./public-rates";

type RateBooks = Pick<LedgerBooks, "accounts" | "appMeta" | "exchangeRates">;

const booksWith = (
    currency: string,
    accounts: readonly string[],
    quotes: readonly string[],
    favourites?: string
): RateBooks =>
    ({
        accounts: accounts.map((code, index) => ({ currency: code, deletedAt: null, localId: `a${index}` })),
        appMeta: [
            { key: "currency", value: currency },
            ...(favourites === undefined ? [] : [{ key: "favouriteCurrencies", value: favourites }]),
        ],
        exchangeRates: quotes.map((quote) => ({ quote })),
    }) as unknown as RateBooks;

describe("missing rate quotes", () => {
    it("names a currency an account uses that the snapshot has no quote for", () => {
        expect(missingRateQuotes(booksWith("USD", ["USD", "EUR"], ["VES"]))).toStrictEqual(["EUR"]);
    });

    it("leaves out USD and currencies the snapshot already quotes", () => {
        expect(missingRateQuotes(booksWith("EUR", ["USD", "EUR", "VES"], ["EUR", "VES"]))).toStrictEqual([]);
    });

    it("includes favourites and the profile's own display currency", () => {
        expect(missingRateQuotes(booksWith("JPY", ["USD"], [], "GBP,JPY"))).toStrictEqual(["JPY", "GBP"]);
    });
});
