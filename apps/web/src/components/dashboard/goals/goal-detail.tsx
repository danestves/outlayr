import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon";
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import Delete02Icon from "@hugeicons/core-free-icons/Delete02Icon";
import MoreVerticalIcon from "@hugeicons/core-free-icons/MoreVerticalIcon";
import PencilEdit01Icon from "@hugeicons/core-free-icons/PencilEdit01Icon";
import { Link } from "@tanstack/react-router";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { Frame } from "panelui-web/frame";
import { Menu } from "panelui-web/menu";
import { Plot, usePlot, xOf, yOf } from "panelui-web/plot";
import { Table } from "panelui-web/table";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { AccountsBar, Card, Cell, DataTable, MUTED } from "@/components/dashboard/accounts/accounts-screen";
import { Glyph } from "@/components/dashboard/accounts/glyph";
import { accountRows } from "@/components/dashboard/accounts/model";
import { KpiBand, KpiCell, useChartRatio } from "@/components/dashboard/accounts/parts";
import { Y_LABEL, useMonthShort } from "@/components/dashboard/accounts/worth-chart";
import { useDateFormat, useMonthYear, useWholeMoney } from "@/components/dashboard/home/format";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { Restoring } from "@/components/dashboard/shell/sampled";
import { AccountTile } from "@/components/ledger/tiles";

import { useGoalFlows } from "./flow-context";
import { GoalFlowsProvider } from "./goal-flows";
import {
    MONTH_BARS,
    addMonths,
    averageAdded,
    contributions,
    goalChart,
    goalViews,
    monthlyAdded,
    projectedDay,
    standingOf,
} from "./model";
import type { GoalChart, GoalView, MonthAdded } from "./model";
import { PERCENT, ReachedBadge, Terrain, percentOf, useGoalMoney } from "./parts";

const CHART = 778 / 250;
const X_TICKS = 7;
const THOUSAND = 1000;
const BAR_MENU_OVERHANG = -23;
const TINT = "var(--color-app-tint)";
const INCOME = "var(--color-app-income)";
const FIELD = "flex h-[42px] items-center justify-between gap-3 border-b text-[13px] last:border-0";
const KPI_BADGE = "dash-figure h-5 rounded-full px-2 text-xs font-medium";

interface Detail {
    added: MonthAdded[];
    chart: GoalChart | null;
    view: GoalView;
}

function useDetail(goalId: string): Detail | null {
    const { ledger, overview } = useDashboard();
    return useMemo(() => {
        const view = goalViews(ledger, accountRows(ledger, overview)).find(
            (each) => each.id.toLowerCase() === goalId.toLowerCase()
        );
        if (!view) {
            return null;
        }
        const added = monthlyAdded(ledger, view);
        const chart = view.comparable ? goalChart(ledger, view, projectedDay(ledger, view, averageAdded(added))) : null;
        return { added, chart, view };
    }, [goalId, ledger, overview]);
}

