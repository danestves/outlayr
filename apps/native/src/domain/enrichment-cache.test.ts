import { beforeEach, describe, expect, it } from "vite-plus/test";

import { clearEnrichmentCache, getCachedEnrichment, setCachedEnrichment } from "./enrichment-cache";
import type { RemoteEnrichmentResult } from "./enrichment-cache";

beforeEach(() => {
    clearEnrichmentCache();
});

describe("getCachedEnrichment", () => {
    it("reports a miss for a key that was never cached", () => {
        expect(getCachedEnrichment("spotify")).toStrictEqual({ hit: false });
    });

    it("retrieves a positive result that was cached earlier", () => {
        const value = {
            categoryName: "Entertainment",
            domain: "spotify.com",
            isNewCategory: false,
            tags: ["Music", "Streaming"],
        };
        setCachedEnrichment("spotify", value);
        expect(getCachedEnrichment("spotify")).toStrictEqual({
            hit: true,
            value,
        });
    });

    it("caches and retrieves a negative (null) result", () => {
        setCachedEnrichment("some unknown merchant", null);
        expect(getCachedEnrichment("some unknown merchant")).toStrictEqual({
            hit: true,
            value: null,
        });
    });
});

describe("setCachedEnrichment eviction", () => {
    it("evicts the first inserted key once the 51st entry is added", () => {
        for (let i = 0; i < 50; i += 1) {
            setCachedEnrichment(`merchant-${i}`, null);
        }
        expect(getCachedEnrichment("merchant-0")).toStrictEqual({
            hit: true,
            value: null,
        });

        setCachedEnrichment("merchant-50", null);

        expect(getCachedEnrichment("merchant-0")).toStrictEqual({ hit: false });
        expect(getCachedEnrichment("merchant-1")).toStrictEqual({
            hit: true,
            value: null,
        });
        expect(getCachedEnrichment("merchant-50")).toStrictEqual({
            hit: true,
            value: null,
        });
    });

    it("does not evict when overwriting an existing key at capacity", () => {
        for (let i = 0; i < 50; i += 1) {
            setCachedEnrichment(`merchant-${i}`, null);
        }
        setCachedEnrichment("merchant-0", {
            categoryName: "Shopping",
            domain: null,
            isNewCategory: false,
            tags: [],
        });
        expect(getCachedEnrichment("merchant-0")).toStrictEqual({
            hit: true,
            value: {
                categoryName: "Shopping",
                domain: null,
                isNewCategory: false,
                tags: [],
            },
        });
        expect(getCachedEnrichment("merchant-1")).toStrictEqual({
            hit: true,
            value: null,
        });
    });
});

describe("currency scope", () => {
    it("keeps a name's answers apart per currency and leaves the bare partition alone", () => {
        const eur: RemoteEnrichmentResult = {
            categoryName: "Groceries",
            domain: "carrefour.fr",
            isNewCategory: false,
            tags: [],
        };
        setCachedEnrichment("carrefour", eur, "EUR");

        expect(getCachedEnrichment("carrefour", "EUR")).toStrictEqual({ hit: true, value: eur });
        expect(getCachedEnrichment("carrefour", "VES")).toStrictEqual({ hit: false });
        expect(getCachedEnrichment("carrefour")).toStrictEqual({ hit: false });
    });
});
