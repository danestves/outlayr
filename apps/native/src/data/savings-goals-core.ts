import { asc, eq, isNull, max } from "drizzle-orm";

import type { Database } from "@/db/client";
import { savingsGoals } from "@/db/schema";
import { newId } from "@/domain/ids";

import { frozenUsd } from "./frozen-usd";

export type SavingsGoal = typeof savingsGoals.$inferSelect;

export type SavingsGoalPatch = Partial<Omit<SavingsGoalInput, "accountId" | "currency" | "startAmount">>;

export interface SavingsGoalInput {
    accountId: string;
    currency: string;
    name: string;
    /** In `currency`, from the caller: only the screen holds the valued balance the reader just saw. */
    startAmount: number;
    targetAmount: number;
    targetDate: Date;
}

export function savingsGoalsQuery(db: Database) {
    return db.select().from(savingsGoals).where(isNull(savingsGoals.deletedAt)).orderBy(asc(savingsGoals.sortOrder));
}

// `frozenInDisplay` reads a null `*Usd` as the FACE value, so a goal saved without one turns permanently wrong the day
// the ledger's currency changes. Refusing is the only safe outcome.
export class GoalValuationError extends Error {
    constructor() {
        super("A goal's amounts could not be valued in USD.");
        this.name = "GoalValuationError";
    }
}

// Uses the goal's stored rate, not a fresh lookup: rate history is pruned to one row per month outside 90 days
// (`pruneStaleBatch`), so a lookup for an old `dateCreated` can land on another month. Not the rounded amount pair
// either: scaling a small target up multiplies its rounding. The rate is currency-per-USD.
async function refrozen(db: Database, existing: SavingsGoal, amount: number): Promise<number> {
    const { currency, dateCreated, exchangeRate } = existing;
    if (currency === "USD") {
        return amount;
    }
    if (exchangeRate !== null && exchangeRate !== 0) {
        return amount / exchangeRate;
    }
    // Written before the rate was stored: the rounded pair beats a lookup that may now resolve to another day.
    const { targetAmount, targetAmountUsd } = existing;
    if (targetAmountUsd !== null && targetAmount !== 0 && targetAmountUsd !== 0) {
        return (amount * targetAmountUsd) / targetAmount;
    }
    const { amountUsd } = await frozenUsd(db, amount, currency, dateCreated);
    if (amountUsd === null) {
        throw new GoalValuationError();
    }
    return amountUsd;
}

async function nextSortOrder(db: Database): Promise<number> {
    const [row] = await db.select({ highest: max(savingsGoals.sortOrder) }).from(savingsGoals);
    return (row?.highest ?? -1) + 1;
}

export const savingsGoalsRepo = {
    async create(db: Database, input: SavingsGoalInput): Promise<string> {
        const now = new Date();
        const id = newId();
        // Both checked before writing: a balance the screen can display isn't always one that can be canonicalised.
        const start = await frozenUsd(db, input.startAmount, input.currency, now);
        const target = await frozenUsd(db, input.targetAmount, input.currency, now);
        if (start.amountUsd === null || target.amountUsd === null) {
            throw new GoalValuationError();
        }
        // The target's, because a zero start never consults a rate at all.
        const exchangeRate = target.exchangeRate ?? start.exchangeRate;
        await db.insert(savingsGoals).values({
            accountId: input.accountId,
            currency: input.currency,
            dateCreated: now,
            deletedAt: null,
            exchangeRate,
            id,
            name: input.name,
            sortOrder: await nextSortOrder(db),
            startAmount: input.startAmount,
            startAmountUsd: start.amountUsd,
            targetAmount: input.targetAmount,
            targetAmountUsd: target.amountUsd,
            targetDate: input.targetDate,
            updatedAt: now,
        });
        return id;
    },

    async remove(db: Database, id: string, now: Date = new Date()): Promise<void> {
        await db.update(savingsGoals).set({ deletedAt: now, updatedAt: now }).where(eq(savingsGoals.id, id));
    },

    async update(db: Database, id: string, patch: SavingsGoalPatch): Promise<void> {
        const [existing] = await db.select().from(savingsGoals).where(eq(savingsGoals.id, id));
        if (existing == null) {
            throw new Error("Savings goal not found.");
        }
        const now = new Date();
        const targetAmount = patch.targetAmount ?? existing.targetAmount;
        const { currency } = existing;
        const restated = targetAmount !== existing.targetAmount;
        // Currency and start anchor aren't patchable: anchor, frozen USD and valuation date must describe one moment.
        await db
            .update(savingsGoals)
            .set({
                ...patch,
                currency,
                targetAmount,
                // Frozen against the goal's OWN date: every figure it holds is read back through `dateCreated`.
                targetAmountUsd: restated ? await refrozen(db, existing, targetAmount) : existing.targetAmountUsd,
                updatedAt: now,
            })
            .where(eq(savingsGoals.id, id));
    },
};
