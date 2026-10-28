import { describe, expect, it } from "vite-plus/test";

import { CATEGORY_ICON_GROUPS, iconKeysMatching } from "./category-icon-catalog";

const ALL_KEYS = CATEGORY_ICON_GROUPS.flatMap((group) => group.keys);

describe("iconKeysMatching", () => {
    it("returns every key in group order for an empty or blank query", () => {
        expect(iconKeysMatching("")).toStrictEqual(ALL_KEYS);
        expect(iconKeysMatching("   ")).toStrictEqual(ALL_KEYS);
    });

    it("matches on a keyword synonym", () => {
        const keys = iconKeysMatching("groceries");
        expect(keys).toContain("ShoppingCart01");
        expect(keys).not.toContain("Airplane01");
    });

    it("matches on a name token", () => {
        const keys = iconKeysMatching("coffee");
        expect(keys).toContain("Coffee02");
        expect(keys).not.toContain("Car01");
    });

    it("ignores case and diacritics", () => {
        const keys = iconKeysMatching("CAFÉ");
        expect(keys).toContain("Coffee02");
        expect(keys).not.toContain("Bus01");
    });

    it("answers nothing for a query no icon carries", () => {
        expect(iconKeysMatching("zzzznotanicon")).toStrictEqual([]);
    });

    it("returns unique keys with no duplicates", () => {
        const keys = iconKeysMatching("");
        expect(keys).toHaveLength(new Set(keys).size);
    });
});
