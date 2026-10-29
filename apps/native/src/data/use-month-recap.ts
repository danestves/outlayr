import { addMonths, firstOfMonth } from "@outlayr/money/calendar";
import { and, gte, isNull, lte } from "drizzle-orm";

import type { Database } from "@/db/client";
import { categories, transactions } from "@/db/schema";
import { monthRecap } from "@/domain/month-recap";
import type { MonthRecap, RecapRow } from "@/domain/month-recap";
import { useLanguage } from "@/i18n/context";

import type { CategoryMeta } from "./insights";
import { useLiveQuery } from "./live-query";
import { useValuation } from "./use-valuation";

export function useMonthRecap(db: Database, nowMs: number, month: Date): MonthRecap {
    const { language } = useLanguage();
    const queryStart = addMonths(firstOfMonth(month), -1);

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
    const rows: RecapRow[] = txData.map((row) => ({
        ...row,
        parentId: row.categoryId ? (categoriesById.get(row.categoryId)?.parentId ?? null) : null,
    }));

    return monthRecap({ categoriesById, language, month, now: new Date(nowMs), rows, valuation });
}
