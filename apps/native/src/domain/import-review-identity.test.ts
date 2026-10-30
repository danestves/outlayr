import { merchantKey } from "@outlayr/money/merchant-key";
import { beforeEach, describe, expect, it } from "vite-plus/test";

import { clearEnrichmentCache, setCachedEnrichment } from "./enrichment-cache";
import { reviewEntryIdentity } from "./import-review-identity";

describe("reviewEntryIdentity", () => {
    beforeEach(() => {
        clearEnrichmentCache();
    });

    it("scrubs long digit runs out of the display name", () => {
        const identity = reviewEntryIdentity("NETFLIX 12345678901");
        expect(identity.displayName).toBe("NETFLIX");
    });

    it("resolves the domain from the on-device merchant index", () => {
        expect(reviewEntryIdentity("NETFLIX").domain).toBe("netflix.com");
    });

    it("resolves the cached domain for a note carrying a store number", () => {
        setCachedEnrichment(merchantKey("Blue Bottle Coffee"), {
            categoryName: "Food & Drink",
            domain: "bluebottlecoffee.com",
            emoji: null,
            grounding: false,
            isNewCategory: false,
            merchantName: null,
            parentCategoryName: null,
            tags: [],
        });
        expect(reviewEntryIdentity("BLUE BOTTLE COFFEE #08761").domain).toBe("bluebottlecoffee.com");
    });

    it("still hits a cache entry whose key kept the note's digits", () => {
        setCachedEnrichment(merchantKey("Depot 55110"), {
            categoryName: "Shopping",
            domain: "depot.example",
            emoji: null,
            grounding: false,
            isNewCategory: false,
            merchantName: null,
            parentCategoryName: null,
            tags: [],
        });
        expect(reviewEntryIdentity("Depot 55110").domain).toBe("depot.example");
    });

    it("keeps the raw note when scrubbing would empty the name, with no domain", () => {
        const identity = reviewEntryIdentity("12345678901");
        expect(identity.displayName).toBe("12345678901");
        expect(identity.domain).toBeNull();
    });
});
