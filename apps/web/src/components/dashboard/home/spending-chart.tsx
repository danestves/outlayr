import ArrowRight from "@hugeicons/core-free-icons/ArrowRight01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { buttonVariants } from "panelui-web/button";
import { useContext, useMemo } from "react";
import { useIntlayer } from "react-intlayer";

import { AreaChart } from "@/components/charts/area-chart";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { categoryBudget, spendSeries } from "@/lib/dashboard-series";
import { LedgerSettingsContext, useDisplayFormat } from "@/lib/ledger-settings";
import { cn } from "@/lib/utils";

import { useCategoryName, useDateFormat, useWholeMoney } from "./format";

const DIMMED_BAND = 0.2;
const CHART_HEIGHT = 328;
const CHART_WIDTH = 824;
const X_TICKS = 5;

export function SpendingChart() {
    const { filters, ledger, setFilters } = useDashboard();
    const { incomeTracking } = useContext(LedgerSettingsContext);
    const copy = useIntlayer("dashboard-home").chart;
    const categoryName = useCategoryName();
    const date = useDateFormat();
    const { money } = useDisplayFormat();
    const { compact, whole } = useWholeMoney(ledger.currency);
    const { category, period } = filters;
    const series = useMemo(
        () => spendSeries(ledger, period, { accounts: filters.accounts, category }),
        [category, filters.accounts, ledger, period]
    );
    const budget = useMemo(
        () => (category === null ? null : categoryBudget(ledger, category, period)),
        [category, ledger, period]
    );
    const aligned = budget !== null && budget.from === period.from && budget.to === period.to;
    const runOutIndex = aligned && budget.runOut ? series.data.findIndex((row) => row.date === budget.runOut?.day) : -1;
    const selected = category === null ? undefined : ledger.categories.get(category);
    const lastDay = series.data.at(-1)?.date;
    return (
        <section aria-labelledby="spending-title">
            <div className="flex min-h-[42px] items-center gap-2 px-5 pt-2">
                <h2 className="text-[13px] font-semibold" id="spending-title">
                    {incomeTracking ? copy.title : copy.titleSpendOnly}
                </h2>
                <Link
                    className={cn(
                        buttonVariants({ size: "sm", variant: "outline" }),
                        "ml-auto h-7 gap-1 px-2.5 text-xs"
                    )}
                    search={(previous) => previous}
                    to="/app/insights"
                >
                    {copy.seeCashFlow}
                    <HugeiconsIcon className="size-3.5" icon={ArrowRight} />
                </Link>
            </div>
            <div className="px-5 pt-1 pb-4">
                <AreaChart
                    ariaDescription={copy.description({ day: date.day(String(lastDay ?? period.from)) }).value}
                    ariaLabel={(incomeTracking ? copy.title : copy.titleSpendOnly).value}
                    data={series.data}
                    height={CHART_HEIGHT}
                    initialWidth={CHART_WIDTH}
                    onSelect={(key) => ledger.categories.has(key) && setFilters({ category: key })}
                >
                    <AreaChart.Grid color="var(--color-border)" rows={4} />
                    <AreaChart.XAxis format={(row) => date.day(String(row.date))} ticks={X_TICKS} />
                    <AreaChart.YAxis format={compact} ticks={4} />
                    {series.categories.map((each) => (
                        <AreaChart.Area
                            color={each.color}
                            dataKey={each.id}
                            key={each.id}
                            label={categoryName(each)}
                            opacity={selected && each.id !== selected.id ? DIMMED_BAND : 1}
                        />
                    ))}
                    {incomeTracking ? (
                        <AreaChart.Line
                            color="var(--color-foreground)"
                            curve="step"
                            dataKey="income"
                            label={copy.income.value}
                        />
                    ) : null}
                    <AreaChart.Labels
                        extra={
                            incomeTracking
                                ? [{ at: series.keptAt, id: "kept", label: copy.kept.value, value: series.kept }]
                                : []
                        }
                        formatValue={(value) => whole(value)}
                    />
                    {aligned && selected ? (
                        <AreaChart.ReferenceLine
                            color="var(--color-foreground)"
                            dashArray="3 3"
                            label={
                                copy.budget({ amount: whole(budget.effectiveLimit), name: categoryName(selected) })
                                    .value
                            }
                            y={budget.effectiveLimit}
                        />
                    ) : null}
                    {runOutIndex >= 0 && aligned && budget.runOut ? (
                        <AreaChart.Marker
                            index={runOutIndex}
                            label={copy.budgetGone({ day: date.day(budget.runOut.day) }).value}
                        />
                    ) : null}
                    <AreaChart.Tooltip
                        formatValue={(value) => money(value, ledger.currency)}
                        formatX={(row) => date.weekday(String(row.date))}
                    />
                </AreaChart>
            </div>
        </section>
    );
}
