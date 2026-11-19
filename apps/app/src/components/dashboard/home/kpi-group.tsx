import ArrowDownLeft01Icon from "@hugeicons/core-free-icons/ArrowDownLeft01Icon";
import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon";
import Invoice01Icon from "@hugeicons/core-free-icons/Invoice01Icon";
import MoneySafeIcon from "@hugeicons/core-free-icons/MoneySafeIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import { Kpi } from "panelui-web/kpi";
import type { KpiColor, KpiGoodDirection, KpiTone } from "panelui-web/kpi";
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
const STACK_OVER = 12;
const PILL = "dash-figure [&_svg]:hidden";
const LINE = "[&_path]:[vector-effect:non-scaling-stroke]";
// Equal cells, padding included: flex-1 alone gives the first and last cell more room.
const EQUAL_COLUMNS =
    "lg:grid lg:auto-cols-fr lg:grid-flow-col lg:divide-x-0 lg:*:not-first:border-s lg:*:not-first:border-border";
export const TWO_BY_TWO =
    "max-lg:grid max-lg:grid-cols-2 max-lg:gap-y-5 max-lg:divide-x-0 max-lg:*:odd:border-e max-lg:*:odd:ps-0 max-lg:*:odd:pe-3 max-lg:*:even:ps-3 max-lg:*:even:pe-0";
export const STACKED =
    "max-sm:flex max-sm:flex-col max-sm:gap-y-4 max-sm:divide-y-0 max-sm:divide-x-0 max-sm:*:px-0 max-sm:*:odd:border-e-0 max-sm:*:odd:pe-0 max-sm:*:even:ps-0";

const percentOf = (share: number) => `${Math.round(share * PERCENT)}%`;

function Change({ delta, goodDirection }: { delta: number | null; goodDirection?: KpiGoodDirection }) {
    if (delta === null) {
        return null;
    }
    return (
        <Kpi.Trend
            className={PILL}
            goodDirection={goodDirection}
            value={Math.round(delta * PERCENT * TENTHS) / TENTHS}
            variant="badge"
        />
    );
}

function Share({ label }: { label: string }) {
    return <Kpi.Trend className={PILL} format={() => label} goodDirection="none" value={0} variant="badge" />;
}

const stretch = (node: SVGSVGElement | null) => node?.setAttribute("preserveAspectRatio", "none");

interface FigureProps {
    color?: KpiColor;
    icon: IconSvgElement;
    label: ReactNode;
    points: number[] | null;
    tone?: KpiTone;
    trend: ReactNode;
    value: string;
}

function Figure({ color, icon, label, points, tone, trend, value }: FigureProps) {
    return (
        <Kpi className="min-w-0 gap-0">
            <Kpi.Header>
                <Kpi.Icon tone={tone}>
                    <HugeiconsIcon icon={icon} size={16} strokeWidth={1.5} />
                </Kpi.Icon>
                <Kpi.Title className="min-w-0 truncate">{label}</Kpi.Title>
            </Kpi.Header>
            <Kpi.Content className="mt-2 items-end gap-3" layout="inline">
                <Kpi.Stat className="min-w-0">
                    <Kpi.Value className="dash-figure text-app-figure font-semibold wrap-anywhere">{value}</Kpi.Value>
                    <Kpi.Footer className="text-app-caption mt-1 h-5">{trend}</Kpi.Footer>
                </Kpi.Stat>
                {points ? (
                    <Kpi.Chart
                        aria-hidden
                        className={`h-8 w-24 shrink-0 max-sm:w-16 ${color ? LINE : `${LINE} [--pu-color:var(--muted-foreground)]`}`}
                        color={color}
                        data={points}
                        height={32}
                        ref={stretch}
                        strokeWidth={1.5}
                    />
                ) : null}
            </Kpi.Content>
        </Kpi>
    );
}

export function KpiGroup({ quiet }: { quiet: boolean }) {
    const { filters, ledger } = useDashboard();
    const { incomeTracking } = useContext(LedgerSettingsContext);
    const copy = useIntlayer("dashboard-home").kpi;
    const { money } = useDisplayFormat();
    const scope = useMemo(() => ({ accounts: filters.accounts }), [filters.accounts]);
    const figures = useMemo(() => kpis(ledger, filters.range, scope), [filters.range, ledger, scope]);
    const lines = useMemo(() => sparks(ledger, filters.range, scope), [filters.range, ledger, scope]);
    const picked = useMemo(
        () => (filters.categories.length > 0 ? categorySpend(ledger, filters.range, scope, filters.categories) : null),
        [filters.categories, filters.range, ledger, scope]
    );
    const spentNow = picked ? { ...figures.spent, delta: picked.delta, value: picked.value } : figures.spent;
    const shown = (value: number) => money(value, ledger.currency);
    // A period with nothing in it has no history worth drawing, and its closing balance says nothing either.
    const now = useMemo(
        () => (quiet ? (netWorthPoints(ledger, scope, [ledger.now])[0]?.net ?? 0) : null),
        [ledger, quiet, scope]
    );
    const zero = <Share label={percentOf(0)} />;
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
    const layout = `${EQUAL_COLUMNS} ${incomeTracking ? TWO_BY_TWO : ""} ${longest > STACK_OVER ? STACKED : ""}`;
    const sharePoints = picked
        ? `${picked.shareChange > 0 ? "+" : ""}${(picked.shareChange * PERCENT).toFixed(1)}`
        : null;

    return (
        <Kpi.Group className={`rounded-app-xl ${layout}`} surface>
            <Figure
                icon={MoneySafeIcon}
                label={copy.netWorth}
                points={quiet ? null : lines.netWorth}
                trend={
                    quiet ? (
                        <span className="text-muted-foreground">{copy.now}</span>
                    ) : (
                        <Change delta={figures.netWorth.delta} />
                    )
                }
                value={values.netWorth}
            />
            {incomeTracking ? (
                <Figure
                    color="success"
                    icon={ArrowDownLeft01Icon}
                    label={copy.income}
                    points={quiet ? null : lines.income}
                    tone="good"
                    trend={quiet ? zero : <Change delta={figures.income.delta} />}
                    value={values.income}
                />
            ) : null}
            <Figure
                color="primary"
                icon={ArrowUpRight01Icon}
                label={copy.spent}
                points={quiet ? null : (picked?.spentPoints ?? lines.spent)}
                tone="bad"
                trend={quiet ? zero : <Change delta={spentNow.delta} goodDirection="down" />}
                value={values.spent}
            />
            {incomeTracking && picked ? (
                <Figure
                    icon={Invoice01Icon}
                    label={copy.ofSpending}
                    points={quiet ? null : picked.sharePoints}
                    trend={quiet ? zero : <Share label={copy.points({ points: sharePoints ?? "0.0" }).value} />}
                    value={percentOf(picked.share)}
                />
            ) : null}
            {incomeTracking && !picked ? (
                <Figure
                    icon={Invoice01Icon}
                    label={copy.kept}
                    points={quiet ? null : lines.kept}
                    trend={
                        quiet ? zero : figures.kept.share !== null && <Share label={percentOf(figures.kept.share)} />
                    }
                    value={values.kept}
                />
            ) : null}
        </Kpi.Group>
    );
}
