import { useContext } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { LedgerSettingsContext } from "@/lib/ledger-settings";

import { CashFlowSection } from "./cash-flow";
import { ChartGrid } from "./chart-grid";
import { useInsightsFormat } from "./format";
import type { InsightsModel } from "./model";

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

function Measure({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-muted-foreground text-xs">{label}</dt>
            <dd className="font-mono text-base font-medium">{value}</dd>
        </div>
    );
}

function Headline({ model }: { model: InsightsModel }) {
    const { ledger } = useDashboard();
    const { incomeTracking } = useContext(LedgerSettingsContext);
    const { measures } = useIntlayer("dashboard-insights");
    const fmt = useInsightsFormat(ledger);
    const sentence = useHeadline(model);
    const { income, kept, spent } = model.flow;
    return (
        <section className="border-border flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-b px-5 py-5">
            <h2 className="text-xl font-medium tracking-tight">{sentence}</h2>
            <dl className="flex gap-8">
                {incomeTracking ? <Measure label={measures.in.value} value={fmt.amount(income)} /> : null}
                <Measure label={measures.out.value} value={fmt.amount(spent)} />
                {incomeTracking ? (
                    <Measure
                        label={kept < 0 ? measures.savings.value : measures.kept.value}
                        value={fmt.amount(Math.abs(kept))}
                    />
                ) : null}
            </dl>
        </section>
    );
}

export function InsightsMain({ model }: { model: InsightsModel }) {
    const { ledger } = useDashboard();
    const { incomeTracking } = useContext(LedgerSettingsContext);
    const { add } = useIntlayer("dashboard");
    if (ledger.rows.length === 0) {
        return <p className="text-muted-foreground px-5 py-8 text-sm">{add.hint}</p>;
    }
    return (
        <>
            <Headline model={model} />
            {incomeTracking ? <CashFlowSection model={model} /> : null}
            <ChartGrid model={model} />
        </>
    );
}
