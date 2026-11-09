import type { LedgerBooks } from "@outlayr/backend/confect/ledgerView";
import { describe, expect, it } from "vite-plus/test";

import { deletionOf, deletionRows, newCategory } from "./category-writes";

type Category = LedgerBooks["categories"][number];

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

describe("a new category", () => {
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
});
