import { beforeEach, describe, expect, it } from "vite-plus/test";

import type { Database } from "@/db/client";
import { categories, transactions } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";

import { RECENT_CATEGORY_LIMIT, recentCategoryIdsQuery } from "./category-recents";

let clock = 0;

function nextTick(): number {
    clock += 1;
    return clock;
}

function log(
    db: Database,
    categoryId: string | null,
    options: { income?: boolean; deleted?: boolean; at?: number } = {}
): void {
    const at = options.at ?? nextTick();
    const date = new Date(at * 1000);
    if (categoryId != null) {
        db.insert(categories)
            .values({
                id: categoryId,
                income: options.income ?? false,
                name: categoryId,
                sortOrder: 0,
                updatedAt: date,
            })
            .onConflictDoNothing()
            .run();
    }
    db.insert(transactions)
        .values({
            amount: 10,
            categoryId,
            date,
            day: date,
            deletedAt: options.deleted === true ? date : null,
            id: `tx-${at}-${categoryId ?? "none"}`,
            income: options.income ?? false,
            month: date,
            note: "",
            updatedAt: date,
        })
        .run();
}

function ids(db: Database, income: boolean, limit = RECENT_CATEGORY_LIMIT): string[] {
    return recentCategoryIdsQuery(db, income, limit)
        .all()
        .map((row) => row.categoryId)
        .filter((id): id is string => id != null);
}

beforeEach(() => {
    clock = 0;
});

describe("recentCategoryIdsQuery", () => {
    it("lists a category once, ranked by its newest transaction", () => {
        const db = migratedDatabase();
        log(db, "groceries");
        log(db, "rent");
        log(db, "groceries");
        expect(ids(db, false)).toStrictEqual(["groceries", "rent"]);
    });

    it("ignores soft-deleted transactions", () => {
        const db = migratedDatabase();
        log(db, "rent");
        log(db, "groceries", { deleted: true });
        expect(ids(db, false)).toStrictEqual(["rent"]);
    });

    it("keeps the two namespaces apart", () => {
        const db = migratedDatabase();
        log(db, "groceries", { income: false });
        log(db, "paycheck", { income: true });
        expect(ids(db, false)).toStrictEqual(["groceries"]);
        expect(ids(db, true)).toStrictEqual(["paycheck"]);
    });

    it("caps the list at the requested limit", () => {
        const db = migratedDatabase();
        for (const name of ["a", "b", "c", "d", "e", "f", "g"]) {
            log(db, name);
        }
        expect(ids(db, false, 5)).toHaveLength(5);
        expect(ids(db, false, 5)[0]).toBe("g");
    });
});