function DetailBar({ view }: { view: GoalView }) {
    const { back, menu, title } = useIntlayer("dashboard-goals");
    const { open } = useGoalFlows();
    const { reached } = view.progress;
    return (
        <AccountsBar
            title={
                <span className="flex min-w-0 items-center gap-2">
                    <Button
                        aria-label={back.value}
                        className="mr-1 size-[30px]"
                        nativeButton={false}
                        render={<Link to="/app/goals" />}
                        size="icon"
                        variant="outline"
                    >
                        <Glyph icon={ArrowLeft01Icon} className="text-muted-foreground" size={16} />
                    </Button>
                    <Link
                        className="text-muted-foreground hover:text-foreground text-[13px] font-normal"
                        to="/app/goals"
                    >
                        {title}
                    </Link>
                    <Glyph icon={ArrowRight01Icon} className="text-muted-foreground flex-none" size={14} />
                    <span className="truncate">{view.name}</span>
                </span>
            }
        >
            <Button className="max-sm:hidden" onClick={() => open({ goalId: view.id, kind: "edit" })} variant="outline">
                <Glyph icon={PencilEdit01Icon} className="text-muted-foreground" size={16} />
                {menu.edit}
            </Button>
            {reached ? null : (
                <Button onClick={() => open({ goalId: view.id, kind: "add" })}>
                    <Glyph icon={Add01Icon} size={16} />
                    {menu.addMoney}
                </Button>
            )}
            <Menu>
                <Menu.Trigger
                    aria-label={menu.more({ name: view.name }).value}
                    render={<Button size="icon" variant="outline" />}
                >
                    <Glyph icon={MoreVerticalIcon} className="text-muted-foreground" />
                </Menu.Trigger>
                <Menu.Content
                    align="end"
                    alignOffset={BAR_MENU_OVERHANG}
                    className="app-shell ph-no-capture w-[198px]"
                    sideOffset={4}
                >
                    <Menu.Item className="sm:hidden" onClick={() => open({ goalId: view.id, kind: "edit" })}>
                        <Glyph icon={PencilEdit01Icon} size={16} />
                        {menu.edit}
                    </Menu.Item>
                    <Menu.Separator className="sm:hidden" />
                    <Menu.Item onClick={() => open({ goalId: view.id, kind: "delete" })} variant="destructive">
                        <Glyph icon={Delete02Icon} size={16} />
                        {menu.delete}
                    </Menu.Item>
                </Menu.Content>
            </Menu>
        </AccountsBar>
    );
}

const note = (children: ReactNode) => (
    <span className="text-muted-foreground min-w-0 truncate text-[13px] leading-5">{children}</span>
);

