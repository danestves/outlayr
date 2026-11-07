import { RiArrowRightUpLine } from "@remixicon/react";
import { Link } from "@tanstack/react-router";
import { RangeMeter } from "panelui-web/range-meter";
import { useMemo } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { kpis } from "@/lib/dashboard-series";
import { periodOf, shiftPeriodKey } from "@/lib/dashboard-series-period";
import { money as moneyIn } from "@/lib/ledger";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { useDateFormat } from "./format";
import { percentChange } from "./kpi-group";
import type { SetupState } from "./model";
import { Cover, GhostRuler, LATE_FADE, QuietBars } from "./setup";

const PERCENT = 100;

// The ruler's ends are income, so a month that overspends pins at the right edge instead of running off the card.
const capitalize = (text: string) => `${text.charAt(0).toLocaleUpperCase()}${text.slice(1)}`;

const share = (amount: number, income: number) => (income > 0 ? Math.min(amount / income, 1) : Number(amount > 0));

export function SpentOfIncome({ quiet, setup }: { quiet: boolean; setup: SetupState | null }) {
    const { filters, ledger } = useDashboard();
    const copy = useIntlayer("dashboard-home");
    const date = useDateFormat();
    const { money } = useDisplayFormat();
    const { period } = filters;
    const figures = useMemo(
        () => kpis(ledger, period, { accounts: filters.accounts }),
        [filters.accounts, ledger, period]
    );
    const income = figures.income.value;
    const spent = figures.spent.value;
    const { prior } = figures.spent;
    const { delta } = figures.spent;
    const shown = (value: number) => money(value, ledger.currency);
    if (setup && (income === 0 || spent === 0)) {
        return (
            <section className="dash-card relative min-h-[363px]">
                <div className="dash-card-head">
                    <h2>{copy.spentOfIncome.title}</h2>
                </div>
                <div className="px-5">
                    <GhostRuler />
                </div>
                {spent > 0 ? (
                    <Cover
                        fade={LATE_FADE}
                        line={copy.setup.logIncome}
                        title={copy.setup.spent({ amount: shown(spent) })}
                    />
                ) : (
                    <Cover fade={LATE_FADE} line={copy.setup.fillsIn} title={copy.setup.spentTitle} />
                )}
            </section>
        );
    }
    if (quiet) {
        return (
            <section className="dash-card">
                <div className="dash-card-head">
                    <h2>{copy.spentOfIncome.title}</h2>
                </div>
                <div className="dash-empty relative isolate min-h-[241px] justify-end pt-0 pb-7">
                    <QuietBars />
                    <b className="text-[15px] font-semibold">{copy.quiet.spentTitle}</b>
                    <p className="text-muted-foreground mb-2.5 text-[13px]">{copy.quiet.spentLine}</p>
                </div>
                <div className="dash-card-foot text-sm">
                    <span className="text-muted-foreground text-[13px]">{copy.kpi.kept}</span>
                    <span className="dash-figure font-medium">{shown(0)}</span>
                    <span className="dash-trend" data-tone="flat">
                        0%
                    </span>
                </div>
            </section>
        );
    }
    const priorMonth = periodOf(shiftPeriodKey(period.key, -1), ledger.firstDayOfMonth).key;
    return (
        <section className="dash-card">
            <div className="dash-card-head">
                <h2>{copy.spentOfIncome.title}</h2>
                {delta === null ? null : (
                    <span className="dash-trend ml-auto" data-tone={delta > 0 ? "poor" : "good"}>
                        {percentChange(delta)}
                    </span>
                )}
            </div>
            <div className="flex-1 px-5 pb-[18px]">
                <RangeMeter
                    className="dash-figure [&>[aria-hidden]]:h-16"
                    formatValue={() => shown(spent)}
                    label={copy.spentOfIncome.title.value}
                    marker={share(prior, income)}
                    max={1}
                    value={share(spent, income)}
                    valueText={shown(spent)}
                />
                <RangeMeter.Scale
                    className="dash-figure mt-5 text-[13px]"
                    end={shown(income)}
                    start={moneyIn(0, ledger.currency, "auto", false)}
                />
                <div className="mt-[15px] flex items-baseline justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2 text-[13px]">
                        <u aria-hidden className="bg-foreground block size-[7px] rotate-45 rounded-[1px]" />
                        {capitalize(date.month(priorMonth))}
                    </span>
                    <span className="dash-figure">{shown(prior)}</span>
                </div>
                <div className="mt-1.5 flex items-baseline justify-between text-sm">
                    <span className="text-muted-foreground text-[13px]">{capitalize(date.month(period.key))}</span>
                    <span className="dash-figure">{shown(spent)}</span>
                </div>
            </div>
            <div className="dash-card-foot text-sm">
                <span className="text-muted-foreground text-[13px]">{copy.kpi.kept}</span>
                <span className="dash-figure font-medium">{shown(figures.kept.value)}</span>
                {figures.kept.share === null ? null : (
                    <span className="dash-trend" data-tone="flat">
                        {Math.round(figures.kept.share * PERCENT)}%
                    </span>
                )}
                <Link className="dash-ob ml-auto" to="/app/insights">
                    {copy.spentOfIncome.cashFlow}
                    <RiArrowRightUpLine size={15} />
                </Link>
            </div>
        </section>
    );
}
