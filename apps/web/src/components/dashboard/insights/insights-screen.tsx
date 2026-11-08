import { useContext } from "react";
import { useIntlayer } from "react-intlayer";

import { FilterBar } from "@/components/dashboard/home/filter-bar";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { LedgerSettingsContext } from "@/lib/ledger-settings";

import { CashFlowCard } from "./cash-flow";
import { useInsightsFormat } from "./format";
import type { InsightsModel } from "./model";
import { StandoutsCard } from "./standouts";
import { ChangesCard, IncomeSpendingCard, MonthsCard, NetWorthCard } from "./trends";

function useHeadline({ closed, comparison, flow }: InsightsModel) {
    const { headline } = useIntlayer("dashboard-insights");
    const { filters, ledger } = useDashboard();
    const fmt = useInsightsFormat(ledger);
    const values = { amount: fmt.amount(flow.spent), period: fmt.periodName(filters.period) };
    if (flow.spent === 0) {
        return headline.nothing({ period: values.period }).value;
    }
    if (comparison === null) {
        return (closed ? headline.plain : headline.soFarPlain)(values).value;
    }
    if (comparison.kind === "asUsual") {
        return (closed ? headline.asUsual : headline.soFarAsUsual)(values).value;
    }
    const percent = String(comparison.percent);
    if (comparison.kind === "more") {
        return (closed ? headline.more : headline.soFarMore)({ ...values, percent }).value;
    }
    return (closed ? headline.less : headline.soFarLess)({ ...values, percent }).value;
}

export function InsightsScreen({ model }: { model: InsightsModel }) {
    const { ledger } = useDashboard();
    const { incomeTracking } = useContext(LedgerSettingsContext);
    const { add } = useIntlayer("dashboard");
    const sentence = useHeadline(model);
    const quiet = model.flow.income === 0 && model.flow.spent === 0;
    return (
        <main className="@container min-w-0 px-4 pb-5 sm:px-6">
            <FilterBar categories={false} quiet={quiet} setup={null} />
            {ledger.rows.length === 0 ? (
                <p className="text-muted-foreground py-4 text-sm">{add.hint}</p>
            ) : (
                <>
                    <h1 className="mb-4 text-xl font-medium tracking-tight sm:text-2xl">{sentence}</h1>
                    <div className="grid grid-cols-1 gap-4 @3xl:grid-cols-2">
                        <div className="@3xl:col-span-2">
                            <StandoutsCard model={model} />
                        </div>
                        {incomeTracking ? (
                            <div className="@3xl:col-span-2">
                                <CashFlowCard model={model} />
                            </div>
                        ) : null}
                        <ChangesCard model={model} />
                        <MonthsCard model={model} />
                        {incomeTracking ? <IncomeSpendingCard model={model} /> : null}
                        <NetWorthCard model={model} />
                    </div>
                </>
            )}
        </main>
    );
}
