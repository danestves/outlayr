import { and, eq, isNull } from "drizzle-orm";
import * as Effect from "effect/Effect";
import { beforeEach, describe, expect, it } from "vite-plus/test";

import type { Database } from "@/db/client";
import { budgetPlans, budgets, categories, transactions } from "@/db/schema";
import { migratedDatabase, transactionalDatabase } from "@/db/test-database";

import {
    capitalizeCategoryName,
    categoriesRepo,
    getCategoryById,
    isCategoryValidationError,
    SEEDED_CATEGORY_NAMES,
    SUGGESTED_CATEGORY_PRESETS,
    seedCategories,
    suggestedCategoriesNotAdded,
} from "./categories-core";

const failureCode = (effect: Effect.Effect<unknown, unknown>) =>
    Effect.runPromise(Effect.flip(effect)).then((error) => (isCategoryValidationError(error) ? error.code : null));

const makeDb = migratedDatabase;

async function addTransaction(
    db: Database,
    categoryId: string,
    overrides: Partial<typeof transactions.$inferInsert> = {}
): Promise<void> {
    const now = new Date();
    await db.insert(transactions).values({
        amount: 10,
        categoryId,
        date: now,
        day: now,
        id: `tx-${Math.random().toString(36).slice(2)}`,
        income: false,
        month: now,
        note: "Flat white",
        updatedAt: now,
        ...overrides,
    });
}

describe("capitalizeCategoryName", () => {
    it("trims, collapses whitespace, and title-cases", () => {
        expect(capitalizeCategoryName("  dining   out ")).toBe("Dining Out");
        expect(capitalizeCategoryName("COFFEE")).toBe("Coffee");
        expect(capitalizeCategoryName("groceries")).toBe("Groceries");
        expect(capitalizeCategoryName("   ")).toBe("");
    });
});

describe("categoriesRepo.create validation", () => {
    let db: Database;
    beforeEach(() => {
        db = makeDb();
    });

    it("reports incomplete when both name and symbol are missing", async () => {
        await expect(
            failureCode(
                categoriesRepo.create(db, {
                    color: "#279AF4",
                    icon: "",
                    income: false,
                    name: "  ",
                })
            )
        ).resolves.toBe("incomplete");
    });

    it("reports missingName when only the name is blank", async () => {
        await expect(
            failureCode(
                categoriesRepo.create(db, {
                    color: "#279AF4",
                    icon: "Coffee02",
                    income: false,
                    name: "  ",
                })
            )
        ).resolves.toBe("missingName");
    });

    it("reports missingIcon when the name is set but no symbol", async () => {
        await expect(
            failureCode(
                categoriesRepo.create(db, {
                    color: "#279AF4",
                    icon: "",
                    income: false,
                    name: "Coffee",
                })
            )
        ).resolves.toBe("missingIcon");
    });

    it("accepts an emoji as the symbol (no icon)", async () => {
        const id = await Effect.runPromise(
            categoriesRepo.create(db, {
                color: "#279AF4",
                emoji: "☕",
                income: false,
                name: "Coffee",
            })
        );
        const row = await getCategoryById(db, id);
        expect(row?.emoji).toBe("☕");
        expect(row?.icon).toBeNull();
    });

    it("title-cases and trims the stored name", async () => {
        const id = await Effect.runPromise(
            categoriesRepo.create(db, {
                color: "#279AF4",
                icon: "Coffee02",
                income: false,
                name: "  coffee shop  ",
            })
        );
        const row = await getCategoryById(db, id);
        expect(row?.name).toBe("Coffee Shop");
        expect(row?.icon).toBe("Coffee02");
        expect(row?.color).toBe("#279AF4");
        expect(row?.income).toBe(false);
    });
});

