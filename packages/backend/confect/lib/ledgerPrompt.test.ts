import { describe, expect, it } from "vite-plus/test";

import { draftCurrency } from "./ledgerPrompt";

describe(draftCurrency, () => {
    it.each([
        ["the ledger's own code, in any case", " usd ", { currency: null, unresolved: false }],
        ["nothing read", null, { currency: null, unresolved: false }],
        ["a catalog code", "mxn", { currency: "MXN", unresolved: false }],
        ["a code the catalog lacks", "RMB", { currency: null, unresolved: true }],
        ["a word, not a code", "dollars", { currency: null, unresolved: true }],
    ])("%s", (_, read, expected) => {
        expect(draftCurrency(read, "USD")).toStrictEqual(expected);
    });
});
