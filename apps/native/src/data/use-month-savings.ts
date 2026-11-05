import { addMonths, firstOfMonth } from "@outlayr/money/calendar";
import { and, count, getTableColumns, gte, isNull, lt } from "drizzle-orm";

import type { Database } from "@/db/client";
import { budgets, mainBudget, transactions } from "@/db/schema";
import { monthSavings, savingsReadStart, YEAR_MONTHS, yearSavings } from "@/domain/month-savings";
import type { MonthSavings, MonthSavingsInput, SavingsBudget, YearSavings } from "@/domain/month-savings";
import { translateNow } from "@/i18n/runtime";

import { useExpenseContributions } from "./budgets";
import { useCategoryMeta } from "./categories";
import { useLiveQuery, useLiveValue } from "./live-query";
import { useValuation } from "./use-valuation";

function useSavingsInput(db: Database, nowMs: number, firstMonth: Date): Omit<MonthSavingsInput, "month"> {
    const contributions = useExpenseContributions(db, nowMs, savingsReadStart(firstMonth).getTime());
    const categoryMeta = useCategoryMeta(db);
    const valuation = useValuation(db);
    const categoryRows = useLiveQuery(budgets, () =>
        db.select(getTableColumns(budgets)).from(budgets).where(isNull(budgets.deletedAt))
    );
    const [overallRow] = useLiveQuery(mainBudget, () =>
        db.select().from(mainBudget).where(isNull(mainBudget.deletedAt)).limit(1)
    );

    const categoryNames = new Map<string, string>();
    for (const [id, meta] of categoryMeta) {
        if (meta.name) {
            categoryNames.set(id, meta.name);
        }
    }
    const budgetList: SavingsBudget[] = categoryRows.map((row) => {
        const meta = row.categoryId ? categoryMeta.get(row.categoryId) : undefined;
        return {
            ...row,
            name: row.name?.trim() || meta?.name || "Budget",
            overall: false,
            parentId: meta?.parentId ?? null,
        };
    });
    if (overallRow) {
        budgetList.push({
            ...overallRow,
            categoryId: null,
            name: overallRow.name?.trim() || translateNow("budgets.scope.everything"),
            overall: true,
            parentId: null,
        });
    }

    return { budgets: budgetList, categoryNames, contributions, now: new Date(nowMs), valuation };
}

export function useMonthSavings(db: Database, nowMs: number, month: Date): MonthSavings {
    return monthSavings({ ...useSavingsInput(db, nowMs, month), month });
}

export interface YearSummary extends YearSavings {
    entries: number;
}

export function useYearSavings(db: Database, nowMs: number): YearSummary {
    const year = yearSavings(useSavingsInput(db, nowMs, addMonths(firstOfMonth(new Date(nowMs)), -YEAR_MONTHS)));
    const fromMs = year.from.getTime();
    const untilMs = addMonths(year.to, 1).getTime();
    const entries = useLiveValue(
        transactions,
        () =>
            db
                .select({ total: count() })
                .from(transactions)
                .where(
                    and(
                        isNull(transactions.deletedAt),
                        gte(transactions.date, new Date(fromMs)),
                        lt(transactions.date, new Date(untilMs))
                    )
                ),
        (rows) => rows[0]?.total ?? 0,
        [db, fromMs, untilMs]
    );
    return { ...year, entries };
}