describe("categoriesRepo.create collisions", () => {
    let db: Database;
    beforeEach(() => {
        db = makeDb();
    });

    it("rejects a duplicate icon in the same namespace", async () => {
        await Effect.runPromise(
            categoriesRepo.create(db, {
                color: "#279AF4",
                icon: "Coffee02",
                income: false,
                name: "Coffee",
            })
        );
        await expect(
            failureCode(
                categoriesRepo.create(db, {
                    color: "#279AF4",
                    icon: "Coffee02",
                    income: false,
                    name: "Tea",
                })
            )
        ).resolves.toBe("duplicateIcon");
    });

    it("rejects a duplicate emoji, normalizing variation selectors", async () => {
        const heart = String.fromCodePoint(0x27_64);
        const heartVs = heart + String.fromCodePoint(0xfe_0f);
        await Effect.runPromise(
            categoriesRepo.create(db, {
                color: "#279AF4",
                emoji: heart,
                income: false,
                name: "Love",
            })
        );
        await expect(
            failureCode(
                categoriesRepo.create(db, {
                    color: "#279AF4",
                    emoji: heartVs,
                    income: false,
                    name: "Adore",
                })
            )
        ).resolves.toBe("duplicateEmoji");
    });

    it("rejects a duplicate name (case-insensitive) with a distinct icon", async () => {
        await Effect.runPromise(
            categoriesRepo.create(db, {
                color: "#279AF4",
                icon: "Coffee02",
                income: false,
                name: "Coffee",
            })
        );
        await expect(
            failureCode(
                categoriesRepo.create(db, {
                    color: "#279AF4",
                    icon: "Restaurant02",
                    income: false,
                    name: "coffee",
                })
            )
        ).resolves.toBe("duplicateName");
    });

    it("reports the combined duplicate when both symbol and name match", async () => {
        await Effect.runPromise(
            categoriesRepo.create(db, {
                color: "#279AF4",
                icon: "Coffee02",
                income: false,
                name: "Coffee",
            })
        );
        await expect(
            failureCode(
                categoriesRepo.create(db, {
                    color: "#279AF4",
                    icon: "Coffee02",
                    income: false,
                    name: "Coffee",
                })
            )
        ).resolves.toBe("duplicate");
    });

    it("allows the same symbol and name in the other namespace", async () => {
        await Effect.runPromise(
            categoriesRepo.create(db, {
                color: "#279AF4",
                icon: "Coffee02",
                income: false,
                name: "Coffee",
            })
        );
        const id = await Effect.runPromise(
            categoriesRepo.create(db, {
                color: "#279AF4",
                icon: "Coffee02",
                income: true,
                name: "Coffee",
            })
        );
        expect(getCategoryById(db, id)).not.toBeNull();
    });

    it("ignores a soft-deleted sibling when checking collisions", async () => {
        const id = await Effect.runPromise(
            categoriesRepo.create(db, {
                color: "#279AF4",
                icon: "Coffee02",
                income: false,
                name: "Coffee",
            })
        );
        await db.update(categories).set({ deletedAt: new Date() }).where(eq(categories.id, id));
        const reused = await Effect.runPromise(
            categoriesRepo.create(db, {
                color: "#279AF4",
                icon: "Coffee02",
                income: false,
                name: "Coffee",
            })
        );
        expect(getCategoryById(db, reused)).not.toBeNull();
    });
});

describe("categoriesRepo.create sortOrder", () => {
    let db: Database;
    beforeEach(() => {
        db = makeDb();
    });

    const make = (name: string, income: boolean, parentId?: string) =>
        Effect.runPromise(
            categoriesRepo.create(db, {
                color: "#279AF4",
                icon: name,
                income,
                name,
                parentId,
            })
        );

    it("starts at 0 and increments within a namespace", async () => {
        const first = await getCategoryById(db, await make("A", false));
        const second = await getCategoryById(db, await make("B", false));
        expect(first?.sortOrder).toBe(0);
        expect(second?.sortOrder).toBe(1);
    });

    it("scopes ordering per income/expense namespace", async () => {
        await make("A", false);
        await make("B", false);
        const income = await getCategoryById(db, await make("Salary", true));
        expect(income?.sortOrder).toBe(0);
    });

    it("scopes ordering to a parent for subcategories", async () => {
        const parentId = await make("Food", false);
        const childA = await getCategoryById(db, await make("Coffee", false, parentId));
        const childB = await getCategoryById(db, await make("Snacks", false, parentId));
        expect(childA?.sortOrder).toBe(0);
        expect(childB?.sortOrder).toBe(1);
    });
});

