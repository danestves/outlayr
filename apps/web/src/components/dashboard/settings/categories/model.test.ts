import { describe, expect, it } from "vite-plus/test";

import { categoryProblem, categoryPush, categoryTree, deletionOf, deletionRows, newCategory } from "./model";
import type { Category } from "./model";

const NOW = 1_800_000_000_000;

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

describe("deleting a category", () => {
    const entry = (localId: string, categoryId: string, extra = {}) => ({
        _creationTime: 1,
        _id: `id-${localId}`,
        $key: localId,
        accountId: undefined,
        amount: 10,
        categoryId,
        deletedAt: null,
        deviceId: "phone",
        imageKey: "photo",
        localId,
        recurringType: 2,
        seq: 1,
        updatedAt: 2,
        userId: "owner",
        ...extra,
    });
    const books = {
        budgets: [
            { _id: "b1", amount: 300, categoryId: "food", deletedAt: null, localId: "b1", name: "Food" },
            { _id: "b2", amount: 300, categoryId: "rent", deletedAt: null, localId: "b2", name: "Rent" },
        ],
        categories: [
            category("food"),
            category("coffee", { parentId: "food" }),
            category("rent"),
            category("gone", { deletedAt: 5, parentId: "food" }),
        ],
        transactions: [entry("t1", "food"), entry("t2", "coffee"), entry("t3", "food", { deletedAt: 9 })],
    };
    const plans = [{ fields: { amount: 5, categoryId: "food", currency: "USD", month: 202_610 }, localId: "p1" }];
    // SAFETY: fixtures carry only the fields deletion reads and writes.
    const deletion = deletionOf(books as never, "food");
    if (!deletion) {
        throw new Error("the category is live");
    }
    const rows = deletionRows(deletion, plans, NOW);

    it("deletes its entries, budget and plans, promotes subcategories, and writes the category last", () => {
        expect(rows.map((row) => `${row.table}:${row.localId}`)).toStrictEqual([
            "transactions:t1",
            "budgets:b1",
            "budgetPlans:p1",
            "categories:coffee",
            "categories:food",
        ]);
        expect(rows.at(-1)?.deletedAt).toBe(NOW);
        const child = rows.find((row) => row.localId === "coffee");
        expect(child?.deletedAt).toBeNull();
        expect(child?.fields).toMatchObject({ parentId: null });
    });

    it("retires schedules, drops photos and blanks the budget like the phone", () => {
        expect(rows[0]?.fields).toMatchObject({ accountId: null, imageKey: null, recurringType: 0 });
        expect(rows[1]?.fields).toMatchObject({ amount: 0, categoryId: null, name: null });
    });

    it("sends Convex no envelope or live query keys", () => {
        for (const row of rows) {
            for (const key of ["$key", "$origin", "_id", "seq", "userId", "deletedAt", "localId"]) {
                expect(Object.keys(row.fields)).not.toContain(key);
            }
        }
    });
});

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

    it("appends a new category and keeps a custom name's casing past the first letter", () => {
        const made = newCategory(
            [category("a", { sortOrder: 4 })],
            {
                color: "#000000",
                emoji: null,
                icon: "Bus01",
                income: false,
                name: "  my   iPhone ",
                parentId: null,
                preset: null,
            },
            "new",
            NOW
        );
        expect(made).toMatchObject({ customName: true, name: "My iPhone", sortOrder: 5 });
    });

    it("pushes a row from the table without the tree's children, which sync.push rejects", () => {
        const [node] = categoryTree([category("a"), category("a1", { parentId: "a" })], false);
        expect(node && Object.keys(categoryPush(node).fields)).not.toContain("children");
    });
});
