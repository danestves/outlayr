import { and, gte, inArray, isNull, lte, eq } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { Database } from "@/db/client";
import { budgetPlans } from "@/db/schema";
import { transaction } from "@/db/transaction";
import { uuidV5 } from "@/domain/uuid5";
import type { MonthKey } from "@/domain/year-plan";

const BUDGET_PLAN_NAMESPACE = "5b1f0d8e-7c43-4f6a-9e2d-3a8c61b47f09";

export class BudgetPlansError extends Schema.TaggedError<BudgetPlansError>()("BudgetPlansError", {
    cause: Schema.Defect(),
}) {
    // oxlint-disable-next-line class-methods-use-this -- one cause, no attribute: the message has nothing on the instance to read
    override get message(): string {
        return "Saving the plan failed";
    }
}

// Two devices planning the same month write the same row, so last-writer-wins settles it without a unique index.
export const budgetPlanId = (categoryId: string, month: MonthKey): string =>
    uuidV5(`${categoryId}:${month}`, BUDGET_PLAN_NAMESPACE);

export function budgetPlansQuery(db: Database, from: MonthKey, through: MonthKey) {
    return db
        .select({
            amount: budgetPlans.amount,
            categoryId: budgetPlans.categoryId,
            currency: budgetPlans.currency,
            month: budgetPlans.month,
        })
        .from(budgetPlans)
        .where(and(isNull(budgetPlans.deletedAt), gte(budgetPlans.month, from), lte(budgetPlans.month, through)));
}

export interface SetPlanMonthsInput {
    amounts: ReadonlyMap<MonthKey, number | null>;
    categoryId: string;
    currency: string;
}

const query = <A>(run: () => PromiseLike<A>) =>
    Effect.tryPromise({ catch: (cause) => new BudgetPlansError({ cause }), try: run });

export const setPlanMonths = Effect.fn("BudgetPlans.setPlanMonths")(function* setPlanMonths(
    db: Database,
    { amounts, categoryId, currency }: SetPlanMonthsInput
) {
    const now = new Date();
    const ids = [...amounts.keys()].map((month) => budgetPlanId(categoryId, month));
    yield* transaction(
        db,
        Effect.gen(function* write() {
            const existing = yield* query(() =>
                db
                    .select({ deletedAt: budgetPlans.deletedAt, id: budgetPlans.id })
                    .from(budgetPlans)
                    .where(inArray(budgetPlans.id, ids))
            );
            const tombstoned = new Map(existing.map((row) => [row.id, row.deletedAt !== null]));
            // One expo-sqlite connection backs the surrounding transaction, so concurrent statements interleave.
            for (const [month, value] of amounts) {
                const id = budgetPlanId(categoryId, month);
                const amount = value === null ? null : Math.abs(value);
                if (!tombstoned.has(id)) {
                    yield* query(() =>
                        db.insert(budgetPlans).values({
                            amount,
                            categoryId,
                            currency,
                            deletedAt: null,
                            id,
                            month,
                            restoredAt: null,
                            updatedAt: now,
                        })
                    );
                    continue;
                }
                // A tombstone outranks a later edit unless the row says it was restored after it (R1).
                yield* query(() =>
                    db
                        .update(budgetPlans)
                        .set({
                            amount,
                            currency,
                            deletedAt: null,
                            ...(tombstoned.get(id) && { restoredAt: now }),
                            updatedAt: now,
                        })
                        .where(eq(budgetPlans.id, id))
                );
            }
        }),
        (cause) => new BudgetPlansError({ cause })
    );
});
