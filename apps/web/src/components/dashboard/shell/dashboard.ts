import { createContext, useContext, useMemo } from "react";

import type { Overview, PhotoUrls } from "@/components/ledger/overview";
import type { Ledger } from "@/lib/dashboard-series-ledger";
import { periodKeyOf, periodOf } from "@/lib/dashboard-series-period";
import type { Period } from "@/lib/dashboard-series-period";

import { accountIdsOf, periodKeyOr } from "./filters";
import type { DashboardSearch, FilterPatch } from "./filters";

export interface DashboardFilters {
    accounts: readonly string[];
    category: string | null;
    currentKey: string;
    period: Period;
}

export interface Dashboard {
    filters: DashboardFilters;
    ledger: Ledger;
    overview: Overview;
    photos: PhotoUrls;
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

const NO_ACCOUNTS: readonly string[] = [];

export function useFilters(search: DashboardSearch, ledger: Ledger): DashboardFilters {
    const { firstDayOfMonth } = ledger;
    const currentKey = periodKeyOf(ledger.today, firstDayOfMonth);
    const accountKey = accountIdsOf(search.accounts)
        .filter((id) => ledger.accounts.has(id))
        .join(",");
    const periodKey = periodKeyOr(search.period, currentKey);
    const category = search.category !== undefined && ledger.categories.has(search.category) ? search.category : null;
    const accounts = useMemo(() => (accountKey === "" ? NO_ACCOUNTS : accountKey.split(",")), [accountKey]);
    const period = useMemo(() => periodOf(periodKey, firstDayOfMonth), [firstDayOfMonth, periodKey]);
    return useMemo(() => ({ accounts, category, currentKey, period }), [accounts, category, currentKey, period]);
}
