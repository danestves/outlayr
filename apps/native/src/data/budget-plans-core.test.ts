import { eq } from "drizzle-orm";
import * as Effect from "effect/Effect";
import { beforeEach, describe, expect, it } from "vite-plus/test";

import type { Database } from "@/db/client";
import { budgetPlans, categories } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";

import { budgetPlanId, budgetPlansQuery, setPlanMonths } from "./budget-plans-core";

describe("setPlanMonths", () => {
    let db: Database;

    beforeEach(async () => {
        db = migratedDatabase();
        await db
            .insert(categories)
            .values({ id: "food", income: false, name: "Food", sortOrder: 0, updatedAt: new Date(1) });
    });

    const plan = (amounts: [number, number | null][]) =>
        Effect.runPromise(setPlanMonths(db, { amounts: new Map(amounts), categoryId: "food", currency: "USD" }));

    it("writes one row per month and edits it in place on the next save", async () => {
        await plan([
            [202_703, 400],
            [202_704, 420],
        ]);
        await plan([[202_703, 350]]);
        const rows = await budgetPlansQuery(db, 202_701, 202_712);
        expect(rows.map((row) => [row.month, row.amount]).sort()).toStrictEqual([
            [202_703, 350],
            [202_704, 420],
        ]);
    });

    it("revives a tombstoned month with a restore stamp, or the tombstone would win the sync", async () => {
        await plan([[202_703, 400]]);
        const id = budgetPlanId("food", 202_703);
        await db
            .update(budgetPlans)
            .set({ deletedAt: new Date(5), updatedAt: new Date(5) })
            .where(eq(budgetPlans.id, id));
        await plan([[202_703, 300]]);
        const [row] = await db.select().from(budgetPlans).where(eq(budgetPlans.id, id));
        expect(row.deletedAt).toBeNull();
        expect(row.amount).toBe(300);
        expect(row.restoredAt?.getTime()).toBeGreaterThan(5);
    });
});
