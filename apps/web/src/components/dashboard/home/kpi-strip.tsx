import { Kpi } from "panelui-web/kpi";
import { useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { kpis } from "@/lib/dashboard-series";
import type { Kpi as Figure } from "@/lib/dashboard-series";
import { priorSlice } from "@/lib/dashboard-series-period";
import { LedgerSettingsContext, useDisplayFormat } from "@/lib/ledger-settings";

import { useDateFormat } from "./format";

const PERCENT_PER_RATIO = 100;

interface CellProps {
    badGoesUp?: boolean;
    figure: Figure & { share?: number | null };
    label: ReactNode;
    note?: ReactNode;
    share?: ReactNode;
}

function Cell({ badGoesUp = false, figure, label, note, share }: CellProps) {
    const { money } = useDisplayFormat();
    const { ledger } = useDashboard();
    return (
        <div className="bg-background min-w-0 px-5 py-4">
            <div className="text-muted-foreground text-xs leading-4">{label}</div>
            <div className="mt-1 font-mono text-xl leading-7 font-medium tabular-nums">
                {money(figure.value, ledger.currency)}
            </div>
            <div className="text-muted-foreground mt-1 flex min-h-4 flex-wrap items-baseline gap-x-2 text-xs leading-4">
                {share ??
                    (figure.delta === null ? null : (
                        <>
                            <Kpi.Trend
                                className="font-mono text-xs"
                                goodDirection={badGoesUp ? "down" : "up"}
                                value={figure.delta * PERCENT_PER_RATIO}
                            />
                            {note}
                        </>
                    ))}
            </div>
        </div>
    );
}

export function KpiStrip() {
    const { filters, ledger } = useDashboard();
    const { incomeTracking } = useContext(LedgerSettingsContext);
    const copy = useIntlayer("dashboard-home");
    const date = useDateFormat();
    const figures = useMemo(
        () => kpis(ledger, filters.period, { accounts: filters.accounts }),
        [filters.accounts, filters.period, ledger]
    );
    const prior = priorSlice(filters.period, ledger.today, ledger.firstDayOfMonth);
    const versus = copy.kpi.versus({ range: `${date.day(prior.from)} - ${date.day(prior.to)}` });
    const since = copy.kpi.since({ day: date.day(filters.period.from) });
    return (
        <section className="border-border border-b">
            <div className="bg-border grid grid-cols-2 gap-px lg:grid-cols-4">
                <Cell figure={figures.netWorth} label={copy.kpi.netWorth} note={since} />
                {incomeTracking ? <Cell figure={figures.income} label={copy.kpi.income} note={versus} /> : null}
                <Cell badGoesUp figure={figures.spent} label={copy.kpi.spent} note={versus} />
                {incomeTracking ? (
                    <Cell
                        figure={figures.kept}
                        label={copy.kpi.kept}
                        share={
                            figures.kept.share === null
                                ? undefined
                                : copy.kpi.share({
                                      percent: Math.round(figures.kept.share * PERCENT_PER_RATIO),
                                  })
                        }
                    />
                ) : null}
            </div>
        </section>
    );
}
