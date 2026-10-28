import { describe, expect, it } from "vite-plus/test";

import type { Category, CategoryWithChildren } from "@/data/categories-core";

import { categorySearchKey, expandedForSelectedCategory, searchCategoryTree } from "./category-search";

function category(id: string, name: string, parentId: string | null): Category {
    return {
        color: "#34C759",
        dateCreated: new Date(0),
        deletedAt: null,
        emoji: null,
        icon: "ShoppingCart01",
        id,
        income: false,
        name,
        parentId,
        sortOrder: 0,
        updatedAt: new Date(0),
    };
}

function tree(...parents: [string, string, [string, string][]][]): CategoryWithChildren[] {
    return parents.map(([id, name, children]) => ({
        ...category(id, name, null),
        children: children.map(([childId, childName]) => category(childId, childName, id)),
    }));
}

const SAMPLE = tree(
    [
        "groceries",
        "Groceries",
        [
            ["organic", "Organic"],
            ["butcher", "Butcher"],
        ],
    ],
    ["transport", "Transport", []],
    ["subscriptions", "Subscriptions", [["storage", "Storage"]]]
);

describe("categorySearchKey", () => {
    it("folds case and diacritics", () => {
        expect(categorySearchKey("Café")).toBe("cafe");
    });

    it("trims surrounding whitespace", () => {
        expect(categorySearchKey("  Rent  ")).toBe("rent");
    });
});

describe("searchCategoryTree", () => {
    it("returns nothing for an empty or whitespace-only query", () => {
        expect(searchCategoryTree(SAMPLE, "")).toStrictEqual([]);
        expect(searchCategoryTree(SAMPLE, "   ")).toStrictEqual([]);
    });

    it("matches a parent on a case-insensitive substring", () => {
        const matches = searchCategoryTree(SAMPLE, "GROCER");
        expect(matches).toHaveLength(1);
        expect(matches[0]?.category.id).toBe("groceries");
        expect(matches[0]?.parent).toBeNull();
    });

    it("surfaces a child directly and carries its parent for the breadcrumb", () => {
        const matches = searchCategoryTree(SAMPLE, "butch");
        expect(matches).toHaveLength(1);
        expect(matches[0]?.category.id).toBe("butcher");
        expect(matches[0]?.parent?.name).toBe("Groceries");
    });

    it("keeps tree order, with a matching child directly after its parent", () => {
        const matches = searchCategoryTree(SAMPLE, "or");
        expect(matches.map((match) => match.category.id)).toStrictEqual(["organic", "transport", "storage"]);
    });

    it("matches across diacritics in both directions", () => {
        const accented = tree(["cafe", "Café", []]);
        expect(searchCategoryTree(accented, "cafe")).toHaveLength(1);
        expect(searchCategoryTree(accented, "café")).toHaveLength(1);
    });

    it("keeps highlight offsets aligned when the name carries a combining mark", () => {
        const decomposed = tree(["cafe", "Café Bar", []]);
        const [match] = searchCategoryTree(decomposed, "bar");
        expect(match?.category.name?.slice(match.matchStart, match.matchStart + match.matchLength)).toBe("Bar");
    });
});

describe("expandedForSelectedCategory", () => {
    it("opens the parent holding the selected child", () => {
        expect([...expandedForSelectedCategory(SAMPLE, "organic")]).toStrictEqual(["groceries"]);
    });

    it("opens nothing when the selection is a top-level category", () => {
        expect(expandedForSelectedCategory(SAMPLE, "transport").size).toBe(0);
    });

    it("opens nothing for a null or unknown selection", () => {
        expect(expandedForSelectedCategory(SAMPLE, null).size).toBe(0);
        expect(expandedForSelectedCategory(SAMPLE, "nope").size).toBe(0);
    });
});