function Kpis({ detail }: { detail: Detail }) {
    const { ledger } = useDashboard();
    const copy = useIntlayer("dashboard-goals");
    const format = useGoalMoney();
    const monthYear = useMonthYear();
    const { view } = detail;
    const { pace, reached } = view.progress;
    const by = view.targetDay ? copy.detail.byMonth({ month: monthYear(view.targetDay) }) : null;
    const percent = percentOf(view);
    const saved = (
        <span className="flex min-w-0 items-center gap-2">
            {note(copy.detail.ofTarget({ amount: format(view.target, view.targetCurrency) }))}
            <Badge
                className={`${KPI_BADGE} ${reached ? "" : "text-muted-foreground"}`}
                variant={reached ? "success" : "secondary"}
            >
                {percent}%
            </Badge>
        </span>
    );
    if (!view.comparable) {
        return (
            <KpiBand>
                <KpiCell color={MUTED} label={copy.columns.saved} value={format(view.saved, view.savedCurrency)}>
                    {note(view.account.name)}
                </KpiCell>
                <KpiCell color={MUTED} label={copy.detail.target} value={format(view.target, view.targetCurrency)}>
                    {note(by)}
                </KpiCell>
                <KpiCell
                    color={MUTED}
                    label={copy.detail.perMonth}
                    tone="text-muted-foreground"
                    value={copy.detail.noRate.value}
                >
                    {note(copy.detail.toMakeDate)}
                </KpiCell>
                <KpiCell
                    color={MUTED}
                    label={copy.detail.pace}
                    tone="text-muted-foreground"
                    value={copy.detail.noRate.value}
                >
                    <Badge className={KPI_BADGE.replace("dash-figure ", "")} dot variant="warning">
                        {copy.detail.cantCompare}
                    </Badge>
                </KpiCell>
            </KpiBand>
        );
    }
    if (reached) {
        const reachedMonth = detail.chart?.reachedDay ?? view.targetDay;
        return (
            <KpiBand>
                <KpiCell color={MUTED} label={copy.columns.holds} value={format(view.saved, view.savedCurrency)}>
                    {saved}
                </KpiCell>
                <KpiCell color={MUTED} label={copy.detail.perMonth} value={format(0, ledger.currency)}>
                    {note(copy.detail.nothingLeft)}
                </KpiCell>
                <KpiCell
                    color={MUTED}
                    label={copy.detail.pastTarget}
                    value={format(Math.max(0, view.saved - view.target), ledger.currency)}
                >
                    {note(by)}
                </KpiCell>
                <KpiCell
                    color={INCOME}
                    label={copy.detail.status}
                    tone="text-app-income font-sans!"
                    value={copy.pace.reached.value}
                >
                    {reachedMonth ? <ReachedBadge>{monthYear(reachedMonth)}</ReachedBadge> : <span />}
                </KpiCell>
            </KpiBand>
        );
    }
    const standing = standingOf(view);
    let paceValue = "–";
    let tone = "";
    let badge: ReactNode = <span />;
    if (standing?.kind === "ahead") {
        paceValue = format(standing.amount, ledger.currency);
        tone = "text-app-income";
        badge = (
            <Badge className={KPI_BADGE} dot variant="success">
                {copy.detail.ahead}
            </Badge>
        );
    } else if (standing?.kind === "behind") {
        paceValue = format(standing.amount, ledger.currency);
        tone = "text-app-spend";
        badge = (
            <Badge className={KPI_BADGE} dot variant="destructive">
                {copy.detail.behind}
            </Badge>
        );
    } else if (standing?.kind === "onPace") {
        paceValue = format(standing.amount, ledger.currency);
        badge = (
            <Badge className={KPI_BADGE} dot variant="secondary">
                {copy.detail.onPace}
            </Badge>
        );
    }
    return (
        <KpiBand>
            <KpiCell color={MUTED} label={copy.columns.saved} value={format(view.saved, view.savedCurrency)}>
                {saved}
            </KpiCell>
            <KpiCell
                color={MUTED}
                label={copy.detail.perMonth}
                value={format(pace?.perMonth ?? view.progress.remaining, ledger.currency)}
            >
                {note(copy.detail.toMakeDate)}
            </KpiCell>
            <KpiCell color={MUTED} label={copy.detail.monthsLeft} value={String(pace?.monthsLeft ?? 0)}>
                {note(by)}
            </KpiCell>
            <KpiCell color={MUTED} label={copy.detail.pace} tone={tone} value={paceValue}>
                {badge}
            </KpiCell>
        </KpiBand>
    );
}

function useAxisMoney() {
    const { ledger } = useDashboard();
    const { compact, whole } = useWholeMoney(ledger.currency);
    return (value: number) =>
        Math.abs(value) >= THOUSAND
            ? compact(value).replace(/(\.\d)?K$/u, (_, tenth) => `${tenth ?? ""}k`)
            : whole(value);
}

function TargetLabel({ target }: { target: number }) {
    const { domainMax, domainMin, plot } = usePlot();
    const axis = useAxisMoney();
    return (
        <span
            className={`${Y_LABEL} text-muted-foreground absolute -translate-x-full -translate-y-1/2 pe-2`}
            style={{ left: plot.left, top: yOf(target, plot, domainMin, domainMax) }}
        >
            {axis(target)}
        </span>
    );
}

function PointLabel({ index, value }: { index: number; value: number }) {
    const { data, domainMax, domainMin, plot } = usePlot();
    const format = useGoalMoney();
    const { ledger } = useDashboard();
    const x = xOf(index, data.length, plot);
    const nearEnd = x > plot.left + plot.width - 72;
    return (
        <span
            className={`dash-figure text-foreground absolute text-xs font-semibold whitespace-nowrap ${nearEnd ? "-translate-x-full" : "-translate-x-1/2"}`}
            style={{ left: nearEnd ? x - 8 : x, top: yOf(value, plot, domainMin, domainMax) - 24 }}
        >
            {format(value, ledger.currency)}
        </span>
    );
}

