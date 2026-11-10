import { createContext, useContext, useMemo } from "react";

import type { Overview, PhotoUrls } from "@/components/ledger/overview";
import type { Ledger } from "@/lib/dashboard-series-ledger";
import { periodKeyOf, periodOf } from "@/lib/dashboard-series-period";
import type { Period } from "@/lib/dashboard-series-period";

import { accountIdsOf, periodKeyOr, spanKeyOr } from "./filters";
import type { DashboardSearch, FilterPatch } from "./filters";

export interface DashboardFilters {
    accounts: readonly string[];
    categories: readonly string[];
    category: string | null;
    currentKey: string;
    period: Period;
    /** The week, month or year Insights is reading; `period` stays a month for every other screen. */
    span: Period;
}

export interface Dashboard {
    filters: DashboardFilters;
    ledger: Ledger;
    overview: Overview;
    photos: PhotoUrls;
    restoring: boolean;
    setFilters: (patch: FilterPatch) => void;
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
    const spanKey = spanKeyOr(search.period, today, { firstDayOfMonth, firstWeekday });
    const span = useMemo(() => periodOf(spanKey, firstDayOfMonth), [firstDayOfMonth, spanKey]);
    return useMemo(
        () => ({
            accounts,
            categories,
            category: categories.length === 1 ? (categories[0] ?? null) : null,
            currentKey,
            period,
            span,
        }),
        [accounts, categories, currentKey, period, span]
    );
}
