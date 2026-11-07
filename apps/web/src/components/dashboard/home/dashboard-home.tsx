import { useContext } from "react";

import { LedgerSettingsContext } from "@/lib/ledger-settings";

import { Accounts } from "./accounts";
import { Budgets } from "./budgets";
import { EveryDay } from "./every-day";
import { FilterBar } from "./filter-bar";
import { KpiGroup } from "./kpi-group";
import { SpentOfIncome } from "./spent-of-income";
import { Transactions } from "./transactions";

export function DashboardHome() {
    const { incomeTracking } = useContext(LedgerSettingsContext);
    return (
        <main className="min-w-0 px-6 pb-6">
            <FilterBar />
            <KpiGroup />
            <div className={`mt-4 grid grid-cols-1 gap-4 ${incomeTracking ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
                {incomeTracking ? <SpentOfIncome /> : null}
                <EveryDay />
                <Budgets />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Transactions />
                <Accounts />
            </div>
        </main>
    );
}
