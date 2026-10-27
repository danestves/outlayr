import { asc, eq, isNull, max } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

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

const SavingsGoalsOperation = Schema.Literals(["create", "remove", "update"]);

export class SavingsGoalsError extends Schema.TaggedError<SavingsGoalsError>()("SavingsGoalsError", {
    cause: Schema.optional(Schema.Defect()),
    operation: SavingsGoalsOperation,
    reason: Schema.optional(Schema.Literals(["missing"])),
}) {
    override get message(): string {
        return this.reason === "missing" ? "Savings goal not found." : `Savings goal ${this.operation} failed`;
    }
}

// `frozenInDisplay` reads a null `*Usd` as the FACE value, so a goal saved without one turns permanently wrong the day
// the ledger's currency changes. Refusing is the only safe outcome.
export class GoalValuationError extends Schema.TaggedError<GoalValuationError>()("GoalValuationError", {}) {
    // oxlint-disable-next-line class-methods-use-this -- the fixed sentence is the copy the goal screens log
    override get message(): string {
        return "A goal's amounts could not be valued in USD.";
    }
}

const query = <A>(operation: typeof SavingsGoalsOperation.Type, run: () => PromiseLike<A>) =>
    Effect.tryPromise({ catch: (cause) => new SavingsGoalsError({ cause, operation }), try: run });

// Uses the goal's stored rate, not a fresh lookup: rate history is pruned to one row per month outside 90 days
// (`pruneStaleBatch`), so a lookup for an old `dateCreated` can land on another month. Not the rounded amount pair
// either: scaling a small target up multiplies its rounding. The rate is currency-per-USD.
const refrozen = Effect.fn("SavingsGoals.refrozen")(function* refrozen(
    db: Database,
    existing: SavingsGoal,
    amount: number
) {
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
    const { amountUsd } = yield* frozenUsd(db, amount, currency, dateCreated);
    if (amountUsd === null) {
        return yield* new GoalValuationError();
    }
    return amountUsd;
});

const nextSortOrder = Effect.fn("SavingsGoals.nextSortOrder")(function* nextSortOrder(db: Database) {
    const [row] = yield* query("create", () => db.select({ highest: max(savingsGoals.sortOrder) }).from(savingsGoals));
    return (row?.highest ?? -1) + 1;
});

export const savingsGoalsRepo = {
    create: Effect.fn("SavingsGoals.create")(function* create(db: Database, input: SavingsGoalInput) {
        const now = new Date();
        const id = newId();
        // Both checked before writing: a balance the screen can display isn't always one that can be canonicalised.
        const start = yield* frozenUsd(db, input.startAmount, input.currency, now);
        const target = yield* frozenUsd(db, input.targetAmount, input.currency, now);
        if (start.amountUsd === null || target.amountUsd === null) {
            return yield* new GoalValuationError();
        }
        // The target's, because a zero start never consults a rate at all.
        const exchangeRate = target.exchangeRate ?? start.exchangeRate;
        const sortOrder = yield* nextSortOrder(db);
        yield* query("create", () =>
            db.insert(savingsGoals).values({
                accountId: input.accountId,
                currency: input.currency,
                dateCreated: now,
                deletedAt: null,
                exchangeRate,
                id,
                name: input.name,
                sortOrder,
                startAmount: input.startAmount,
                startAmountUsd: start.amountUsd,
                targetAmount: input.targetAmount,
                targetAmountUsd: target.amountUsd,
                targetDate: input.targetDate,
                updatedAt: now,
            })
        );
        return id;
    }),

    remove: Effect.fn("SavingsGoals.remove")(function* remove(db: Database, id: string, now: Date = new Date()) {
        yield* query("remove", () =>
            db.update(savingsGoals).set({ deletedAt: now, updatedAt: now }).where(eq(savingsGoals.id, id))
        );
    }),

    update: Effect.fn("SavingsGoals.update")(function* update(db: Database, id: string, patch: SavingsGoalPatch) {
        const [existing] = yield* query("update", () => db.select().from(savingsGoals).where(eq(savingsGoals.id, id)));
        if (existing == null) {
            return yield* new SavingsGoalsError({ operation: "update", reason: "missing" });
        }
        const now = new Date();
        const targetAmount = patch.targetAmount ?? existing.targetAmount;
        const { currency } = existing;
        const restated = targetAmount !== existing.targetAmount;
        // Frozen against the goal's OWN date: every figure it holds is read back through `dateCreated`.
        const targetAmountUsd = restated ? yield* refrozen(db, existing, targetAmount) : existing.targetAmountUsd;
        // Currency and start anchor aren't patchable: anchor, frozen USD and valuation date must describe one moment.
        yield* query("update", () =>
            db
                .update(savingsGoals)
                .set({
                    ...patch,
                    currency,
                    targetAmount,
                    targetAmountUsd,
                    updatedAt: now,
                })
                .where(eq(savingsGoals.id, id))
        );
    }),
};
