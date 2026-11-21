import { valueDatedRowsIn } from "@outlayr/money/valuation";
import { and, eq, isNull, lte } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { categories, transactions } from "@/db/schema";
import type { InsightsContribution } from "@/domain/insights";

import type { SpendDb } from "./budget-spent";
import { NO_VALUATION } from "./valuation-source";
import type { Valuation } from "./valuation-source";

export class InsightsError extends Schema.TaggedError<InsightsError>()("InsightsError", {
    cause: Schema.Defect(),
    currency: Schema.String,
}) {
    override get message(): string {
        return `Loading the contributions valued in ${this.currency} failed`;
    }
}

// The reactive hook builds this same query itself and this async form feeds the tests, so keep them in step. Only this
// form carries `id`, which the widgets look an entry's valued figure up by.
export const loadContributions = Effect.fn("Insights.loadContributions")(function* loadContributions(
    db: SpendDb,
    now: Date,
    valuation: Valuation = NO_VALUATION
) {
    const rows = yield* Effect.tryPromise({
        catch: (cause) => new InsightsError({ cause, currency: valuation.displayCurrency }),
        try: () =>
            db
                .select({
                    amount: transactions.amount,
                    amountUsd: transactions.amountUsd,
                    categoryId: transactions.categoryId,
                    currency: transactions.currency,
                    date: transactions.date,
                    exchangeRate: transactions.exchangeRate,
                    exchangeRateType: transactions.exchangeRateType,
                    id: transactions.id,
                    income: transactions.income,
                    parentId: categories.parentId,
                })
                .from(transactions)
                .leftJoin(categories, eq(transactions.categoryId, categories.id))
                .where(and(isNull(transactions.deletedAt), lte(transactions.date, now))),
    });
    const valued = valueDatedRowsIn(rows, valuation.displayCurrency, valuation.rates);
    return rows.map(
        (row, index) =>
            ({
                // `amount` is the valued amount from here down, not the row's stored one.
                amount: valued[index] ?? 0,
                categoryId: row.categoryId,
                date: row.date,
                id: row.id,
                income: row.income,
                parentId: row.parentId ?? null,
            }) satisfies InsightsContribution & { id: string }
    );
});
