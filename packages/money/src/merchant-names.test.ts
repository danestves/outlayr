import { describe, expect, it } from "vite-plus/test";

import { merchantNamesOf, renamedMerchant, renameFor } from "./merchant-names";

describe(renamedMerchant, () => {
    it("folds an earlier rename into the new name, so a chain never leaves the old name behind", () => {
        const once = renamedMerchant({}, "COSTCO WHSE", "Costco");
        const twice = renamedMerchant(once, "Costco", "Costco Wholesale");

        expect(renameFor(twice, "COSTCO WHSE")).toBe("Costco Wholesale");
        expect(renameFor(twice, "costco")).toBe("Costco Wholesale");
    });

    it("renaming back drops the rename that pointed the other way", () => {
        const there = renamedMerchant({}, "Amazon", "Amazon Prime");
        const back = renamedMerchant(there, "Amazon Prime", "Amazon");

        expect(renameFor(back, "Amazon")).toBeNull();
        expect(renameFor(back, "Amazon Prime")).toBe("Amazon");
    });

    it("drops the oldest renames past the cap", () => {
        let names = renamedMerchant({}, "first shop", "First");
        for (let index = 0; index < 500; index += 1) {
            names = renamedMerchant(names, `shop ${index} x`, `Shop ${index}`);
        }

        expect(renameFor(names, "first shop")).toBeNull();
        expect(renameFor(names, "shop 499 x")).toBe("Shop 499");
    });
});

describe(renameFor, () => {
    it("matches a bank descriptor of a renamed merchant", () => {
        const names = renamedMerchant({}, "Uber", "Uber Rides");

        expect(renameFor(names, "SQ *UBER 8XK2Q91")).toBe("Uber Rides");
        expect(renameFor(names, "Uber Eats")).toBeNull();
    });

    it("falls back to the brand the model read", () => {
        const names = renamedMerchant({}, "Netflix", "Netflix (family)");

        expect(renameFor(names, "NFLX DIGITAL 0042", "Netflix")).toBe("Netflix (family)");
    });
});

describe(merchantNamesOf, () => {
    it("reads a damaged value as no renames instead of throwing", () => {
        expect(merchantNamesOf("{not json")).toStrictEqual({});
        expect(merchantNamesOf(JSON.stringify({ costco: 4 }))).toStrictEqual({});
    });
});