describe("categoriesRepo.update", () => {
    let db: Database;
    beforeEach(() => {
        db = makeDb();
    });

    it("renames, recolors, and title-cases without touching other fields", async () => {
        const id = await Effect.runPromise(
            categoriesRepo.create(db, {
                color: "#279AF4",
                icon: "Coffee02",
                income: false,
                name: "Coffee",
            })
        );
        await Effect.runPromise(
            categoriesRepo.update(db, id, {
                color: "#EC7A58",
                name: "morning coffee",
            })
        );
        const row = await getCategoryById(db, id);
        expect(row?.name).toBe("Morning Coffee");
        expect(row?.color).toBe("#EC7A58");
        expect(row?.icon).toBe("Coffee02");
        expect(row?.income).toBe(false);
    });

    it("excludes the edited row from its own collision check", async () => {
        const id = await Effect.runPromise(
            categoriesRepo.create(db, {
                color: "#279AF4",
                icon: "Coffee02",
                income: false,
                name: "Coffee",
            })
        );
        await Effect.runPromise(categoriesRepo.update(db, id, { icon: "Coffee02", name: "Coffee" }));
        const row = await getCategoryById(db, id);
        expect(row?.name).toBe("Coffee");
    });

    it("rejects renaming onto a sibling's name", async () => {
        await Effect.runPromise(
            categoriesRepo.create(db, {
                color: "#279AF4",
                icon: "Coffee02",
                income: false,
                name: "Coffee",
            })
        );
        const other = await Effect.runPromise(
            categoriesRepo.create(db, {
                color: "#279AF4",
                icon: "Restaurant02",
                income: false,
                name: "Tea",
            })
        );
        await expect(failureCode(categoriesRepo.update(db, other, { name: "coffee" }))).resolves.toBe("duplicateName");
    });

    it("rejects adopting a sibling's icon", async () => {
        await Effect.runPromise(
            categoriesRepo.create(db, {
                color: "#279AF4",
                icon: "Coffee02",
                income: false,
                name: "Coffee",
            })
        );
        const other = await Effect.runPromise(
            categoriesRepo.create(db, {
                color: "#279AF4",
                icon: "Restaurant02",
                income: false,
                name: "Tea",
            })
        );
        await expect(failureCode(categoriesRepo.update(db, other, { icon: "Coffee02" }))).resolves.toBe(
            "duplicateIcon"
        );
    });

    it("rejects a blank rename", async () => {
        const id = await Effect.runPromise(
            categoriesRepo.create(db, {
                color: "#279AF4",
                icon: "Coffee02",
                income: false,
                name: "Coffee",
            })
        );
        await expect(failureCode(categoriesRepo.update(db, id, { name: "   " }))).resolves.toBe("missingName");
    });

    it("rejects clearing the only symbol of a symbol-bearing row", async () => {
        const id = await Effect.runPromise(
            categoriesRepo.create(db, {
                color: "#279AF4",
                icon: "Coffee02",
                income: false,
                name: "Coffee",
            })
        );
        await expect(failureCode(categoriesRepo.update(db, id, { icon: "" }))).resolves.toBe("missingIcon");
    });

    it("allows renaming a legacy symbol-less row", async () => {
        const now = new Date();
        await db.insert(categories).values({
            color: "#279AF4",
            dateCreated: now,
            deletedAt: null,
            emoji: null,
            icon: null,
            id: "legacy",
            income: false,
            name: "Legacy",
            parentId: null,
            sortOrder: 0,
            updatedAt: now,
        });
        await Effect.runPromise(categoriesRepo.update(db, "legacy", { name: "renamed" }));
        const row = await getCategoryById(db, "legacy");
        expect(row?.name).toBe("Renamed");
    });
});