function LegendMark({ dash, color }: { color: string; dash?: string }) {
    return (
        <svg aria-hidden className="flex-none" height="2" width="14">
            <line stroke={color} strokeDasharray={dash} strokeWidth="2" x1="0" x2="14" y1="1" y2="1" />
        </svg>
    );
}

function Legend({ projected }: { projected: string | null }) {
    const { chart } = useIntlayer("dashboard-goals");
    const monthYear = useMonthYear();
    const item = "text-muted-foreground flex items-center gap-1.5 text-[13px] whitespace-nowrap";
    return (
        <span className="flex flex-wrap items-center gap-x-3.5 gap-y-1">
            <span className={item}>
                <LegendMark color={TINT} />
                {chart.balance}
            </span>
            <span className={item}>
                <LegendMark color={MUTED} dash="4 3" />
                {chart.pace}
            </span>
            {projected ? (
                <span className={item}>
                    <LegendMark color={TINT} dash="1.5 2.5" />
                    {chart.projected({ month: monthYear(projected) })}
                </span>
            ) : null}
        </span>
    );
}

function ChartCard({ chart, view }: { chart: GoalChart; view: GoalView }) {
    const copy = useIntlayer("dashboard-goals").chart;
    const short = useMonthShort();
    const axis = useAxisMoney();
    const ratio = useChartRatio(CHART);
    const { reached } = view.progress;
    const color = reached ? INCOME : TINT;
    const marked = useMemo(
        () =>
            chart.data.map((datum, index) => ({
                ...datum,
                mark: index === chart.todayIndex ? datum.balance : null,
            })),
        [chart]
    );
    const months = new Set(chart.data.map((datum) => String(datum.day).slice(0, 7))).size;
    const values = chart.data.flatMap((datum) => [datum.balance, datum.pace, datum.projected]);
    const known = values.filter((value): value is number => value !== null);
    const floor = reached ? Math.floor(Math.min(...known) / THOUSAND) * THOUSAND : 0;
    const top = Math.max(view.target, ...known);
    return (
        <Card
            action={
                reached ? (
                    <span className="text-muted-foreground text-[13px]">{copy.reachedNote}</span>
                ) : (
                    <Legend projected={chart.projectedDay} />
                )
            }
            title={reached ? copy.reachedTitle : copy.title}
        >
            <div className="p-4 pb-3.5">
                <Plot
                    aspectRatio={ratio}
                    curve="linear"
                    data={marked}
                    label={(reached ? copy.reachedTitle : copy.title).value}
                    xDataKey="day"
                    yDomain={[floor, top]}
                >
                    <Plot.Rule color="var(--color-border)" y={view.target} />
                    {reached ? null : <Plot.Line color={MUTED} dashArray="4 3" dataKey="pace" strokeWidth={1.25} />}
                    {reached ? null : (
                        <Plot.Line color={TINT} dashArray="1.5 2.5" dataKey="projected" strokeWidth={1.5} />
                    )}
                    <Plot.Line color={color} dataKey="balance" strokeWidth={1.75} />
                    <Plot.Dots color={color} dataKey="mark" ringWidth={0} size={3.5} />
                    <Plot.XAxis
                        className="dash-figure text-[11px]"
                        format={(datum) => short(String(datum.day))}
                        ticks={Math.min(X_TICKS, months)}
                    />
                    <Plot.YAxis
                        className={Y_LABEL}
                        format={(value) => (value === floor ? axis(floor) : "")}
                        ticks={1}
                    />
                    <Plot.Overlay>
                        <TargetLabel target={view.target} />
                        <PointLabel index={chart.todayIndex} value={view.saved} />
                    </Plot.Overlay>
                </Plot>
            </div>
        </Card>
    );
}

function NoRateCard() {
    const { chart, detail } = useIntlayer("dashboard-goals");
    return (
        <Card panelClassName="relative isolate min-h-[275px] overflow-hidden" title={chart.progress}>
            <Terrain flat />
            <div className="flex min-h-[275px] flex-col items-center justify-end gap-1.5 px-6 pb-4 text-center">
                <b className="text-sm font-semibold">{detail.noRate}</b>
                <p className="text-muted-foreground max-w-[380px] text-[13px] leading-5">{chart.noRate}</p>
            </div>
        </Card>
    );
}

