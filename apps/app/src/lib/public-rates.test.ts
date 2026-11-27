import { describe, expect, it } from "vite-plus/test";

import type { LedgerBooks } from "./ledger-books";
import { quotedCurrencies } from "./public-rates";

type RateBooks = Pick<LedgerBooks, "accounts" | "appMeta">;

const booksWith = (currency: string, accounts: readonly string[], favourites?: string): RateBooks =>
    ({
        accounts: accounts.map((code, index) => ({ currency: code, deletedAt: null, localId: `a${index}` })),
        appMeta: [
            { key: "currency", value: currency },
            ...(favourites === undefined ? [] : [{ key: "favouriteCurrencies", value: favourites }]),
        ],
    }) as unknown as RateBooks;

describe("quoted currencies", () => {
    it("names each non-USD account currency once", () => {
        expect(quotedCurrencies(booksWith("USD", ["USD", "EUR", "EUR"]))).toStrictEqual(["EUR"]);
    });

    it("leaves out USD but keeps the display currency", () => {
        expect(quotedCurrencies(booksWith("EUR", ["USD", "VES"]))).toStrictEqual(["EUR", "VES"]);
    });

    it("includes favourites and the profile's own display currency", () => {
        expect(quotedCurrencies(booksWith("JPY", ["USD"], "GBP,JPY"))).toStrictEqual(["JPY", "GBP"]);
    });
});
