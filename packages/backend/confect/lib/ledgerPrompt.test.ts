import { describe, expect, it } from "vite-plus/test";

import { draftCurrency, pickKnown } from "./ledgerPrompt";

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

describe(pickKnown, () => {
    it.each([
        ["spacing and a doubled letter", "BancaAmiga", ["Bancamiga", "Mercantil"], "Bancamiga"],
        ["a space inside the name", "Banca Amiga", ["Bancamiga"], "Bancamiga"],
        ["the Spanish b and v", "Vanesco", ["Banesco", "Mercantil"], "Banesco"],
    ])("finds the one known name through %s", (_, candidate, known, expected) => {
        expect(pickKnown(candidate, known, { loose: true })).toBe(expected);
    });

    it("keeps the exact match when a squashed twin also exists", () => {
        expect(pickKnown("Bancamiga", ["Banca Amiga", "Bancamiga"], { loose: true })).toBe("Bancamiga");
    });

    it("returns nothing when the squash could mean either of two accounts", () => {
        expect(pickKnown("BancaAmiga", ["Bancamiga", "Banca Amiga"], { loose: true })).toBeNull();
    });

    it("keeps digits apart when a name is matched loosely", () => {
        expect(pickKnown("Card11", ["Card 1", "Card 11"], { loose: true })).toBe("Card 11");
    });

    it("matches only case-insensitively unless the caller asks for the loose step", () => {
        expect(pickKnown("bancamiga", ["Bancamiga"])).toBe("Bancamiga");
        expect(pickKnown("BancaAmiga", ["Bancamiga"])).toBeNull();
    });
});
