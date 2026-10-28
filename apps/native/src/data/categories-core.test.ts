import { and, eq, isNull } from "drizzle-orm";
import * as Effect from "effect/Effect";
import { beforeEach, describe, expect, it } from "vite-plus/test";

import type { Database } from "@/db/client";
import { categories } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";

import {
    categoriesRepo,
    ensureCategoryByName,
    pickFreeCategoryIcon,
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