describe("categoriesRepo.reorder", () => {
    let db: Database;
    beforeEach(() => {
        db = makeDb();
    });

    it("persists sortOrder as the array index", async () => {
        const a = await Effect.runPromise(
            categoriesRepo.create(db, {
                color: "#279AF4",
                icon: "IconA",
                income: false,
                name: "A",
            })
        );
        const b = await Effect.runPromise(
            categoriesRepo.create(db, {
                color: "#279AF4",
                icon: "IconB",
                income: false,
                name: "B",
            })
        );
        const c = await Effect.runPromise(
            categoriesRepo.create(db, {
                color: "#279AF4",
                icon: "IconC",
                income: false,
                name: "C",
            })
        );

        await Effect.runPromise(categoriesRepo.reorder(db, [c, a, b]));

        expect((await getCategoryById(db, c))?.sortOrder).toBe(0);
        expect((await getCategoryById(db, a))?.sortOrder).toBe(1);
        expect((await getCategoryById(db, b))?.sortOrder).toBe(2);
    });

    it("writes every position or none, rather than leaving two sharing one", async () => {
        const rollbackDb = transactionalDatabase();
        const a = await Effect.runPromise(
            categoriesRepo.create(rollbackDb, {
                color: "#279AF4",
                icon: "IconA",
                income: false,
                name: "A",
            })
        );
        const b = await Effect.runPromise(
            categoriesRepo.create(rollbackDb, {
                color: "#279AF4",
                icon: "IconB",
                income: false,
                name: "B",
            })
        );
        const c = await Effect.runPromise(
            categoriesRepo.create(rollbackDb, {
                color: "#279AF4",
                icon: "IconC",
                income: false,
                name: "C",
            })
        );

        await expect(
            Effect.runPromise(categoriesRepo.reorder(rollbackDb, [c, a, { notAnId: true } as unknown as string]))
        ).rejects.toThrow();

        expect((await getCategoryById(rollbackDb, c))?.sortOrder).toBe(2);
        expect((await getCategoryById(rollbackDb, a))?.sortOrder).toBe(0);
        expect((await getCategoryById(rollbackDb, b))?.sortOrder).toBe(1);
    });
});

describe("categoriesRepo.setParent", () => {
    let db: Database;
    beforeEach(() => {
        db = makeDb();
    });

    it("nests a top-level category under a parent, appending in scope", async () => {
        const parent = await Effect.runPromise(
            categoriesRepo.create(db, {
                color: "#279AF4",
                icon: "IconFood",
                income: false,
                name: "Food",
            })
        );
        await Effect.runPromise(
            categoriesRepo.create(db, {
                color: "#279AF4",
                icon: "IconCoffee",
                income: false,
                name: "Coffee",
                parentId: parent,
            })
        );
        const moving = await Effect.runPromise(
            categoriesRepo.create(db, {
                color: "#279AF4",
                icon: "IconSnacks",
                income: false,
                name: "Snacks",
            })
        );

        await Effect.runPromise(categoriesRepo.setParent(db, moving, parent));

        const row = await getCategoryById(db, moving);
        expect(row?.parentId).toBe(parent);
        expect(row?.sortOrder).toBe(1);
    });

    it("inherits the destination parent's income namespace", async () => {
        const incomeParent = await Effect.runPromise(
            categoriesRepo.create(db, {
                color: "#279AF4",
                icon: "IconEarnings",
                income: true,
                name: "Earnings",
            })
        );
        const expenseChild = await Effect.runPromise(
            categoriesRepo.create(db, {
                color: "#279AF4",
                icon: "IconBonus",
                income: false,
                name: "Bonus",
            })
        );

        await Effect.runPromise(categoriesRepo.setParent(db, expenseChild, incomeParent));

        const row = await getCategoryById(db, expenseChild);
        expect(row?.income).toBe(true);
        expect(row?.parentId).toBe(incomeParent);
    });

    it("promotes a subcategory back to the top level", async () => {
        const parent = await Effect.runPromise(
            categoriesRepo.create(db, {
                color: "#279AF4",
                icon: "IconFood",
                income: false,
                name: "Food",
            })
        );
        const child = await Effect.runPromise(
            categoriesRepo.create(db, {
                color: "#279AF4",
                icon: "IconCoffee",
                income: false,
                name: "Coffee",
                parentId: parent,
            })
        );

        await Effect.runPromise(categoriesRepo.setParent(db, child, null));

        const row = await getCategoryById(db, child);
        expect(row?.parentId).toBeNull();
    });
});

