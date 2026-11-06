import { useMemo } from "react";

import type { Dashboard } from "@/components/dashboard/shell/dashboard";
import { categoryBudgets } from "@/lib/dashboard-series";
import type { CategoryBudget } from "@/lib/dashboard-series";
import {
    cashFlow,
    categorySpend,
    dailySpend,
    monthlyByCategory,
    netWorthHistory,
} from "@/lib/dashboard-series-insights";

import { compareToUsual, standouts, usualSpend } from "./answers";
import type { CategoryLook } from "./category-tile";

export function useInsightsModel({ filters, ledger }: Dashboard) {
    const { accounts, period } = filters;
    return useMemo(() => {
        const scope = { accounts };
        const flow = cashFlow(ledger, period, scope);
        const budgeted = accounts.length === 0;
        const budgets = budgeted ? categoryBudgets(ledger, period) : new Map<string, CategoryBudget>();
        const usual = usualSpend(ledger, period, scope);
        return {
            budgeted,
            budgets,
            cards: standouts(ledger, period, scope, budgets, usual),
            closed: period.to < ledger.today,
            comparison: compareToUsual(flow.spent, usual?.total ?? null),
            daily: dailySpend(ledger, period, scope),
            flow,
            looks: new Map<string, CategoryLook>(
                ledger.books.categories.map((row) => [row.localId, { emoji: row.emoji, icon: row.icon }])
            ),
            months: monthlyByCategory(ledger, period, scope),
            netWorth: netWorthHistory(ledger, period, scope),
            spend: categorySpend(ledger, period, scope),
        };
    }, [accounts, ledger, period]);
}

export type InsightsModel = ReturnType<typeof useInsightsModel>;
