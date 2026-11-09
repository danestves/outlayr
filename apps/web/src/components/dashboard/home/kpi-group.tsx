import { Kpi } from "panelui-web/kpi";
import type { KpiColor, KpiGoodDirection } from "panelui-web/kpi";
import { useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { kpis } from "@/lib/dashboard-series";
import { netWorthPoints } from "@/lib/dashboard-series-net-worth";
import { LedgerSettingsContext, useDisplayFormat } from "@/lib/ledger-settings";

import { categorySpend, sparks } from "./model";

const PERCENT = 100;
const TENTHS = 10;
const MONO_ADVANCE = 0.56;
const STACK_OVER = 12;
const TREND = "dash-figure text-[13px] leading-5";
const LINE = "[&_path]:[vector-effect:non-scaling-stroke]";
const NOTE = "text-muted-foreground min-w-0 truncate text-[13px] leading-5";
export const TWO_BY_TWO =
    "max-lg:grid max-lg:grid-cols-2 max-lg:gap-y-5 max-lg:divide-x-0 max-lg:*:odd:border-e max-lg:*:odd:ps-0 max-lg:*:odd:pe-3 max-lg:*:even:ps-3 max-lg:*:even:pe-0";
export const STACKED =
    "max-sm:flex max-sm:flex-col max-sm:gap-y-4 max-sm:divide-y-0 max-sm:divide-x-0 max-sm:*:px-0 max-sm:*:odd:border-e-0 max-sm:*:odd:pe-0 max-sm:*:even:ps-0";

function Change({ delta, goodDirection }: { delta: number | null; goodDirection?: KpiGoodDirection }) {
    if (delta === null) {
        return null;
    }
    return (
        <Kpi.Trend
            className={TREND}
            goodDirection={goodDirection}
            value={Math.round(delta * PERCENT * TENTHS) / TENTHS}
        />
    );
}

const flatZero = () => "0%";
const stretch = (node: SVGSVGElement | null) => node?.setAttribute("preserveAspectRatio", "none");

interface FigureProps {
    color?: KpiColor;
    label: ReactNode;
    longest: number;
    points: number[] | null;
    trend: ReactNode;
    value: string;
}

function Figure({ color, label, longest, points, trend, value }: FigureProps) {
    return (
        <Kpi className="@container">
            <Kpi.Header className="max-sm:min-h-10 max-sm:flex-col max-sm:items-start max-sm:gap-0">
                <Kpi.Title className="min-w-fit max-sm:w-full">{label}</Kpi.Title>
                {trend}
            </Kpi.Header>
            <Kpi.Value
                className="dash-figure leading-8 font-semibold tracking-[-0.04em] wrap-anywhere"
                style={{ fontSize: `clamp(12px, calc(100cqi / ${longest * MONO_ADVANCE}), 24px)` }}
            >
                {value}
            </Kpi.Value>
            {points ? (
                <Kpi.Chart
                    aria-hidden
                    className={color ? LINE : `${LINE} [--pu-color:var(--muted-foreground)]`}
                    color={color}
                    data={points}
                    height={32}
                    ref={stretch}
                    strokeWidth={1.5}
                />
            ) : null}
        </Kpi>
    );
}

export function KpiGroup({ quiet }: { quiet: boolean }) {
    const { filters, ledger } = useDashboard();
    const { incomeTracking } = useContext(LedgerSettingsContext);
    const copy = useIntlayer("dashboard-home").kpi;
    const { money } = useDisplayFormat();
    const scope = useMemo(() => ({ accounts: filters.accounts }), [filters.accounts]);
    const figures = useMemo(() => kpis(ledger, filters.period, scope), [filters.period, ledger, scope]);
    const lines = useMemo(() => sparks(ledger, filters.period, scope), [filters.period, ledger, scope]);
    const picked = useMemo(
        () => (filters.categories.length > 0 ? categorySpend(ledger, filters.period, scope, filters.categories) : null),
        [filters.categories, filters.period, ledger, scope]
    );
    const spentNow = picked ? { ...figures.spent, delta: picked.delta, value: picked.value } : figures.spent;
    const shown = (value: number) => money(value, ledger.currency);
    // A period with nothing in it has no history worth drawing, and its closing balance says nothing either.
    const now = useMemo(
        () => (quiet ? (netWorthPoints(ledger, scope, [ledger.now])[0]?.net ?? 0) : null),
        [ledger, quiet, scope]
    );
    const zero = <Kpi.Trend className={TREND} format={flatZero} value={0} />;
    const values = {
        income: shown(figures.income.value),
        kept: shown(figures.kept.value),
        netWorth: shown(now ?? figures.netWorth.value),
        spent: shown(spentNow.value),
    };
    const longest = Math.max(
        ...(incomeTracking
            ? [values.netWorth, values.income, values.spent, values.kept]
            : [values.netWorth, values.spent]
        ).map((value) => value.length)
    );
    const layout = `${incomeTracking ? TWO_BY_TWO : ""} ${longest > STACK_OVER ? STACKED : ""}`;

    return (
        <Kpi.Group className={`rounded-2xl ${layout}`} surface>
            <Figure
                label={copy.netWorth}
                longest={longest}
                points={quiet ? null : lines.netWorth}
                trend={quiet ? <span className={NOTE}>{copy.now}</span> : <Change delta={figures.netWorth.delta} />}
                value={values.netWorth}
            />
            {incomeTracking ? (
                <Figure
                    color="success"
                    label={copy.income}
                    longest={longest}
                    points={quiet ? null : lines.income}
                    trend={quiet ? zero : <Change delta={figures.income.delta} />}
                    value={values.income}
                />
            ) : null}
            <Figure
                color="primary"
                label={copy.spent}
                longest={longest}
                points={quiet ? null : (picked?.spentPoints ?? lines.spent)}
                trend={quiet ? zero : <Change delta={spentNow.delta} goodDirection="down" />}
                value={values.spent}
            />
            {incomeTracking && picked ? (
                <Figure
                    label={copy.ofSpending}
                    longest={longest}
                    points={quiet ? null : picked.sharePoints}
                    trend={
                        quiet ? (
                            zero
                        ) : (
                            <span className={NOTE}>
                                {copy.points({
                                    points: `${picked.shareChange > 0 ? "+" : ""}${(picked.shareChange * PERCENT).toFixed(1)}`,
                                })}
                            </span>
                        )
                    }
                    value={`${Math.round(picked.share * PERCENT)}%`}
                />
            ) : null}
            {incomeTracking && !picked ? (
                <Figure
                    label={copy.kept}
                    longest={longest}
                    points={quiet ? null : lines.kept}
                    trend={
                        quiet
                            ? zero
                            : figures.kept.share !== null && (
                                  <span className={NOTE}>
                                      {copy.share({ percent: Math.round(figures.kept.share * PERCENT) })}
                                  </span>
                              )
                    }
                    value={values.kept}
                />
            ) : null}
        </Kpi.Group>
    );
}