describe("suggestedCategoriesNotAdded", () => {
    let db: Database;
    beforeEach(() => {
        db = makeDb();
    });

    it("excludes a preset whose name is already used", async () => {
        await Effect.runPromise(
            categoriesRepo.create(db, {
                color: "#279AF4",
                icon: "SomeOtherIcon",
                income: false,
                name: "coffee",
            })
        );
        const remaining = await Effect.runPromise(suggestedCategoriesNotAdded(db, false));
        expect(!remaining.some((preset) => preset.name === "Coffee")).toBeTruthy();
        expect(remaining).toHaveLength(SUGGESTED_CATEGORY_PRESETS.expense.length - 1);
    });

    it("excludes a preset whose icon is already used", async () => {
        await Effect.runPromise(
            categoriesRepo.create(db, {
                color: "#279AF4",
                icon: "Coffee02",
                income: false,
                name: "Java",
            })
        );
        const remaining = await Effect.runPromise(suggestedCategoriesNotAdded(db, false));
        expect(!remaining.some((preset) => preset.icon === "Coffee02")).toBeTruthy();
    });

    it("scopes the filter to the requested namespace", async () => {
        await Effect.runPromise(
            categoriesRepo.create(db, {
                color: "#279AF4",
                icon: "Coffee02",
                income: false,
                name: "Coffee",
            })
        );
        const income = await Effect.runPromise(suggestedCategoriesNotAdded(db, true));
        expect(income).toHaveLength(SUGGESTED_CATEGORY_PRESETS.income.length);
    });
});

describe("categoriesRepo.addSuggested", () => {
    let db: Database;
    beforeEach(() => {
        db = makeDb();
    });

    it("adds a preset and skips it on a second attempt", async () => {
        const [preset] = SUGGESTED_CATEGORY_PRESETS.expense;
        const id = await Effect.runPromise(
            categoriesRepo.addSuggested(db, {
                color: preset.color,
                icon: preset.icon,
                income: false,
                name: preset.name,
            })
        );
        expect(id).not.toBeNull();
        const row = await getCategoryById(db, id as string);
        expect(row?.name).toBe(capitalizeCategoryName(preset.name));
        expect(row?.icon).toBe(preset.icon);
        expect(row?.sortOrder).toBe(0);

        const second = await Effect.runPromise(
            categoriesRepo.addSuggested(db, {
                color: preset.color,
                icon: preset.icon,
                income: false,
                name: preset.name,
            })
        );
        expect(second).toBeNull();
    });
});

