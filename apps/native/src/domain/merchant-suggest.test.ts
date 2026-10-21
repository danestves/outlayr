import { describe, expect, it } from "@jest/globals";

import { suggestMerchants } from "./merchant-suggest";

describe("suggesting a curated merchant from a prefix", () => {
    it("answers with the names that start with what was typed", () => {
        expect(suggestMerchants("netf", 4)).toStrictEqual(["Netflix"]);
    });

    it("puts the nearest name first", () => {
        expect(suggestMerchants("spotify", 4)).toStrictEqual(["Spotify"]);
        expect(suggestMerchants("you", 4)[0]).toBe("YouTube");
    });

    it("matches an alias and answers with the entry's own name", () => {
        expect(suggestMerchants("ubereat", 4)).toStrictEqual(["Uber Eats"]);
    });

    it("folds case and spacing the way the resolver does", () => {
        expect(suggestMerchants("  UBER   EAT ", 4)).toStrictEqual(["Uber Eats"]);
    });

    it("says nothing for a prefix too short to narrow the catalogue", () => {
        expect(suggestMerchants("n", 4)).toStrictEqual([]);
        expect(suggestMerchants("", 4)).toStrictEqual([]);
    });

    it("stops at the limit it was given", () => {
        expect(suggestMerchants("a", 3).length).toBeLessThanOrEqual(3);
        expect(suggestMerchants("sp", 1)).toHaveLength(1);
    });

    it("drops a name the caller already has", () => {
        expect(suggestMerchants("netf", 4, ["NETFLIX "])).toStrictEqual([]);
    });
});
