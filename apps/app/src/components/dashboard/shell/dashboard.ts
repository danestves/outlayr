import { isoDay } from "@outlayr/money/ledger-zone";
import { createContext, useContext, useMemo } from "react";

import type { Overview } from "@/components/ledger/overview";
import type { Ledger } from "@/lib/dashboard-series-ledger";
import {
    isCustomKey,
    periodKeyOf,
    periodOf,
    presetKeyOf,
    rangeChoiceOf,
    rangeKeyOf,
} from "@/lib/dashboard-series-period";
import type { Period, RangeChoice } from "@/lib/dashboard-series-period";

import { accountIdsOf, periodKeyOr, spanKeyOr } from "./filters";
import type { DashboardSearch, FilterPatch } from "./filters";

export interface DashboardFilters {
    accounts: readonly string[];
    categories: readonly string[];
    category: string | null;
    choice: RangeChoice | null;
    currentKey: string;
    period: Period;
    /** What the dashboard home reads: `period`, the quarter or year ending with it, or the days `choice` names. */
    range: Period;
    /** The week, month or year Insights is reading; `period` stays a month for every other screen. */
    span: Period;
}

export interface Dashboard {
    filters: DashboardFilters;
    ledger: Ledger;
    overview: Overview;
    setFilters: (patch: FilterPatch) => void;
    strand: () => void;
}

export const DashboardContext = createContext<Dashboard | null>(null);

export function useDashboard() {
    const dashboard = useContext(DashboardContext);
    if (!dashboard) {
        throw new Error("useDashboard needs the dashboard data above it");
    }
    return dashboard;
}

const NONE: readonly string[] = [];

// A light ledger holds only recent rows, so "all" reaches past its cutoff and Home waits for the history.
const earliestDay = ({ offsetAt, opening, rows, today }: Ledger) =>
    opening === null
        ? rows.reduce((first, row) => (row.day < first ? row.day : first), today)
        : isoDay(opening.cutoff - 1, offsetAt(opening.cutoff - 1));

function rangeKeyIn(month: string, choice: RangeChoice | null, ledger: Ledger) {
    if (choice === null || choice === "quarter" || choice === "year") {
        return rangeKeyOf(month, choice);
    }
    return isCustomKey(choice) ? choice : presetKeyOf(choice, ledger, earliestDay(ledger));
}

export function useFilters(search: DashboardSearch, ledger: Ledger): DashboardFilters {
    const { firstDayOfMonth, firstWeekday, today } = ledger;
    const currentKey = periodKeyOf(today, firstDayOfMonth);
    const accountKey = accountIdsOf(search.accounts)
        .filter((id) => ledger.accounts.has(id))
        .join(",");
    const periodKey = periodKeyOr(search.period, currentKey);
    const categoryKey = accountIdsOf(search.category)
        .filter((id) => ledger.categories.has(id))
        .join(",");
    const accounts = useMemo(() => (accountKey === "" ? NONE : accountKey.split(",")), [accountKey]);
    const categories = useMemo(() => (categoryKey === "" ? NONE : categoryKey.split(",")), [categoryKey]);
    const period = useMemo(() => periodOf(periodKey, firstDayOfMonth), [firstDayOfMonth, periodKey]);
    const choice = rangeChoiceOf(search.range);
    const rangeKey = rangeKeyIn(periodKey, choice, ledger);
    const range = useMemo(() => periodOf(rangeKey, firstDayOfMonth), [firstDayOfMonth, rangeKey]);
    const spanKey = spanKeyOr(search.period, today, { firstDayOfMonth, firstWeekday });
    const span = useMemo(() => periodOf(spanKey, firstDayOfMonth), [firstDayOfMonth, spanKey]);
    return useMemo(
        () => ({
            accounts,
            categories,
            category: categories.length === 1 ? (categories[0] ?? null) : null,
            choice,
            currentKey,
            period,
            range,
            span,
        }),
        [accounts, categories, choice, currentKey, period, range, span]
    );
}