describe("categoriesRepo.remove cascade", () => {
    let db: Database;
    beforeEach(() => {
        db = makeDb();
    });

    it("tombstones the category and its transactions", async () => {
        const id = await Effect.runPromise(
            categoriesRepo.create(db, {
                color: "#279AF4",
                icon: "Coffee02",
                income: false,
                name: "Coffee",
            })
        );
        await addTransaction(db, id);
        await addTransaction(db, id);

        await Effect.runPromise(categoriesRepo.remove(db, id));

        expect(getCategoryById(db, id)).toBeNull();
        const categoryRows = await db.select().from(categories).where(eq(categories.id, id));
        expect(categoryRows).toHaveLength(1);
        expect(categoryRows[0].deletedAt).not.toBeNull();

        const readable = await db
            .select()
            .from(transactions)
            .where(and(eq(transactions.categoryId, id), isNull(transactions.deletedAt)));
        expect(readable).toHaveLength(0);
        const replicable = await db.select().from(transactions).where(eq(transactions.categoryId, id));
        expect(replicable).toHaveLength(2);
        for (const row of replicable) {
            expect(row.deletedAt).not.toBeNull();
        }
    });

    it("retires the schedule and releases the photo of each cascaded transaction", async () => {
        const id = await Effect.runPromise(
            categoriesRepo.create(db, {
                color: "#279AF4",
                icon: "Coffee02",
                income: false,
                name: "Coffee",
            })
        );
        await addTransaction(db, id, {
            imageUri: "file:///photos/tx.jpg",
            onceRecurring: true,
            recurringType: 2,
        });

        await Effect.runPromise(categoriesRepo.remove(db, id));

        const [row] = await db.select().from(transactions).where(eq(transactions.categoryId, id));
        expect(row.imageUri).toBeNull();
        expect(row.recurringType).toBe(0);
        expect(row.note).toBe("Flat white");
        expect(row.amount).toBe(10);
    });

    it("does not re-stamp what it already tombstoned", async () => {
        const id = await Effect.runPromise(
            categoriesRepo.create(db, {
                color: "#279AF4",
                icon: "Coffee02",
                income: false,
                name: "Coffee",
            })
        );
        await addTransaction(db, id);

        await Effect.runPromise(categoriesRepo.remove(db, id));
        const first = await db.select().from(transactions);
        const firstCategory = await db.select().from(categories);

        await Effect.runPromise(categoriesRepo.remove(db, id));

        const second = await db.select().from(transactions);
        expect(second[0].deletedAt?.getTime()).toBe(first[0].deletedAt?.getTime());
        expect(second[0].updatedAt.getTime()).toBe(first[0].updatedAt.getTime());
        const secondCategory = await db.select().from(categories);
        expect(secondCategory[0].deletedAt?.getTime()).toBe(firstCategory[0].deletedAt?.getTime());
        expect(secondCategory[0].updatedAt.getTime()).toBe(firstCategory[0].updatedAt.getTime());
    });

    it("promotes subcategories to the top level", async () => {
        const parentId = await Effect.runPromise(
            categoriesRepo.create(db, {
                color: "#279AF4",
                icon: "IconFood",
                income: false,
                name: "Food",
            })
        );
        const childId = await Effect.runPromise(
            categoriesRepo.create(db, {
                color: "#279AF4",
                icon: "IconCoffee",
                income: false,
                name: "Coffee",
                parentId,
            })
        );

        await Effect.runPromise(categoriesRepo.remove(db, parentId));

        const child = await getCategoryById(db, childId);
        expect(child).not.toBeNull();
        expect(child?.parentId).toBeNull();
    });

    it("tombstones a budget attached to the category", async () => {
        const id = await Effect.runPromise(
            categoriesRepo.create(db, {
                color: "#279AF4",
                icon: "Coffee02",
                income: false,
                name: "Coffee",
            })
        );
        const now = new Date();
        await db.insert(budgets).values({
            amount: 100,
            categoryId: id,
            id: "b1",
            name: "Coffee budget",
            type: 2,
            updatedAt: now,
        });

        await Effect.runPromise(categoriesRepo.remove(db, id));

        const readable = await db
            .select()
            .from(budgets)
            .where(and(eq(budgets.categoryId, id), isNull(budgets.deletedAt)));
        expect(readable).toHaveLength(0);
        const replicable = await db.select().from(budgets).where(eq(budgets.id, "b1"));
        expect(replicable).toHaveLength(1);
        expect(replicable[0].deletedAt).not.toBeNull();
    });

    it("tombstones the category's monthly plans so peers drop them too", async () => {
        const id = await Effect.runPromise(
            categoriesRepo.create(db, { color: "#279AF4", icon: "Coffee02", income: false, name: "Coffee" })
        );
        await db
            .insert(budgetPlans)
            .values({ amount: 80, categoryId: id, currency: "USD", id: "p1", month: 202_611, updatedAt: new Date() });

        await Effect.runPromise(categoriesRepo.remove(db, id));

        const [plan] = await db.select().from(budgetPlans).where(eq(budgetPlans.id, "p1"));
        expect(plan.deletedAt).not.toBeNull();
    });

    it("lets the category hold a budget again after the cascade", async () => {
        const id = await Effect.runPromise(
            categoriesRepo.create(db, {
                color: "#279AF4",
                icon: "Coffee02",
                income: false,
                name: "Coffee",
            })
        );
        const now = new Date();
        await db.insert(budgets).values({
            amount: 100,
            categoryId: id,
            id: "b1",
            type: 2,
            updatedAt: now,
        });

        await Effect.runPromise(categoriesRepo.remove(db, id));

        // What a pull does with a peer's budget for the same category: the
        // tombstone must not still be holding `budgets_categoryId_unique`, or the
        // insert throws and takes the whole apply transaction with it.
        await db.insert(budgets).values({
            amount: 250,
            categoryId: id,
            id: "b2",
            type: 2,
            updatedAt: now,
        });

        const live = await db
            .select()
            .from(budgets)
            .where(and(eq(budgets.categoryId, id), isNull(budgets.deletedAt)));
        expect(live.map((row) => row.id)).toStrictEqual(["b2"]);
    });
});

