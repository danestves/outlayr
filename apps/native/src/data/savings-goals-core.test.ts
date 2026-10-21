import { beforeEach, describe, expect, it } from "@jest/globals";
import { eq } from "drizzle-orm";

import type { Database } from "@/db/client";
import { accounts, exchangeRates, savingsGoals } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";

import { GoalValuationError, savingsGoalsQuery, savingsGoalsRepo } from "./savings-goals-core";

const AUTHORED = new Date("2026-03-04T10:00:00.000Z");

async function withRate(quote: string, rate: number): Promise<void> {
    await db.insert(exchangeRates).values({
        date: "2026-01-01",
        fetchedAt: AUTHORED.getTime(),
        quote,
        rate,
        rateType: "official",
        source: "test",
    });
}

const DUE = new Date("2027-03-04T10:00:00.000Z");
let db: Database;

beforeEach(() => {
    db = migratedDatabase();
    db.insert(accounts)
        .values({
            currency: "USD",
            dateCreated: AUTHORED,
            id: "savings",
            initialBalance: 0,
            initialBalanceDate: AUTHORED,
            name: "Savings",
            updatedAt: AUTHORED,
        })
        .run();
});

function goal(overrides: Partial<Parameters<typeof savingsGoalsRepo.create>[1]> = {}) {
    return savingsGoalsRepo.create(db, {
        accountId: "savings",
        currency: "USD",
        name: "Emergency fund",
        startAmount: 0,
        targetAmount: 5000,
        targetDate: DUE,
        ...overrides,
    });
}

describe("savings goals", () => {
    it("orders goals by their sort position", async () => {
        await goal({ name: "First" });
        await goal({ name: "Second" });
        const rows = await savingsGoalsQuery(db);
        expect(rows.map((row) => row.name)).toStrictEqual(["First", "Second"]);
    });

    it("keeps a deleted goal out of every read", async () => {
        const id = await goal();
        await savingsGoalsRepo.remove(db, id);
        await expect(savingsGoalsQuery(db)).resolves.toStrictEqual([]);
    });

    it("holds the balance the goal opened against through an unrelated edit", async () => {
        const id = await goal({ startAmount: 1200 });
        const [opened] = await savingsGoalsQuery(db);
        expect(opened.startAmount).toBe(1200);

        await savingsGoalsRepo.update(db, id, { targetAmount: 6000 });
        const [raised] = await savingsGoalsQuery(db);
        expect(raised.startAmount).toBe(1200);
        expect(raised.startAmountUsd).toBe(opened.startAmountUsd);
    });

    it("leaves an untouched target exactly as stored, currency and all", async () => {
        await withRate("EUR", 0.9);
        const id = await goal({ currency: "EUR", targetAmount: 1000 });
        const [before] = await savingsGoalsQuery(db);

        await savingsGoalsRepo.update(db, id, { targetDate: new Date("2027-09-04T10:00:00.000Z") });

        const [after] = await savingsGoalsQuery(db);
        expect(after.targetAmount).toBe(1000);
        expect(after.currency).toBe("EUR");
        expect(after.targetAmountUsd).toBe(before.targetAmountUsd);
        expect(after.targetDate.getTime()).toBe(new Date("2027-09-04T10:00:00.000Z").getTime());
    });

    it("keeps a goal in the currency it was set in, whatever is retyped", async () => {
        await withRate("EUR", 0.9);
        const id = await goal({ currency: "EUR", startAmount: 500, targetAmount: 1000 });

        await savingsGoalsRepo.update(db, id, { targetAmount: 1200 });

        const [after] = await savingsGoalsQuery(db);
        expect(after.targetAmount).toBe(1200);
        expect(after.currency).toBe("EUR");
        expect(after.startAmount).toBe(500);
    });

    it("freezes a zero anchor as zero USD, not as an unconvertible null", async () => {
        await withRate("EUR", 0.9);
        await goal({ currency: "EUR", startAmount: 0, targetAmount: 1000 });

        const [row] = await savingsGoalsQuery(db);
        expect(row.startAmountUsd).toBe(0);
    });

    it("falls back to the pair when a peer cleared the goal's rate", async () => {
        await withRate("EUR", 0.8);
        const id = await goal({ currency: "EUR", targetAmount: 1000 });
        await db.update(savingsGoals).set({ exchangeRate: null }).where(eq(savingsGoals.id, id));
        const [before] = await savingsGoalsQuery(db);
        const rate = before.targetAmount / (before.targetAmountUsd ?? 1);

        await db.delete(exchangeRates).run?.();
        await withRate("EUR", 0.5);
        await savingsGoalsRepo.update(db, id, { targetAmount: 2000 });

        const [after] = await savingsGoalsQuery(db);
        expect(after.targetAmount / (after.targetAmountUsd ?? 1)).toBeCloseTo(rate, 8);
    });

    it("goes with the account it tracks", async () => {
        await goal();
        db.run?.("DELETE FROM accounts WHERE id = 'savings'");
        await expect(savingsGoalsQuery(db)).resolves.toStrictEqual([]);
    });

    it("refuses a goal whose figures cannot be valued in USD", async () => {
        await expect(goal({ currency: "VES", startAmount: 100, targetAmount: 5000 })).rejects.toThrow(
            GoalValuationError
        );
        await expect(savingsGoalsQuery(db)).resolves.toStrictEqual([]);
    });

    it("restates a target at the rate the goal was frozen against, not today's history", async () => {
        await withRate("EUR", 0.8);
        const id = await goal({ currency: "EUR", targetAmount: 1000 });
        const [before] = await savingsGoalsQuery(db);
        const rate = before.targetAmount / (before.targetAmountUsd ?? 1);

        // A different rate is all that survives by the time the target is re-typed.
        await db.delete(exchangeRates).run?.();
        await withRate("EUR", 0.5);
        await savingsGoalsRepo.update(db, id, { targetAmount: 2000 });

        const [after] = await savingsGoalsQuery(db);
        expect(after.targetAmount / (after.targetAmountUsd ?? 1)).toBeCloseTo(rate, 8);
    });

    it("refuses to update a goal that is not there", async () => {
        await expect(savingsGoalsRepo.update(db, "missing", { name: "x" })).rejects.toThrow("not found");
    });
});