function Contributions({ view }: { view: GoalView }) {
    const { ledger } = useDashboard();
    const { columns, contributions: copy } = useIntlayer("dashboard-goals");
    const format = useGoalMoney();
    const date = useDateFormat();
    const monthYear = useMonthYear();
    const short = useMonthShort();
    const rows = useMemo(() => contributions(ledger, view), [ledger, view]);
    const { currency } = view.account;
    const total = rows.reduce((sum, row) => sum + row.added, 0);
    const since =
        view.startDay.slice(0, 4) === ledger.today.slice(0, 4) ? short(view.startDay) : monthYear(view.startDay);
    return (
        <Card
            aside={rows.length > 0 ? copy.since({ amount: format(total, currency), month: since }) : null}
            className="flex-1"
            title={copy.title}
        >
            {rows.length === 0 ? (
                <p className="text-muted-foreground px-4 py-6 text-[13px]">
                    {copy.none({ date: date.full(view.startDay) })}
                </p>
            ) : (
                <DataTable head={[columns.date, columns.from, columns.added, columns.balance]} numbers={0}>
                    {rows.map((row) => (
                        <Table.Row key={row.id}>
                            <Cell className="dash-figure text-muted-foreground text-[13px]">{date.day(row.day)}</Cell>
                            <Cell className="text-muted-foreground max-w-[220px] truncate text-[13px]">{row.from}</Cell>
                            <Cell className="dash-figure text-app-income text-[13px]">
                                {format(row.added, currency, "always")}
                            </Cell>
                            <Cell className="dash-figure text-sm font-medium">{format(row.balance, currency)}</Cell>
                        </Table.Row>
                    ))}
                </DataTable>
            )}
        </Card>
    );
}

function GoalCard({ view }: { view: GoalView }) {
    const { photos } = useDashboard();
    const { dialog, summary } = useIntlayer("dashboard-goals");
    const format = useGoalMoney();
    const monthYear = useMonthYear();
    return (
        <Card title={summary.title}>
            <div className="px-4 pt-[13px]">
                <div className={FIELD}>
                    <span className="text-muted-foreground">{summary.name}</span>
                    <span className="truncate font-medium">{view.name}</span>
                </div>
                <div className={FIELD}>
                    <span className="text-muted-foreground">{summary.target}</span>
                    <span className="dash-figure font-medium">
                        {format(view.goal.targetAmount, view.goal.currency)}
                    </span>
                </div>
                <div className={FIELD}>
                    <span className="text-muted-foreground">{summary.by}</span>
                    <span className="dash-figure font-medium">{view.targetDay ? monthYear(view.targetDay) : "–"}</span>
                </div>
                <div className={FIELD}>
                    <span className="text-muted-foreground">{summary.account}</span>
                    <Link
                        className="flex min-w-0 items-center gap-1.5 font-medium hover:underline"
                        params={{ accountId: view.account.id }}
                        to="/app/accounts/$accountId"
                    >
                        <AccountTile account={view.account.look} photos={photos} size="sm" />
                        <span className="truncate">{view.account.name}</span>
                    </Link>
                </div>
            </div>
            <p className="text-muted-foreground border-t px-4 py-3 text-xs leading-4">{dialog.accountLocked}</p>
        </Card>
    );
}

