import { RiArrowRightUpLine } from "@remixicon/react";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { kpis } from "@/lib/dashboard-series";
import { periodOf, shiftPeriodKey } from "@/lib/dashboard-series-period";
import { money as moneyIn } from "@/lib/ledger";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { useDateFormat } from "./format";
import { percentChange } from "./kpi-group";

const BARS = 51;
const WIDTH = 336;
const BAR = 3;
const BASELINE = 94;
const REST_HEIGHT = 14;
const SWELL = 46;
const SWELL_SPREAD = 22;
const MARK_TOP = 104;
const PILL_HEIGHT = 24;
const PILL_MIN = 80;
const PILL_CHAR = 7.6;
const PERCENT = 100;

// The ruler's ends are income, so a month that overspends pins at the right edge instead of running off the card.
const capitalize = (text: string) => `${text.charAt(0).toLocaleUpperCase()}${text.slice(1)}`;

const share = (amount: number, income: number) => (income > 0 ? Math.min(amount / income, 1) : Number(amount > 0));

function Ruler({ label, mark, value }: { label: string; mark: number; value: number }) {
    const bars = Array.from({ length: BARS }, (_, index) => {
        const at = index / (BARS - 1);
        const distance = (at - value) * BARS;
        const swell = Math.exp(-(distance * distance) / SWELL_SPREAD);
        const height = REST_HEIGHT + swell * SWELL;
        const filled = at <= value;
        return (
            <rect
                height={height}
                key={at}
                rx={BAR / 2}
                style={{
                    fill: filled ? "var(--color-app-tint)" : "var(--color-app-strong)",
                    fillOpacity: filled ? 0.5 + swell * 0.5 : 1,
                }}
                width={BAR}
                x={at * (WIDTH - BAR)}
                y={BASELINE - height}
            />
        );
    });
    const pill = Math.max(PILL_MIN, label.length * PILL_CHAR + 12);
    const valueX = value * (WIDTH - BAR);
    const markX = mark * (WIDTH - BAR);
    const pillX = Math.min(Math.max(valueX - pill / 2, 0), WIDTH - pill);
    return (
        <svg aria-hidden className="block h-auto w-[calc(100%+2px)] overflow-visible" viewBox={`0 0 ${WIDTH} 124`}>
            {bars}
            <rect
                height={7}
                rx={1}
                style={{ fill: "var(--color-app-ink)" }}
                transform={`rotate(45 ${markX} ${MARK_TOP + 3.5})`}
                width={7}
                x={markX - 3}
                y={MARK_TOP}
            />
            <rect height={PILL_HEIGHT} rx={6} style={{ fill: "var(--color-app-ink)" }} width={pill} x={pillX} />
            <text
                style={{
                    fill: "var(--color-app-bg)",
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    fontWeight: 600,
                    textAnchor: "middle",
                }}
                x={pillX + pill / 2}
                y={16.5}
            >
                {label}
            </text>
        </svg>
    );
}

export function SpentOfIncome() {
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
                <Ruler label={shown(spent)} mark={share(prior, income)} value={share(spent, income)} />
                <div className="dash-figure text-muted-foreground mt-3 flex items-baseline justify-between text-[13px]">
                    <span>{moneyIn(0, ledger.currency, "auto", false)}</span>
                    <span>{shown(income)}</span>
                </div>
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
