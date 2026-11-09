import { describe, expect, it } from "vite-plus/test";

import { categoryPush } from "../../../../lib/category-writes";
import { categoryProblem, categoryTree } from "./model";
import type { Category } from "./model";

const category = (localId: string, extra: Partial<Category> = {}): Category =>
    // SAFETY: a fixture with live query keys, which the row type omits.
    ({
        _creationTime: 1,
        _id: `id-${localId}`,
        $key: `id-${localId}`,
        $origin: "remote",
        color: "#B56858",
        dateCreated: 1,
        deletedAt: null,
        deviceId: "phone",
        emoji: null,
        icon: `icon-${localId}`,
        income: false,
        localId,
        name: localId,
        parentId: null,
        seq: 3,
        sortOrder: 0,
        updatedAt: 2,
        userId: "owner",
        ...extra,
    }) as unknown as Category;

describe("checking a category", () => {
    const rows = [
        category("Food", { emoji: "🍎️", icon: null, name: "Food" }),
        category("Rent", { icon: "Home01", name: "Rent" }),
        category("Pay", { icon: "MoneyBag01", income: true, name: "Pay" }),
        category("Old", { deletedAt: 3, icon: "Bus01", name: "Old" }),
    ];
    const draft = { emoji: null, icon: "Bus01", income: false, name: "Transit" };

    it("asks for what is missing", () => {
        expect(categoryProblem(rows, { ...draft, icon: null, name: " " }, null)).toBe("incomplete");
        expect(categoryProblem(rows, { ...draft, name: "" }, null)).toBe("missingName");
        expect(categoryProblem(rows, { ...draft, icon: null }, null)).toBe("missingIcon");
    });

    it("collides across the namespace ignoring case and emoji presentation, never with deleted rows", () => {
        expect(categoryProblem(rows, { ...draft, name: "RENT" }, null)).toBe("duplicateName");
        expect(categoryProblem(rows, { ...draft, icon: "Home01" }, null)).toBe("duplicateIcon");
        expect(categoryProblem(rows, { ...draft, emoji: "🍎", icon: null }, null)).toBe("duplicateEmoji");
        expect(categoryProblem(rows, { ...draft, icon: "Home01", name: "rent" }, null)).toBe("duplicate");
        expect(categoryProblem(rows, draft, null)).toBeNull();
        expect(categoryProblem(rows, { ...draft, icon: "MoneyBag01", name: "Pay" }, null)).toBeNull();
    });

    it("lets a row keep its own name and a symbol-less legacy row stay renamable", () => {
        const [, rent] = rows;
        expect(categoryProblem(rows, { ...draft, icon: "Home01", name: "Rent" }, rent ?? null)).toBeNull();
        const legacy = category("Legacy", { icon: null });
        expect(categoryProblem(rows, { ...draft, icon: null, name: "Older" }, legacy)).toBeNull();
    });
});

describe("the category list", () => {
    it("nests subcategories in order and skips deleted rows and the other namespace", () => {
        const tree = categoryTree(
            [
                category("b", { sortOrder: 2 }),
                category("a", { sortOrder: 1 }),
                category("a2", { parentId: "a", sortOrder: 2 }),
                category("a1", { parentId: "a", sortOrder: 1 }),
                category("x", { deletedAt: 1 }),
                category("pay", { income: true }),
            ],
            false
        );
        expect(tree.map((node) => [node.localId, node.children.map((child) => child.localId)])).toStrictEqual([
            ["a", ["a1", "a2"]],
            ["b", []],
        ]);
    });

    it("pushes a row from the table without the tree's children, which sync.push rejects", () => {
        const [node] = categoryTree([category("a"), category("a1", { parentId: "a" })], false);
        expect(node && Object.keys(categoryPush(node).fields)).not.toContain("children");
    });
});
