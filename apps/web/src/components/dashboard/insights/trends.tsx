import { AreaChart } from "panelui-web/area-chart";
import { BarChart } from "panelui-web/bar-chart";
import { MirrorAreaChart } from "panelui-web/mirror-area-chart";
import { WaterfallChart } from "panelui-web/waterfall-chart";
import type { WaterfallDatum } from "panelui-web/waterfall-chart";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { CardFrame } from "@/components/dashboard/home/card-frame";
import { useDashboard } from "@/components/dashboard/shell/dashboard";

import { useInsightsFormat } from "./format";
import type { InsightsModel } from "./model";

type Format = ReturnType<typeof useInsightsFormat>;

const LEGEND_ROOM = 1.25;
const FEW_MONTHS = 6;
const NARROW_BAR = 28;

const keptPercent = (income: number, spent: number) =>
    income > 0 ? Math.round(((income - spent) / income) * 100) : null;

function Aside({ label, value }: { label?: ReactNode; value: string }) {
    return (
        <span className="text-muted-foreground text-xs">
            {label} <span className="text-foreground font-mono font-medium">{value}</span>
        </span>
    );
}

function Body({ children }: { children: ReactNode }) {
    return <div className="px-4 pt-3 pb-3">{children}</div>;
}

function Nothing({ children }: { children: ReactNode }) {
    return <p className="text-muted-foreground p-4 text-sm">{children}</p>;
}

export function ChangesCard({ model }: { model: InsightsModel }) {
    const { filters, ledger } = useDashboard();
    const copy = useIntlayer("dashboard-insights");
    const fmt = useInsightsFormat(ledger);
    const period = fmt.periodName(filters.period);
    const { changes } = model;
    const title = copy.changes.title({ period: `${period.charAt(0).toLocaleUpperCase()}${period.slice(1)}` });
    if (changes === null) {
        return (
            <CardFrame title={title}>
                <Nothing>{copy.changes.empty}</Nothing>
            </CardFrame>
        );
    }
    const data: WaterfallDatum[] = [
        { label: copy.changes.usual.value, total: true, value: changes.usual },
        ...changes.moves.map((move) => ({
            label: ledger.categories.get(move.categoryId)?.name ?? copy.changes.other.value,
            value: move.delta,
        })),
        ...(changes.other === 0 ? [] : [{ label: copy.changes.other.value, value: changes.other }]),
        { label: period, total: true, value: 0 },
    ];
    const stepValue = (value: number, total: boolean) => (total ? fmt.compact(value) : fmt.signedWhole(value));
    return (
        <CardFrame
            action={<Aside label={copy.changes.usual} value={fmt.amount(changes.usual)} />}
            stackAction
            title={title}
        >
            <Body>
                <WaterfallChart
                    aspectRatio={1.9}
                    data={data}
                    fallColor="success"
                    label={title.value}
                    riseColor="destructive"
                    totalColor="chart-1"
                >
                    <WaterfallChart.Grid />
                    <WaterfallChart.Connectors />
                    <WaterfallChart.Bars />
                    <WaterfallChart.Values format={(step) => stepValue(step.value, step.kind === "total")} />
                    <WaterfallChart.XAxis />
                    <WaterfallChart.YAxis format={fmt.compact} ticks={4} />
                    <WaterfallChart.Tooltip
                        formatTotal={(step) => fmt.amount(step.end)}
                        formatValue={(step) =>
                            step.kind === "total" ? fmt.amount(step.value) : fmt.signedWhole(step.value)
                        }
                        labels={{
                            balance: copy.changes.running.value,
                            fall: copy.changes.less.value,
                            rise: copy.changes.more.value,
                            total: copy.changes.total.value,
                        }}
                    />
                </WaterfallChart>
            </Body>
        </CardFrame>
    );
}

function monthsData(model: InsightsModel) {
    const last = model.months.length - 1;
    return model.months.map((month, index) => ({
        income: month.income,
        key: month.key,
        now: index === last ? month.spent : null,
        past: index === last ? null : month.spent,
        spent: month.spent,
    }));
}

