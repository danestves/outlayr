import { addDays, startOfDay, startOfWeek } from "@outlayr/money/calendar";
import { and, gte, isNull, lte } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { Database } from "@/db/client";
import { categories, transactions } from "@/db/schema";
import type { CategoryMeta } from "@/domain/insights";
import { weekRecap } from "@/domain/week-recap";
import type { Language } from "@/i18n/languages";

import { loadValuationIn } from "./valuation-source";

const WeekRecapOperation = Schema.Literals(["categories", "rows"]);

export class WeekRecapError extends Schema.TaggedError<WeekRecapError>()("WeekRecapError", {
    cause: Schema.Defect(),
    operation: WeekRecapOperation,
}) {
    override get message(): string {
        return `Reading the week recap ${this.operation} failed`;
    }
}

const failedAt = (operation: typeof WeekRecapOperation.Type) => (cause: unknown) =>
    new WeekRecapError({ cause, operation });

export interface WeekRecapReadInput {
    currency: string;
    firstWeekday: number;
    language?: Language;
    now: Date;
    week: Date;
}

export const loadWeekRecap = Effect.fn("WeekRecapCore.loadWeekRecap")(function* loadWeekRecap(
    db: Database,
    { currency, firstWeekday, language, now, week }: WeekRecapReadInput
) {
    const queryStart = startOfDay(addDays(startOfWeek(week, firstWeekday), -7));

    const [txData, catData, valuation] = yield* Effect.all(
        [
            Effect.tryPromise({
                catch: failedAt("rows"),
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
                            income: transactions.income,
                        })
                        .from(transactions)
                        .where(
                            and(
                                isNull(transactions.deletedAt),
                                gte(transactions.date, queryStart),
                                lte(transactions.date, now)
                            )
                        ),
            }),
            Effect.tryPromise({
                catch: failedAt("categories"),
                try: () => db.select().from(categories).where(isNull(categories.deletedAt)),
            }),
            loadValuationIn(db, currency),
        ],
        { concurrency: "unbounded" }
    );

    const categoriesById = new Map<string, CategoryMeta>();
    for (const category of catData) {
        categoriesById.set(category.id, {
            color: category.color,
            emoji: category.emoji,
            icon: category.icon,
            id: category.id,
            income: category.income,
            name: category.name,
            parentId: category.parentId,
        });
    }
    const rows = txData.map((row) => ({
        ...row,
        parentId: row.categoryId ? (categoriesById.get(row.categoryId)?.parentId ?? null) : null,
    }));

    return weekRecap({ categoriesById, firstWeekday, language, now, rows, valuation, week });
});
