import { createContext, useContext } from "react";

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

export function resolveFilters(search: DashboardSearch, ledger: Ledger): DashboardFilters {
    const currentKey = periodKeyOf(ledger.today, ledger.firstDayOfMonth);
    return {
        accounts: accountIdsOf(search.accounts).filter((id) => ledger.accounts.has(id)),
        category: search.category !== undefined && ledger.categories.has(search.category) ? search.category : null,
        currentKey,
        period: periodOf(periodKeyOr(search.period, currentKey), ledger.firstDayOfMonth),
    };
}