export function MonthsCard({ model }: { model: InsightsModel }) {
    const { ledger } = useDashboard();
    const copy = useIntlayer("dashboard-insights");
    const fmt = useInsightsFormat(ledger);
    const ended = model.months.filter((month) => month.ended);
    const average = ended.length === 0 ? 0 : ended.reduce((sum, month) => sum + month.spent, 0) / ended.length;
    const spent = model.months.some((month) => month.spent > 0);
    return (
        <CardFrame
            action={average > 0 ? <Aside label={copy.months.averageLabel} value={fmt.amount(average)} /> : null}
            title={copy.months.title}
        >
            {spent ? (
                <Body>
                    <BarChart
                        aspectRatio={1.9}
                        barWidth={model.months.length < FEW_MONTHS ? NARROW_BAR : undefined}
                        data={monthsData(model)}
                        label={copy.months.title.value}
                        stacked
                        xDataKey="key"
                    >
                        <BarChart.Grid />
                        <BarChart.Bar color="chart-2" dataKey="past" />
                        <BarChart.Bar color="chart-1" dataKey="now" />
                        <BarChart.XAxis format={(datum) => fmt.month(String(datum.key))} />
                        <BarChart.YAxis format={fmt.compact} ticks={4} />
                        <BarChart.Tooltip
                            formatValue={(value) => fmt.amount(value)}
                            formatX={(datum) => fmt.month(String(datum.key))}
                            labels={{ now: copy.trend.spending.value, past: copy.trend.spending.value }}
                        />
                    </BarChart>
                </Body>
            ) : (
                <Nothing>{copy.empty.spending}</Nothing>
            )}
        </CardFrame>
    );
}

function keptLine(
    fmt: Format,
    copy: ReturnType<typeof useIntlayer<"dashboard-insights">>,
    income: number,
    spent: number
) {
    const percent = keptPercent(income, spent);
    return percent === null ? fmt.amount(income - spent) : copy.trend.kept({ percent: String(percent) }).value;
}

export function IncomeSpendingCard({ model }: { model: InsightsModel }) {
    const { ledger } = useDashboard();
    const copy = useIntlayer("dashboard-insights");
    const fmt = useInsightsFormat(ledger);
    const { income, spent } = model.flow;
    const percent = keptPercent(income, spent);
    const top = Math.max(1, ...model.months.flatMap((month) => [month.income, month.spent])) * LEGEND_ROOM;
    const empty = model.months.every((month) => month.income === 0 && month.spent === 0);
    const single = model.months.length < 2;
    return (
        <CardFrame
            action={
                percent === null ? null : (
                    <Aside label={copy.measures.kept} value={copy.standsOut.kept({ percent: String(percent) }).value} />
                )
            }
            title={copy.trend.title}
        >
            {empty || single ? (
                <Nothing>{single ? copy.trend.single : copy.empty.cashFlow}</Nothing>
            ) : (
                <Body>
                    <MirrorAreaChart
                        aspectRatio={1.9}
                        bottomDomain={[0, top]}
                        data={monthsData(model)}
                        label={copy.trend.title.value}
                        topDomain={[0, top]}
                        xDataKey="key"
                    >
                        <MirrorAreaChart.Grid variant="lines" />
                        <MirrorAreaChart.Area
                            color="success"
                            dataKey="income"
                            label={copy.trend.income.value}
                            side="top"
                        />
                        <MirrorAreaChart.Area
                            color="destructive"
                            dataKey="spent"
                            label={copy.trend.spending.value}
                            side="bottom"
                        />
                        <MirrorAreaChart.Baseline />
                        <MirrorAreaChart.XAxis format={(datum) => fmt.month(String(datum.key))} />
                        <MirrorAreaChart.YAxis formatBottom={fmt.compact} formatTop={fmt.compact} />
                        <MirrorAreaChart.Tooltip
                            formatValue={(value) => fmt.amount(value)}
                            formatX={(datum) =>
                                `${fmt.month(String(datum.key))} · ${keptLine(fmt, copy, Number(datum.income ?? 0), Number(datum.spent ?? 0))}`
                            }
                        />
                        <MirrorAreaChart.Legend />
                    </MirrorAreaChart>
                </Body>
            )}
        </CardFrame>
    );
}

export function NetWorthCard({ model }: { model: InsightsModel }) {
    const { ledger } = useDashboard();
    const copy = useIntlayer("dashboard-insights");
    const fmt = useInsightsFormat(ledger);
    const worth = Number(model.netWorth.at(-1)?.netWorth ?? 0);
    return (
        <CardFrame action={<Aside value={fmt.amount(worth)} />} title={copy.netWorth.title}>
            {model.netWorth.length < 2 ? (
                <Nothing>{copy.trend.single}</Nothing>
            ) : (
                <Body>
                    <AreaChart aspectRatio={1.9} data={model.netWorth} label={copy.netWorth.title.value} xDataKey="key">
                        <AreaChart.Grid />
                        <AreaChart.Area color="var(--color-foreground)" dataKey="netWorth" />
                        <AreaChart.XAxis format={(datum) => fmt.month(String(datum.key))} />
                        <AreaChart.YAxis format={fmt.compact} ticks={4} />
                        <AreaChart.Tooltip
                            formatValue={(value) => fmt.amount(value)}
                            formatX={(datum) => fmt.day(String(datum.date))}
                            labels={{ netWorth: copy.netWorth.title.value }}
                        />
                    </AreaChart>
                </Body>
            )}
        </CardFrame>
    );
}
