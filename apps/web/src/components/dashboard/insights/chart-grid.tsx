import { useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { BarChart } from "@/components/charts/bar-chart";
import { LineChart } from "@/components/charts/line-chart";
import { TreemapChart } from "@/components/charts/treemap-chart";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { cn } from "@/lib/utils";

import { useInsightsFormat } from "./format";
import type { InsightsModel } from "./model";

const TREEMAP_HEIGHT = 178;
const MONTHS_HEIGHT = 150;
const TALL_HEIGHT = 190;
const PAST_MONTH_OPACITY = 0.55;
const CHART_WIDTH = 470;
const X_TICKS = 5;
const GRID = { color: "var(--color-border)" } as const;

interface CellProps {
    aside?: ReactNode;
    children: ReactNode;
    className?: string;
    id?: string;
    title: ReactNode;
}

function Cell({ aside, children, className, id, title }: CellProps) {
    return (
        <section className={cn("border-border min-w-0 border-b px-5 pt-4 pb-4", className)} id={id}>
            <div className="mb-2 flex items-baseline justify-between gap-3">
                <h2 className="text-sm font-medium">{title}</h2>
                {aside ? <span className="text-muted-foreground text-xs">{aside}</span> : null}
            </div>
            {children}
        </section>
    );
}

function Nothing({ height }: { height: number }) {
    const { empty } = useIntlayer("dashboard-insights");
    return (
        <p className="text-muted-foreground text-sm" style={{ minHeight: height }}>
            {empty.spending}
        </p>
    );
}

function countOf(count: number, copy: ReturnType<typeof useIntlayer<"dashboard-insights">>) {
    if (count === 0) {
        return undefined;
    }
    return count === 1 ? copy.categories.countOne : copy.categories.count({ count });
}

export function ChartGrid({ model }: { model: InsightsModel }) {
    const { ledger } = useDashboard();
    const copy = useIntlayer("dashboard-insights");
    const fmt = useInsightsFormat(ledger);
    const navigate = useNavigate();
    const { daily, months, netWorth, spend } = model;
    const spending = spend.length > 0;
    const spentLately = months.categories.length > 0;
    const dailyBars = daily.categories.filter((category) => category.id !== daily.excluded?.id).toReversed();
    const dailyAverage = daily.excluded ? daily.averageWithout : daily.average;
    const lastMonth = months.data.length - 1;
    const worth = Number(netWorth.at(-1)?.netWorth ?? 0);
    return (
        <div className="grid md:grid-cols-2">
            <Cell aside={countOf(spend.length, copy)} className="md:border-r" title={copy.categories.title}>
                {spending ? (
                    <TreemapChart
                        ariaLabel={copy.categories.title.value}
                        data={spend}
                        height={TREEMAP_HEIGHT}
                        initialWidth={CHART_WIDTH}
                        onSelect={(tile) =>
                            navigate({ search: (previous) => ({ ...previous, category: tile.id }), to: "/app" })
                        }
                    >
                        <TreemapChart.Tiles />
                        <TreemapChart.Labels formatValue={fmt.amount} />
                        <TreemapChart.Tooltip formatValue={fmt.amount} />
                    </TreemapChart>
                ) : (
                    <Nothing height={TREEMAP_HEIGHT} />
                )}
            </Cell>
            <Cell
                aside={months.average > 0 ? copy.months.average({ amount: fmt.amount(months.average) }) : undefined}
                title={copy.months.title}
            >
                {spentLately ? (
                    <BarChart
                        ariaLabel={copy.months.title.value}
                        barGap={0.45}
                        columnOpacity={(_, index) => (index === lastMonth ? 1 : PAST_MONTH_OPACITY)}
                        data={months.data}
                        height={MONTHS_HEIGHT}
                        initialWidth={CHART_WIDTH}
                        stackGap={1}
                    >
                        {months.categories.toReversed().map((category) => (
                            <BarChart.Bar
                                color={category.color}
                                dataKey={category.id}
                                key={category.id}
                                label={category.name}
                            />
                        ))}
                        <BarChart.Grid {...GRID} />
                        <BarChart.Legend className="mt-2" />
                        <BarChart.Tooltip formatValue={fmt.amount} formatX={(datum) => fmt.month(String(datum.key))} />
                        <BarChart.XAxis
                            format={(datum) => fmt.month(String(datum.key))}
                            highlight={(_, index) => index === lastMonth}
                            ticks={months.data.length}
                        />
                        <BarChart.YAxis format={fmt.compact} ticks={3} />
                    </BarChart>
                ) : (
                    <Nothing height={MONTHS_HEIGHT} />
                )}
            </Cell>
            <Cell
                aside={
                    daily.excluded
                        ? copy.daily.averageWithout({
                              amount: fmt.amount(daily.averageWithout),
                              name: daily.excluded.name,
                          })
                        : copy.daily.average({ amount: fmt.amount(daily.average) })
                }
                className="md:border-r"
                id="daily-spend"
                title={copy.daily.title}
            >
                {spending ? (
                    <BarChart
                        ariaLabel={copy.daily.title.value}
                        barGap={0.3}
                        data={daily.data}
                        height={TALL_HEIGHT}
                        initialWidth={CHART_WIDTH}
                        stackGap={1}
                        xDataKey="date"
                    >
                        {dailyBars.map((category) => (
                            <BarChart.Bar
                                color={category.color}
                                dataKey={category.id}
                                key={category.id}
                                label={category.name}
                            />
                        ))}
                        <BarChart.Grid {...GRID} />
                        <BarChart.ReferenceLine color="var(--color-foreground)" y={dailyAverage} />
                        <BarChart.Tooltip formatValue={fmt.amount} formatX={(datum) => fmt.day(String(datum.date))} />
                        <BarChart.XAxis format={(datum) => fmt.day(String(datum.date))} ticks={X_TICKS} />
                        <BarChart.YAxis format={fmt.compact} ticks={3} />
                    </BarChart>
                ) : (
                    <Nothing height={TALL_HEIGHT} />
                )}
            </Cell>
            <Cell aside={fmt.amount(worth)} title={copy.netWorth.title}>
                <LineChart
                    ariaLabel={copy.netWorth.title.value}
                    data={netWorth}
                    height={TALL_HEIGHT}
                    initialWidth={CHART_WIDTH}
                    xDataKey="date"
                >
                    <LineChart.Line
                        color="var(--color-foreground)"
                        dataKey="netWorth"
                        endMarker
                        label={copy.netWorth.title.value}
                    />
                    <LineChart.Grid {...GRID} />
                    <LineChart.Tooltip formatValue={fmt.amount} formatX={(datum) => fmt.day(String(datum.date))} />
                    <LineChart.XAxis format={(datum) => fmt.month(String(datum.key))} ticks={X_TICKS} />
                    <LineChart.YAxis format={fmt.compact} ticks={4} />
                </LineChart>
            </Cell>
        </div>
    );
}
