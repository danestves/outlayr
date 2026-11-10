import { useMemo } from "react";

import type { Dashboard } from "@/components/dashboard/shell/dashboard";
import { categoryBudgets } from "@/lib/dashboard-series";
import type { CategoryBudget } from "@/lib/dashboard-series";
import { cashFlow, monthlyTotals, netWorthHistory } from "@/lib/dashboard-series-insights";

import { changesFromUsual, compareToUsual, keptStreak, standouts, usualKeptShare, usualSpend } from "./answers";

const MONTHS_DRAWN = 6;

export function useInsightsModel({ filters, ledger }: Dashboard) {
    const { accounts, period } = filters;
    return useMemo(() => {
        const scope = { accounts };
        const flow = cashFlow(ledger, period, scope);
        const budgeted = accounts.length === 0;
        const budgets = budgeted ? categoryBudgets(ledger, period) : new Map<string, CategoryBudget>();
        const usual = usualSpend(ledger, period, scope);
        const history = monthlyTotals(ledger, period, scope);
        return {
            budgeted,
            budgets,
            cards: standouts(ledger, period, scope, budgets, usual),
            changes: changesFromUsual(ledger, period, scope, usual),
            closed: period.to < ledger.today,
            comparison: compareToUsual(flow.spent, usual?.total ?? null),
            flow,
            keptStreak: keptStreak(history),
            /** The months the two monthly charts draw; the kept figures read the whole year. */
            months: history.slice(-MONTHS_DRAWN),
            netWorth: netWorthHistory(ledger, period, scope, history.length),
            usual,
            usualKept: usualKeptShare(history),
        };
    }, [accounts, ledger, period]);
}

export type InsightsModel = ReturnType<typeof useInsightsModel>;
