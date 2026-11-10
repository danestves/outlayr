import { useContext } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { LedgerSettingsContext } from "@/lib/ledger-settings";

import { CashFlowCard } from "./cash-flow";
import { useInsightsFormat } from "./format";
import { useInsightsModel } from "./model";
import type { InsightsModel } from "./model";
import { AccountsChip, PeriodChip } from "./phone/chips";
import { StandoutsCard } from "./standouts";
import { ChangesCard, IncomeSpendingCard, MonthsCard, NetWorthCard } from "./trends";

function useHeadline({ closed, comparison, flow }: InsightsModel) {
    const { headline } = useIntlayer("dashboard-insights");
    const { filters, ledger } = useDashboard();
    const fmt = useInsightsFormat(ledger);
    const values = { amount: fmt.amount(flow.spent), period: fmt.periodName(filters.period) };
    const sentence = () => {
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
    };
    return { amount: values.amount, sentence: sentence() };
}

const HEADLINE = "mt-3 text-[22px] leading-7 font-medium tracking-[-0.02em] text-balance";
const CLAUSE = ", ";

// Each clause wraps as its own block, so the line breaks at the comma before it breaks inside a clause.
function Headline({ model }: { model: InsightsModel }) {
    const { amount, sentence } = useHeadline(model);
    const [before, after] = sentence.split(amount);
    if (after === undefined) {
        return <h2 className={HEADLINE}>{sentence}</h2>;
    }
    const [lead, ...verdict] = after.split(CLAUSE);
    const figure = <span className="tracking-[-0.05em] tabular-nums">{amount}</span>;
    if (verdict.length === 0) {
        return (
            <h2 className={HEADLINE}>
                {before}
                {figure}
                {lead}
            </h2>
        );
    }
    return (
        <h2 className={HEADLINE}>
            <span className="inline-block">
                {before}
                {figure}
                {`${lead},`}
            </span>{" "}
            <span className="inline-block">{verdict.join(CLAUSE)}</span>
        </h2>
    );
}

export function InsightsScreen({ model }: { model: InsightsModel }) {
    const { ledger } = useDashboard();
    const { incomeTracking } = useContext(LedgerSettingsContext);
    const { add } = useIntlayer("dashboard");
    const quiet = model.flow.income === 0 && model.flow.spent === 0;
    return (
        <main className="@container min-w-0 px-4 pt-1 pb-5 sm:px-6">
            <div className="flex gap-2">
                <PeriodChip />
                <AccountsChip quiet={quiet} />
            </div>
            {ledger.rows.length === 0 ? (
                <p className="text-muted-foreground py-4 text-sm">{add.hint}</p>
            ) : (
                <>
                    <Headline model={model} />
                    <div className="mt-3.5 flex flex-col gap-3.5">
                        <StandoutsCard model={model} />
                        <CashFlowCard model={model} />
                        <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2">
                            <ChangesCard model={model} />
                            <MonthsCard model={model} />
                            {incomeTracking ? <IncomeSpendingCard model={model} /> : null}
                            <NetWorthCard model={model} />
                        </div>
                    </div>
                </>
            )}
        </main>
    );
}

/** The one screen a phone gets in place of the six tabs. */
export function PhoneInsights() {
    const model = useInsightsModel(useDashboard());
    return <InsightsScreen model={model} />;
}
