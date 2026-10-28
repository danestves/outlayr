import { describe, expect, it } from "vite-plus/test";

import { descriptorKey, merchantKey, resolveMerchant } from "./merchant-resolver";

describe("normalizing a raw name into a matching key", () => {
    it("lowercases, trims, and collapses whitespace", () => {
        expect(merchantKey("  NETFLIX   Inc  ")).toBe("netflix inc");
    });

    it("strips diacritics", () => {
        expect(merchantKey("Café Amazon")).toBe("cafe amazon");
    });

    it("turns punctuation into word breaks", () => {
        expect(merchantKey("AT&T*BILL")).toBe("at t bill");
    });
});

describe("resolving the six required named merchants", () => {
    it("resolves netflix", () => {
        expect(resolveMerchant("Netflix")).toStrictEqual({
            categoryName: "Entertainment",
            domain: "netflix.com",
            tags: ["Streaming", "Subscription"],
        });
    });
});

describe("longest-pattern-first (WCGW #3)", () => {
    it("matches apple music over the bare apple pattern when the name carries extra words", () => {
        const result = resolveMerchant("Apple Music Family Plan");
        expect(result?.domain).toBe("music.apple.com");
    });
});

describe("alias and token containment", () => {
    it("matches a curated pattern embedded inside a longer statement string", () => {
        const result = resolveMerchant("COSTCO WHOLESALE #482");
        expect(result?.categoryName).toBe("Groceries");
    });

    it("does not match an unrelated word that merely shares a prefix", () => {
        expect(resolveMerchant("Appliance")).toBeNull();
    });
});

describe("fuzzy matching", () => {
    it("accepts a single-character typo at least 5 characters long", () => {
        const result = resolveMerchant("Spotifi");
        expect(result?.categoryName).toBe("Entertainment");
        expect(result?.tags).toStrictEqual(["Music", "Streaming", "Subscription"]);
    });

    it("rejects short names below the 5-character floor even at distance 1", () => {
        expect(resolveMerchant("User")).toBeNull();
        expect(resolveMerchant("Ubr")).toBeNull();
    });

    it("rejects an ambiguous name equidistant from two different curated entries", () => {
        expect(resolveMerchant("canvaa")).toBeNull();
    });

    it("resolves a real distance-1 collision between different companies but keeps the domain null", () => {
        const result = resolveMerchant("cosco");
        expect(result?.categoryName).toBe("Groceries");
        expect(result?.domain).toBeNull();
    });

    it("rejects a name with no curated candidate at all", () => {
        expect(resolveMerchant("xyzcorp random note 12345")).toBeNull();
    });
});

describe("descriptorKey", () => {
    it.each([
        ["AIRBNB * HMASFW2JP2", "airbnb"],
        ["NYX*VenetisABEET", "venetis"],
        ["CARE4BAG AE", "care4bag"],
        ["BLUE BOTTLE COFFEE #08761", "blue bottle coffee"],
        ["FIUMICINO AEROPORTO SS", "fiumicino aeroporto ss"],
    ])("%s decodes to %s, the same as the backend's copy", (raw, expected) => {
        expect(descriptorKey(raw)).toBe(expected);
    });
});
