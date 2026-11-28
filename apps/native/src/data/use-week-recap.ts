import { addDays, startOfDay, startOfWeek } from "@outlayr/money/calendar";
import { and, gte, isNull, lte } from "drizzle-orm";

import type { Database } from "@/db/client";
import { categories, transactions } from "@/db/schema";
import type { CategoryMeta } from "@/domain/insights";
import { weekRecap } from "@/domain/week-recap";
import type { WeekRecap } from "@/domain/week-recap";
import { useLanguage } from "@/i18n/context";

import { useLiveQuery } from "./live-query";
import { useValuation } from "./use-valuation";

export function useWeekRecap(db: Database, nowMs: number, week: Date): WeekRecap {
    const { language } = useLanguage();
    // The week carries its own first weekday (see recapWeek), which may differ from today's setting.
    const firstWeekday = week.getDay() + 1;
    const queryStart = startOfDay(addDays(startOfWeek(week, firstWeekday), -7));

    const txData = useLiveQuery(
        transactions,
        () =>
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
                        lte(transactions.date, new Date(nowMs))
                    )
                ),
        [nowMs, queryStart.getTime()],
        nowMs
    );
    const catData = useLiveQuery(categories, () => db.select().from(categories).where(isNull(categories.deletedAt)));
    const valuation = useValuation(db);

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

    return weekRecap({
        categoriesById,
        firstWeekday,
        language,
        now: new Date(nowMs),
        rows,
        valuation,
        week,
    });
}
