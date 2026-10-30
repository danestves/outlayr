import { merchantKey } from "@outlayr/money/merchant-key";
import { describe, expect, it } from "vite-plus/test";

import { capitalizeCategoryName, SUGGESTED_CATEGORY_PRESETS } from "@/data/categories-core";

import { MERCHANT_INDEX, MERCHANTS } from "./merchant-map";
import { resolveMerchant } from "./merchant-resolver";
import { normalizeTagName, TAG_NAME_LIMIT } from "./tags";

const VALID_CATEGORY_NAMES = new Set(
    [...SUGGESTED_CATEGORY_PRESETS.expense, ...SUGGESTED_CATEGORY_PRESETS.income].map((preset) => preset.name)
);

describe("seeding the curated merchant map", () => {
    it("keeps every id unique", () => {
        const ids = MERCHANTS.map((entry) => entry.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it("stores every tag in its already-normalized display form", () => {
        for (const entry of MERCHANTS) {
            for (const tag of entry.tags) {
                expect(normalizeTagName(tag)).toBe(tag);
                expect(tag.length).toBeLessThanOrEqual(TAG_NAME_LIMIT);
            }
        }
    });

    it("stores every categoryName already capitalized and drawn from a suggested preset", () => {
        for (const entry of MERCHANTS) {
            expect(capitalizeCategoryName(entry.categoryName)).toBe(entry.categoryName);
            expect(VALID_CATEGORY_NAMES.has(entry.categoryName)).toBe(true);
        }
    });

    it("keeps every pattern's matching key unique across every entry", () => {
        const keys = MERCHANTS.flatMap((entry) => entry.patterns.map((pattern) => merchantKey(pattern)));
        expect(new Set(keys).size).toBe(keys.length);
    });
});

describe("regional merchant coverage", () => {
    it("resolves every reported LATAM merchant name", () => {
        const reported = [
            "Gama supermercados",
            "Forum SuperMayorista",
            "Central Madeirense",
            "Farmatodo",
            "Automercados Plaza's",
        ];
        for (const name of reported) {
            expect(resolveMerchant(name)?.categoryName ?? null).not.toBeNull();
        }
    });
});

describe("logo.dev domain backfill", () => {
    it("resolves every spelling of mcdonalds to the same entry", () => {
        for (const name of ["McDonald's", "mc donalds", "mcdonalds", "McDonalds"]) {
            expect(resolveMerchant(name)?.domain).toBe("mcdonalds.com");
            expect(resolveMerchant(name)?.categoryName).toBe("Dining Out");
        }
    });
});

describe("the module-load merchant index", () => {
    it("holds every pattern as a key", () => {
        for (const entry of MERCHANTS) {
            for (const pattern of entry.patterns) {
                expect(MERCHANT_INDEX.get(pattern)?.id).toBe(entry.id);
            }
        }
    });
});