function MonthlyCard({ months, view }: { months: readonly MonthAdded[]; view: GoalView }) {
    const { monthly } = useIntlayer("dashboard-goals");
    const format = useGoalMoney();
    const short = useMonthShort();
    const top = Math.max(1, ...months.map((month) => month.added));
    const color = view.progress.reached ? "bg-app-income" : "bg-app-tint";
    const lead = Math.max(0, MONTH_BARS - months.length);
    const slots = [
        ...Array.from({ length: lead }, (_, index) => ({
            bar: null,
            month: addMonths(months[0]?.month ?? "", index - lead),
        })),
        ...months.map((bar) => ({ bar, month: bar.month })),
    ];
    return (
        <Frame className="min-h-[300px] min-w-0 flex-1">
            <Frame.Header>
                <Frame.Title as="h2">{monthly.title}</Frame.Title>
            </Frame.Header>
            <Frame.Panel className="flex flex-1 flex-col">
                <div className="flex min-h-[200px] flex-1 items-end gap-[6px] px-4 pt-4">
                    {slots.map(({ bar, month }) =>
                        bar ? (
                            <span
                                className="flex h-full min-w-0 flex-1 flex-col justify-end"
                                key={month}
                                title={format(bar.added, view.account.currency)}
                            >
                                <i
                                    className={`block min-h-0.5 w-full rounded-t-[3px] ${color} ${bar.current ? "" : "opacity-40"}`}
                                    style={{ height: `${(bar.added / top) * PERCENT}%` }}
                                />
                            </span>
                        ) : (
                            <span className="min-w-0 flex-1" key={month} />
                        )
                    )}
                </div>
                <div className="flex gap-[6px] px-4 pt-2 pb-3">
                    {slots.map((month) => (
                        <span
                            className="dash-figure text-muted-foreground min-w-0 flex-1 text-center text-[11px]"
                            key={month.month}
                        >
                            {short(`${month.month}-15`).slice(0, 1)}
                        </span>
                    ))}
                </div>
            </Frame.Panel>
            <div className="flex h-12 items-center justify-between px-4 text-[13px]">
                <span className="text-muted-foreground">{monthly.average}</span>
                <span className="dash-figure font-semibold">
                    {format(Math.round(averageAdded(months)), view.account.currency)}
                </span>
            </div>
        </Frame>
    );
}

function NotFound() {
    const { back, detail, title } = useIntlayer("dashboard-goals");
    return (
        <main className="min-w-0 px-4 pb-5 sm:px-6">
            <AccountsBar title={title} />
            <p className="text-muted-foreground py-6 text-sm">
                {detail.notFound}{" "}
                <Link className="text-foreground underline" to="/app/goals">
                    {back}
                </Link>
            </p>
        </main>
    );
}

function SampleDetail() {
    const [first] = useDashboard().ledger.books.savingsGoals;
    return first ? <DetailPage goalId={first.localId} /> : null;
}

function DetailPage({ goalId }: { goalId: string }) {
    const detail = useDetail(goalId);
    const { restoring } = useDashboard();
    if (!detail && restoring) {
        return (
            <Restoring>
                <SampleDetail />
            </Restoring>
        );
    }
    if (!detail) {
        return <NotFound />;
    }
    const { added, chart, view } = detail;
    const side = view.comparable;
    return (
        <main className="@container flex min-h-dvh min-w-0 flex-col px-4 pb-5 sm:px-6">
            <DetailBar view={view} />
            <div
                className={
                    side ? "grid flex-1 grid-cols-1 gap-4 @5xl:grid-cols-[minmax(0,1fr)_296px]" : "flex flex-1 flex-col"
                }
            >
                <div className="flex min-w-0 flex-col gap-4">
                    <Kpis detail={detail} />
                    {chart ? <ChartCard chart={chart} view={view} /> : <NoRateCard />}
                    <Contributions view={view} />
                </div>
                {side ? (
                    <div className="flex min-w-0 flex-col gap-4">
                        <GoalCard view={view} />
                        <MonthlyCard months={added} view={view} />
                    </div>
                ) : null}
            </div>
        </main>
    );
}

export function GoalDetail({ goalId }: { goalId: string }) {
    return (
        <GoalFlowsProvider>
            <DetailPage goalId={goalId} />
        </GoalFlowsProvider>
    );
}
