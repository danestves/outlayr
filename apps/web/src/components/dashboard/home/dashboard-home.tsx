import { useContext, useMemo } from "react";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { LedgerSettingsContext } from "@/lib/ledger-settings";

import { Accounts } from "./accounts";
import { Budgets } from "./budgets";
import { EveryDay } from "./every-day";
import { FilterBar } from "./filter-bar";
import { KpiGroup } from "./kpi-group";
import { setupState } from "./model";
import { viewRows } from "./rows";
import { SetupHero } from "./setup";
import { SpentOfIncome } from "./spent-of-income";
import { Transactions } from "./transactions";

export function DashboardHome() {
    const { incomeTracking } = useContext(LedgerSettingsContext);
    const { filters, ledger } = useDashboard();
    const setup = useMemo(() => setupState(ledger), [ledger]);
    // A category filter narrows what's listed, not whether the period has anything in it.
    const quiet = useMemo(
        () =>
            setup === null &&
            viewRows(ledger, { accounts: filters.accounts, categories: [], period: filters.period }, "newest")
                .length === 0,
        [filters.accounts, filters.period, ledger, setup]
    );
    return (
        <main className={`min-w-0 px-6 ${setup ? "pb-3.5" : "pb-5"}`}>
            <FilterBar setup={setup} />
            {setup ? <SetupHero setup={setup} /> : <KpiGroup quiet={quiet} />}
            <div className={`mt-4 grid grid-cols-1 gap-4 ${incomeTracking ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
                {incomeTracking ? <SpentOfIncome quiet={quiet} setup={setup} /> : null}
                <EveryDay quiet={quiet} setup={setup} />
                <Budgets setup={setup} />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Transactions quiet={quiet} setup={setup} />
                <Accounts quiet={quiet} setup={setup} />
            </div>
        </main>
    );
}
