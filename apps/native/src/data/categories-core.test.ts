import { and, eq, isNull } from "drizzle-orm";
import * as Effect from "effect/Effect";
import { beforeEach, describe, expect, it } from "vite-plus/test";

import type { Database } from "@/db/client";
import { categories } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";
import { translateIn } from "@/i18n/runtime";

import {
    categoriesRepo,
    ensureCategoryByName,
    pickFreeCategoryIcon,
    presetLabelUpdates,
    presetsNotAdded,
    SEEDED_CATEGORY_NAMES,
    seedCategories,
    seededCategoryId,
    SUGGESTED_CATEGORY_PRESETS,
} from "./categories-core";
import type { Category } from "./categories-core";

async function liveCategories(db: Database, income: boolean): Promise<Category[]> {
    return db
        .select()
        .from(categories)
        .where(and(eq(categories.income, income), isNull(categories.deletedAt)));
}

describe("ensureCategoryByName", () => {
    let db: Database;

    beforeEach(() => {
        db = migratedDatabase();
    });

    it("creates a category when nothing in the namespace answers to the name", async () => {
        const id = await Effect.runPromise(ensureCategoryByName(db, "Entertainment", false, "FilmRoll01", "#AF52DE"));
        const rows = await liveCategories(db, false);
        expect(rows).toHaveLength(1);
        expect(rows[0].id).toBe(id);
        expect(rows[0].name).toBe("Entertainment");
        expect(rows[0].icon).toBe("FilmRoll01");
    });

    it("resolves to the existing category on a same-namespace name collision instead of duplicating it", async () => {
        const first = await Effect.runPromise(
            categoriesRepo.create(db, {
                color: "#AF52DE",
                icon: "FilmRoll01",
                income: false,
                name: "Entertainment",
            })
        );

        const second = await Effect.runPromise(ensureCategoryByName(db, "entertainment", false, "Tv01", "#000000"));

        expect(second).toBe(first);
        await expect(liveCategories(db, false)).resolves.toHaveLength(1);
    });

    it("files a merchant-map name under the ledger's translated preset instead of adding it again", async () => {
        await Effect.runPromise(seedCategories(db, "es"));

        const id = await Effect.runPromise(ensureCategoryByName(db, "Groceries", false, "ShoppingCart01", "#53915A"));

        expect(id).toBe(seededCategoryId("Groceries", false));
        await expect(liveCategories(db, false)).resolves.toHaveLength(SEEDED_CATEGORY_NAMES.expense.length);
    });

    it("treats expense and income as separate namespaces", async () => {
        const expenseId = await Effect.runPromise(ensureCategoryByName(db, "Gifts", false, "Gift", "#FF375F"));
        const incomeId = await Effect.runPromise(ensureCategoryByName(db, "Gifts", true, "GiftCard", "#E5484D"));

        expect(expenseId).not.toBe(incomeId);
        await expect(liveCategories(db, false)).resolves.toHaveLength(1);
        await expect(liveCategories(db, true)).resolves.toHaveLength(1);
    });
});

describe("pickFreeCategoryIcon", () => {
    it("returns the preferred icon when no sibling already uses it", () => {
        const siblings: Category[] = [];
        expect(pickFreeCategoryIcon(siblings, "FilmRoll01")).toBe("FilmRoll01");
    });

    it("falls back to the first unused preset icon when the preferred icon collides", () => {
        const taken: Category = {
            color: "#AF52DE",
            dateCreated: new Date(0),
            deletedAt: null,
            emoji: null,
            icon: "FilmRoll01",
            id: "c1",
            income: false,
            name: "Entertainment",
            parentId: null,
            preset: null,
            sortOrder: 0,
            updatedAt: new Date(0),
        };

        const result = pickFreeCategoryIcon([taken], "FilmRoll01");

        expect(result).not.toBe("FilmRoll01");
        const allPresetIcons = [...SUGGESTED_CATEGORY_PRESETS.expense, ...SUGGESTED_CATEGORY_PRESETS.income].map(
            (preset) => preset.icon
        );
        expect(allPresetIcons).toContain(result);
    });
});

describe("presetLabelUpdates", () => {
    const seededAt = new Date(1000);
    const now = new Date(5000);
    const groceries = (overrides: Partial<Category> = {}) => ({
        dateCreated: seededAt,
        id: seededCategoryId("Groceries", false),
        income: false,
        name: "Groceries",
        preset: null,
        updatedAt: seededAt,
        ...overrides,
    });

    it("translates an untouched English seed and keeps it reading as untouched", () => {
        expect(presetLabelUpdates([groceries()], "es", null, now)).toStrictEqual([
            {
                id: seededCategoryId("Groceries", false),
                set: { dateCreated: now, name: "Supermercado", preset: "Groceries", updatedAt: now },
            },
        ]);
    });

    it("marks a renamed seed with its preset without renaming or restamping it", () => {
        const renamed = groceries({ name: "Food", updatedAt: new Date(2000) });

        expect(presetLabelUpdates([renamed], "es", null, now)).toStrictEqual([
            { id: renamed.id, set: { preset: "Groceries" } },
        ]);
    });

    it("translates only from English or this device's previous language", () => {
        const fromPeer = groceries({ name: "Courses", preset: "Groceries", updatedAt: new Date(2000) });
        const fromSelf = groceries({ name: "Supermercado", preset: "Groceries", updatedAt: new Date(2000) });

        expect(presetLabelUpdates([fromPeer], "es", "es", now)).toStrictEqual([]);
        expect(presetLabelUpdates([fromSelf], "fr", "es", now)).toStrictEqual([
            { id: fromSelf.id, set: { name: "Courses", preset: "Groceries", updatedAt: now } },
        ]);
    });
});

describe("presetsNotAdded", () => {
    it("hides a preset the ledger already has under another name", () => {
        const remaining = presetsNotAdded(false, [{ icon: "Pizza01", name: "Comida", preset: "Groceries" }], (key) =>
            translateIn("es", key)
        );

        expect(remaining.map((preset) => preset.name)).not.toContain("Groceries");
    });
});
