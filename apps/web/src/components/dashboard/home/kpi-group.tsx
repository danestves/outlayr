import { RiArrowLeftDownLine, RiArrowRightUpLine, RiCoinsLine, RiSafe2Line } from "@remixicon/react";
import type { RemixiconComponentType } from "@remixicon/react";
import { useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { kpis } from "@/lib/dashboard-series";
import { netWorthPoints } from "@/lib/dashboard-series-net-worth";
import { LedgerSettingsContext, useDisplayFormat } from "@/lib/ledger-settings";

import { sparks } from "./model";

const SPARK_WIDTH = 96;
const SPARK_HEIGHT = 28;
const PERCENT = 100;

function Spark({ color, points }: { color: string; points: readonly number[] }) {
    const high = Math.max(...points);
    const low = Math.min(...points);
    const path = points
        .map((value, index) => {
            const x = (index / Math.max(points.length - 1, 1)) * SPARK_WIDTH;
            const y = SPARK_HEIGHT - 2 - ((value - low) / (high - low || 1)) * (SPARK_HEIGHT - 4);
            return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join("");
    return (
        <svg aria-hidden className="overflow-visible" height={SPARK_HEIGHT} width={SPARK_WIDTH}>
            <path d={path} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
        </svg>
    );
}

export const percentChange = (delta: number) => `${delta > 0 ? "+" : ""}${(delta * PERCENT).toFixed(1)}%`;

interface FigureProps {
    color: string;
    icon: RemixiconComponentType;
    label: ReactNode;
    points: readonly number[] | null;
    tone: "flat" | "good" | "poor";
    trend: string | null;
    value: string;
}

function Figure({ color, icon: Icon, label, points, tone, trend, value }: FigureProps) {
    return (
        <div className="border-border min-w-0 border-l px-5 first:border-l-0 first:pl-0 last:pr-0">
            <div className="text-muted-foreground flex items-center gap-2 text-[13px] font-medium">
                <span
                    className="flex size-7 items-center justify-center rounded-[10px]"
                    style={{ backgroundColor: `color-mix(in oklab, ${color} 16%, transparent)`, color }}
                >
                    <Icon size={14} />
                </span>
                {label}
            </div>
            <div className="mt-2 truncate font-mono text-2xl leading-8 font-semibold tracking-[-0.04em]">{value}</div>
            <div className="mt-1 flex h-7 items-center justify-between">
                {trend === null ? (
                    <span />
                ) : (
                    <span className="dash-trend" data-tone={tone}>
                        {trend}
                    </span>
                )}
                {points ? <Spark color={color} points={points} /> : null}
            </div>
        </div>
    );
}

const trend = (delta: number | null) => (delta === null ? null : percentChange(delta));

const toneOf = (delta: number, badGoesUp: boolean) => {
    if (delta === 0) {
        return "flat";
    }
    return delta > 0 === badGoesUp ? "poor" : "good";
};

export function KpiGroup({ quiet }: { quiet: boolean }) {
    const { filters, ledger } = useDashboard();
    const { incomeTracking } = useContext(LedgerSettingsContext);
    const copy = useIntlayer("dashboard-home").kpi;
    const { money } = useDisplayFormat();
    const scope = useMemo(() => ({ accounts: filters.accounts }), [filters.accounts]);
    const figures = useMemo(() => kpis(ledger, filters.period, scope), [filters.period, ledger, scope]);
    const lines = useMemo(() => sparks(ledger, filters.period, scope), [filters.period, ledger, scope]);
    const shown = (value: number) => money(value, ledger.currency);
    // A period with nothing in it has no history worth drawing, and its closing balance says nothing either.
    const now = useMemo(
        () => (quiet ? (netWorthPoints(ledger, scope, [ledger.now])[0]?.net ?? 0) : null),
        [ledger, quiet, scope]
    );
    const flat = quiet ? ({ tone: "flat", trend: "0%" } as const) : null;

    return (
        <section
            className={`bg-app-group border-border grid grid-cols-2 gap-y-5 rounded-3xl border p-5 ${incomeTracking ? "lg:grid-cols-4" : ""}`}
        >
            <Figure
                color="var(--color-app-muted)"
                icon={RiSafe2Line}
                label={copy.netWorth}
                points={quiet ? null : lines.netWorth}
                tone={flat?.tone ?? toneOf(figures.netWorth.delta ?? 0, false)}
                trend={quiet ? copy.now.value : trend(figures.netWorth.delta)}
                value={shown(now ?? figures.netWorth.value)}
            />
            {incomeTracking ? (
                <Figure
                    color="var(--color-app-income)"
                    icon={RiArrowLeftDownLine}
                    label={copy.income}
                    points={quiet ? null : lines.income}
                    tone={flat?.tone ?? toneOf(figures.income.delta ?? 0, false)}
                    trend={flat?.trend ?? trend(figures.income.delta)}
                    value={shown(figures.income.value)}
                />
            ) : null}
            <Figure
                color="var(--color-app-tint)"
                icon={RiArrowRightUpLine}
                label={copy.spent}
                points={quiet ? null : lines.spent}
                tone={flat?.tone ?? toneOf(figures.spent.delta ?? 0, true)}
                trend={flat?.trend ?? trend(figures.spent.delta)}
                value={shown(figures.spent.value)}
            />
            {incomeTracking ? (
                <Figure
                    color="var(--color-app-muted)"
                    icon={RiCoinsLine}
                    label={copy.kept}
                    points={quiet ? null : lines.kept}
                    tone="flat"
                    trend={
                        flat?.trend ??
                        (figures.kept.share === null ? null : `${Math.round(figures.kept.share * PERCENT)}%`)
                    }
                    value={shown(figures.kept.value)}
                />
            ) : null}
        </section>
    );
}