describe("seedCategories idempotency", () => {
    let db: Database;
    beforeEach(() => {
        db = makeDb();
    });

    it("seeds one full set on a fresh store", async () => {
        await Effect.runPromise(seedCategories(db));

        const rows = await db.select().from(categories);
        expect(rows.length > 0).toBeTruthy();
        expect(rows).toHaveLength(SEEDED_CATEGORY_NAMES.expense.length + SEEDED_CATEGORY_NAMES.income.length);
    });

    it("does not seed a second set when run again", async () => {
        await Effect.runPromise(seedCategories(db));
        const first = await db.select().from(categories);

        await Effect.runPromise(seedCategories(db));
        const second = await db.select().from(categories);

        // bootstrap writes the firstLaunch marker only after seeding returns, so a
        // crash in between would otherwise double the whole category set.
        expect(second).toHaveLength(first.length);
        expect(second.map((row) => row.id).sort()).toStrictEqual(first.map((row) => row.id).sort());
    });

    it("leaves a store that already has categories untouched", async () => {
        const id = await Effect.runPromise(
            categoriesRepo.create(db, {
                color: "#279AF4",
                icon: "Coffee02",
                income: false,
                name: "Coffee",
            })
        );

        await Effect.runPromise(seedCategories(db));

        const rows = await db.select().from(categories);
        expect(rows).toHaveLength(1);
        expect(rows[0]?.id).toBe(id);
    });

    it("mints the same ids on two independent installs", async () => {
        const other = makeDb();
        await Effect.runPromise(seedCategories(db));
        await Effect.runPromise(seedCategories(other));

        const identify = async (target: Database) => {
            const rows = await target.select().from(categories);
            return rows.map((row) => `${row.income ? "income" : "expense"} ${row.name} ${row.id}`).sort();
        };

        await expect(identify(db)).resolves.toStrictEqual(await identify(other));
    });
});
