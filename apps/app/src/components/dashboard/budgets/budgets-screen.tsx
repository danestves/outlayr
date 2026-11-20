import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import Alert02Icon from "@hugeicons/core-free-icons/Alert02Icon";
import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon";
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon";
import Coins01Icon from "@hugeicons/core-free-icons/Coins01Icon";
import MoreVerticalIcon from "@hugeicons/core-free-icons/MoreVerticalIcon";
import PieChartIcon from "@hugeicons/core-free-icons/PieChartIcon";
import Tag01Icon from "@hugeicons/core-free-icons/Tag01Icon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import Wallet01Icon from "@hugeicons/core-free-icons/Wallet01Icon";
import { Link, useNavigate } from "@tanstack/react-router";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { Frame } from "panelui-web/frame";
import { Menu } from "panelui-web/menu";
import { Table } from "panelui-web/table";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { AccountsBar, DataTable, INCOME, MUTED, SPEND } from "@/components/dashboard/accounts/accounts-screen";
import { useAccountFlows } from "@/components/dashboard/accounts/flows";
import { Glyph } from "@/components/dashboard/accounts/glyph";
import { KpiBand, KpiCell, Trend } from "@/components/dashboard/accounts/parts";
import { Empty } from "@/components/dashboard/home/empty";
import { useCategoryName, useDateFormat, useWholeMoney } from "@/components/dashboard/home/format";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { MenuContent } from "@/components/ui/menu-content";
import { viewTransition } from "@/lib/motion";

import { BudgetFlowsProvider } from "./budget-flows";
import { useBudgetFlows } from "./flow-context";
import { budgetsOverview, topSpenders } from "./model";
import type { BudgetLine, BudgetsOverview, OpenLine, Pace } from "./model";
import {
    BADGE,
    BudgetMenu,
    CardHead,
    ChartLegend,
    Diamond,
    Dot,
    MonthStepper,
    PaceChart,
    PaceGauge,
    StatusBadge,
    TINT,
    UsedBar,
    quiet,
    useBudgetMonth,
    useMoney,
    useMonthNames,
} from "./parts";

const PERCENT = 100;
const SPARK_WIDTH = 72;
const SPARK_HEIGHT = 22;

const percent = (ratio: number) => `${Math.round(ratio * PERCENT)}%`;

/** What the KPIs and the pace read: the overall limit when there is one, otherwise the category limits together. */
function headline(model: BudgetsOverview) {
    const { overall, totals } = model;
    return overall
        ? { limit: overall.standing.effectiveLimit, spent: overall.standing.spent }
        : { limit: totals.limits, spent: totals.spent };
}

function NewBudgetMenu() {
    const copy = useIntlayer("dashboard-budgets");
    const { open } = useBudgetFlows();
    const { ledger } = useDashboard();
    const overall = ledger.books.mainBudget.find((row) => row.deletedAt === null);
    return (
        <Menu>
            <Menu.Trigger render={<Button />}>
                <Glyph icon={Add01Icon} size={16} />
                {copy.newBudget}
            </Menu.Trigger>
            <MenuContent align="end" className="w-60" sideOffset={4}>
                <Menu.Item onClick={() => open({ categoryId: null, kind: "new" })}>
                    <Glyph icon={Tag01Icon} size={16} />
                    {copy.menu.category}
                </Menu.Item>
                <Menu.Item
                    onClick={() => open(overall ? { budgetId: overall.localId, kind: "edit" } : { kind: "overall" })}
                >
                    <Glyph icon={PieChartIcon} size={16} />
                    {copy.menu.overall}
                </Menu.Item>
            </MenuContent>
        </Menu>
    );
}

export function PlanButton() {
    const copy = useIntlayer("dashboard-budgets");
    return (
        <Button
            nativeButton={false}
            render={<Link search={(prev) => prev} to="/budgets/plan" viewTransition={viewTransition("push-left")} />}
            variant="outline"
        >
            <Glyph icon={Calendar03Icon} className="text-muted-foreground" size={16} />
            {copy.plan}
        </Button>
    );
}

function Kpis({ model }: { model: BudgetsOverview }) {
    const { ledger } = useDashboard();
    const { kpi } = useIntlayer("dashboard-budgets");
    const money = useMoney();
    const { whole } = useWholeMoney(ledger.currency);
    const date = useDateFormat();
    const { lines, pace, period, phase, totals } = model;
    const { limit, spent } = headline(model);
    const count = lines.length === 1 ? kpi.oneCategory : kpi.categories({ count: lines.length });
    const limits = (
        <KpiCell color={MUTED} icon={PieChartIcon} label={kpi.limits} value={money(limit)}>
            {quiet(count)}
        </KpiCell>
    );
    if (phase === "ahead") {
        return (
            <KpiBand>
                {limits}
                <KpiCell color={TINT} icon={ArrowUpRight01Icon} label={kpi.spent} value={money(0)}>
                    {quiet(kpi.ofLimits)}
                </KpiCell>
                <KpiCell color={INCOME} icon={Wallet01Icon} label={kpi.left} value={money(limit)}>
                    {quiet(kpi.perDay({ amount: whole(limit / period.days) }))}
                </KpiCell>
                <KpiCell color={MUTED} icon={Calendar03Icon} label={kpi.starts} value={date.day(period.from)}>
                    {quiet(kpi.days({ count: period.days }))}
                </KpiCell>
            </KpiBand>
        );
    }
    const over = spent > limit;
    const ratio = limit > 0 ? spent / limit : 0;
    let paceBadge: ReactNode = null;
    if (pace?.even !== null && pace?.even !== undefined) {
        paceBadge =
            pace.spent <= pace.even ? (
                <Badge className={BADGE} dot variant="success">
                    {kpi.underPace}
                </Badge>
            ) : (
                <Badge className={BADGE} dot variant="warning">
                    {kpi.overPace}
                </Badge>
            );
    } else if (limit > 0) {
        paceBadge = (
            <Badge className={BADGE} dot variant="success">
                {kpi.held}
            </Badge>
        );
    }
    let daysNote: ReactNode = kpi.closed;
    if (phase === "current" && pace) {
        daysNote = pace.daysLeft === 1 ? kpi.dayLeft : kpi.daysLeft({ count: pace.daysLeft });
    }
    return (
        <KpiBand>
            {limits}
            <KpiCell color={TINT} icon={ArrowUpRight01Icon} label={kpi.spent} value={money(spent)}>
                <span className="flex min-w-0 items-center gap-2">
                    <Trend goodWhenUp={false} value={ratio > 1 ? 1 : 0}>
                        {percent(ratio)}
                    </Trend>
                    {quiet(kpi.ofLimits)}
                </span>
            </KpiCell>
            {over ? (
                <KpiCell color={SPEND} icon={Alert02Icon} label={kpi.over} value={money(spent - limit)}>
                    <Badge className={BADGE} dot variant="destructive">
                        {totals.over === 1 ? kpi.oneCategory : kpi.categories({ count: totals.over })}
                    </Badge>
                </KpiCell>
            ) : (
                <KpiCell color={INCOME} icon={Coins01Icon} label={kpi.left} value={money(limit - spent)}>
                    {paceBadge}
                </KpiCell>
            )}
            <KpiCell
                color={INCOME}
                icon={Tick02Icon}
                label={kpi.onTrack}
                value={kpi.count({ count: totals.onTrack, total: lines.length }).value}
            >
                {quiet(daysNote)}
            </KpiCell>
        </KpiBand>
    );
}

function PaceCard({ model, pace }: { model: BudgetsOverview; pace: Pace }) {
    const { ledger } = useDashboard();
    const copy = useIntlayer("dashboard-budgets").pace;
    const { whole } = useWholeMoney(ledger.currency);
    const date = useDateFormat();
    const { limit, spent } = pace;
    const over = spent > limit;
    const running = model.phase === "current" && pace.even !== null && !over;
    const marker = running ? (pace.even ?? limit) : limit;
    let footer: ReactNode = copy.held({ amount: whole(limit - spent) });
    if (over && pace.runOut) {
        const facts = { count: pace.runOut.daysEarly, date: date.day(pace.runOut.day) };
        footer = copy.ranOutLast(facts);
        if (pace.runOut.daysEarly > 0) {
            footer = pace.runOut.daysEarly === 1 ? copy.ranOutOne(facts) : copy.ranOut(facts);
        }
    } else if (running) {
        footer =
            pace.daysLeft === 1
                ? copy.forDayLeft({ amount: whole(limit - spent) })
                : copy.forDaysLeft({ amount: whole(limit - spent), count: pace.daysLeft });
    }
    return (
        <Frame className="min-w-0">
            <CardHead
                aside={
                    <Badge className={BADGE} dot variant={over ? "destructive" : "success"}>
                        {over
                            ? copy.over({ amount: whole(spent - limit) })
                            : copy.left({ amount: whole(limit - spent) })}
                    </Badge>
                }
                title={copy.title}
            />
            <Frame.Panel className="flex-1 px-4 pt-4">
                <PaceGauge
                    currency={ledger.currency}
                    label={copy.title.value}
                    limit={limit}
                    marker={marker}
                    spent={spent}
                />
                <div className="dash-figure text-muted-foreground text-app-label mt-2 flex items-baseline justify-between">
                    <span>{whole(0)}</span>
                    <span>{whole(Math.max(spent, limit))}</span>
                </div>
                <div className="text-app-body mt-2.5 flex items-baseline justify-between">
                    <span className="text-muted-foreground text-app-label flex items-center gap-2">
                        <Diamond />
                        {running ? copy.evenToday : copy.limit}
                    </span>
                    <span className="dash-figure">{whole(marker)}</span>
                </div>
            </Frame.Panel>
            <Frame.Footer className="text-muted-foreground text-app-label!">{footer}</Frame.Footer>
        </Frame>
    );
}

function ChartCard({ model, pace }: { model: BudgetsOverview; pace: Pace }) {
    const { ledger } = useDashboard();
    const copy = useIntlayer("dashboard-budgets").pace;
    return (
        <Frame className="min-w-0">
            <CardHead aside={<ChartLegend />} title={copy.chart} />
            <Frame.Panel className="flex-1 px-4 pt-4 pb-3">
                <PaceChart
                    currency={ledger.currency}
                    daily={pace.daily}
                    from={model.period.from}
                    height={222}
                    label={copy.chart.value}
                    limit={pace.limit}
                    total={model.period.days}
                />
            </Frame.Panel>
        </Frame>
    );
}

function Spark({ color, values }: { color: string; values: readonly number[] }) {
    if (values.length < 2) {
        return null;
    }
    const top = Math.max(...values);
    const bottom = Math.min(...values);
    const path = values
        .map((value, index) => {
            const x = (index / (values.length - 1)) * SPARK_WIDTH;
            const y = SPARK_HEIGHT - 2 - ((value - bottom) / (top - bottom || 1)) * (SPARK_HEIGHT - 4);
            return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join("");
    return (
        <svg aria-hidden className="block overflow-visible" height={SPARK_HEIGHT} width={SPARK_WIDTH}>
            <path d={path} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
        </svg>
    );
}

const NAME = "flex min-w-0 items-center gap-2.25 text-app-body font-medium";
const FIGURE = "dash-figure text-app-label!";

function CategoryName({ categoryId, color, name }: { categoryId: string | null; color: string; name: ReactNode }) {
    if (categoryId === null) {
        return (
            <span className={NAME}>
                <Dot color={color} />
                <span className="truncate">{name}</span>
            </span>
        );
    }
    return (
        <Link
            className={`${NAME} hover:underline`}
            params={{ categoryId }}
            search={(prev) => prev}
            to="/budgets/$categoryId"
            viewTransition={viewTransition("push-left")}
        >
            <Dot color={color} />
            <span className="truncate">{name}</span>
        </Link>
    );
}

function LineRow({ line, model }: { line: BudgetLine; model: BudgetsOverview }) {
    const copy = useIntlayer("dashboard-budgets");
    const money = useMoney();
    const categoryName = useCategoryName();
    const { standing } = line;
    const ahead = model.phase === "ahead";
    let name: ReactNode = line.customName ?? copy.allSpending;
    if (line.categoryId !== null) {
        name = line.customName ?? categoryName({ id: line.categoryId, name: line.categoryName });
    }
    return (
        <Table.Row>
            <Table.Cell className="max-w-60">
                <CategoryName categoryId={line.categoryId} color={line.color} name={name} />
            </Table.Cell>
            <Table.Cell className={ahead ? "w-82.5" : "w-57.5"}>
                <UsedBar color={line.color} limit={standing.effectiveLimit} spent={standing.spent} />
            </Table.Cell>
            <Table.Cell className={FIGURE}>{money(standing.spent)}</Table.Cell>
            <Table.Cell className={`${FIGURE} text-muted-foreground`}>{money(standing.effectiveLimit)}</Table.Cell>
            <Table.Cell className={`${FIGURE} ${standing.remaining < 0 ? "text-app-spend" : ""}`}>
                {money(standing.remaining)}
            </Table.Cell>
            {ahead ? null : (
                <Table.Cell>
                    <Spark color={line.color} values={line.history} />
                </Table.Cell>
            )}
            <Table.Cell>
                <StatusBadge amount={money(standing.spent - standing.effectiveLimit)} status={line.status} />
            </Table.Cell>
            <Table.Cell className="w-10 text-end">
                <BudgetMenu line={line} />
            </Table.Cell>
        </Table.Row>
    );
}

function AddLimit({ categoryId }: { categoryId: string }) {
    const copy = useIntlayer("dashboard-budgets");
    const { open } = useBudgetFlows();
    return (
        <Button
            className="text-app-tint h-auto gap-1 p-0"
            onClick={() => open({ categoryId, kind: "new" })}
            size="sm"
            type="button"
            variant="link"
        >
            <Glyph icon={Add01Icon} size={14} />
            <span className="text-app-label">{copy.addLimit}</span>
        </Button>
    );
}

function OpenMenu({ line }: { line: OpenLine }) {
    const copy = useIntlayer("dashboard-budgets");
    const { open } = useBudgetFlows();
    const navigate = useNavigate();
    return (
        <Menu>
            <Menu.Trigger
                aria-label={copy.menu.more({ name: line.name }).value}
                render={<Button className="text-muted-foreground -mx-1 size-6" size="icon-sm" variant="ghost" />}
            >
                <Glyph icon={MoreVerticalIcon} size={17} />
            </Menu.Trigger>
            <MenuContent align="end" alignOffset={-4} className="w-60" sideOffset={4}>
                <Menu.Item
                    onClick={() =>
                        navigate({
                            params: { categoryId: line.categoryId },
                            search: (prev) => prev,
                            to: "/budgets/$categoryId",
                            viewTransition: viewTransition("push-left"),
                        })
                    }
                >
                    <Glyph icon={ArrowUpRight01Icon} size={16} />
                    {copy.menu.open}
                </Menu.Item>
                <Menu.Item onClick={() => open({ categoryId: line.categoryId, kind: "new" })}>
                    <Glyph icon={Add01Icon} size={16} />
                    {copy.addLimit}
                </Menu.Item>
            </MenuContent>
        </Menu>
    );
}

function OpenRow({ line, model }: { line: OpenLine; model: BudgetsOverview }) {
    const copy = useIntlayer("dashboard-budgets");
    const money = useMoney();
    const categoryName = useCategoryName();
    return (
        <Table.Row>
            <Table.Cell className="max-w-60">
                <CategoryName
                    categoryId={line.categoryId}
                    color={line.color}
                    name={categoryName({ id: line.categoryId, name: line.name })}
                />
            </Table.Cell>
            <Table.Cell>
                {model.phase === "closed" ? (
                    <span className="text-muted-foreground text-app-label">{copy.status.noLimit}</span>
                ) : (
                    <AddLimit categoryId={line.categoryId} />
                )}
            </Table.Cell>
            <Table.Cell className={FIGURE}>{money(line.spent)}</Table.Cell>
            <Table.Cell className={`${FIGURE} text-muted-foreground`}>{copy.none}</Table.Cell>
            <Table.Cell className={`${FIGURE} text-muted-foreground`}>
                {copy.shareOf({ percent: percent(line.share) })}
            </Table.Cell>
            <Table.Cell>
                <Spark color={line.color} values={line.history} />
            </Table.Cell>
            <Table.Cell>
                <StatusBadge amount="" status="noLimit" />
            </Table.Cell>
            <Table.Cell className="w-10 text-end">
                <OpenMenu line={line} />
            </Table.Cell>
        </Table.Row>
    );
}

function Footnote({ label, value }: { label: ReactNode; value: string }) {
    return (
        <span className="text-muted-foreground text-app-label me-2 whitespace-nowrap">
            {label}
            <span className="dash-figure text-foreground ms-1.5 font-medium">{value}</span>
        </span>
    );
}

function BudgetTable({ model }: { model: BudgetsOverview }) {
    const copy = useIntlayer("dashboard-budgets");
    const money = useMoney();
    const names = useMonthNames();
    const { columns, footer } = copy;
    const { limit, spent } = headline(model);
    const ahead = model.phase === "ahead";
    const [first] = model.sparkMonths;
    const last = model.sparkMonths.at(-1);
    const range = first && last ? columns.range({ from: names.short(first), to: names.short(last) }) : "";
    const head = [
        columns.category,
        columns.used,
        columns.spent,
        columns.limit,
        columns.left,
        ...(ahead ? [] : [range]),
        columns.status,
        "",
    ];
    const lines = model.overall ? [model.overall, ...model.lines] : model.lines;
    return (
        <Frame className={`mb-5 min-w-0 ${ahead ? "" : "flex-1"}`}>
            <Frame.Panel className="flex-1 p-0">
                <DataTable density="comfortable" head={head} numbers={0} phoneHidden={[2, 4, 5]}>
                    {lines.map((line) => (
                        <LineRow key={line.id} line={line} model={model} />
                    ))}
                    {model.open.map((line) => (
                        <OpenRow key={line.categoryId} line={line} model={model} />
                    ))}
                </DataTable>
            </Frame.Panel>
            <Frame.Footer className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground text-app-label">{footer.withLimit}</span>
                <span className="dash-figure text-app-label font-medium">
                    {footer.of({ limit: money(limit), spent: money(spent) })}
                </span>
                {ahead ? null : (
                    <span className="ms-auto flex flex-wrap items-center">
                        <Footnote
                            label={model.phase === "closed" ? footer.categories : footer.noLimit}
                            value={money(model.totals.open)}
                        />
                        <Footnote label={footer.total} value={money(model.totals.total)} />
                    </span>
                )}
            </Frame.Footer>
        </Frame>
    );
}

function AheadCard({ model }: { model: BudgetsOverview }) {
    const { ahead } = useIntlayer("dashboard-budgets");
    const names = useMonthNames();
    return (
        <Frame className="my-4 min-w-0 flex-1">
            <Frame.Panel className="flex flex-1 flex-col divide-y-0">
                <Empty
                    icon={Calendar03Icon}
                    line={ahead.line}
                    title={ahead.title({ month: names.month(model.period.key) })}
                />
            </Frame.Panel>
        </Frame>
    );
}

function NoBudgets({ model }: { model: BudgetsOverview }) {
    const copy = useIntlayer("dashboard-budgets");
    const { open } = useBudgetFlows();
    const money = useMoney();
    const names = useMonthNames();
    const categoryName = useCategoryName();
    const top = topSpenders(model).map((each) => categoryName(each));
    const month = names.month(model.period.key);
    const [first = "", second = "", third = ""] = top;
    let line: ReactNode = copy.noBudgets.quiet;
    if (top.length >= 3) {
        line = copy.noBudgets.three({ first, month, second, third });
    } else if (top.length === 2) {
        line = copy.noBudgets.two({ first, month, second });
    } else if (top.length === 1) {
        line = copy.noBudgets.one({ first, month });
    }
    return (
        <>
            <Frame className="mb-4 min-w-0">
                <Frame.Panel className="flex flex-col divide-y-0">
                    <Empty
                        action={
                            <Button onClick={() => open({ categoryId: null, kind: "new" })}>
                                <Glyph icon={Add01Icon} size={16} />
                                {copy.newBudget}
                            </Button>
                        }
                        icon={PieChartIcon}
                        line={line}
                        title={copy.noBudgets.title}
                    />
                </Frame.Panel>
            </Frame>
            {model.open.length > 0 ? (
                <Frame className="mb-5 min-w-0 flex-1">
                    <CardHead
                        aside={
                            <span className="dash-figure text-muted-foreground text-app-label">
                                {money(model.totals.total)}
                            </span>
                        }
                        title={copy.noBudgets.card}
                    />
                    <Frame.Panel className="flex-1 p-0">
                        <DataTable
                            density="comfortable"
                            head={[
                                copy.columns.category,
                                copy.columns.shareOfSpending,
                                copy.columns.spent,
                                copy.columns.share,
                                copy.columns.limit,
                            ]}
                            numbers={0}
                            phoneHidden={[2, 4]}
                        >
                            {model.open.map((each) => (
                                <Table.Row key={each.categoryId}>
                                    <Table.Cell className="max-w-60">
                                        <CategoryName
                                            categoryId={each.categoryId}
                                            color={each.color}
                                            name={categoryName({ id: each.categoryId, name: each.name })}
                                        />
                                    </Table.Cell>
                                    <Table.Cell className="w-65">
                                        <UsedBar color={each.color} limit={1} spent={each.share} />
                                    </Table.Cell>
                                    <Table.Cell className={FIGURE}>{money(each.spent)}</Table.Cell>
                                    <Table.Cell className={`${FIGURE} text-muted-foreground`}>
                                        {percent(each.share)}
                                    </Table.Cell>
                                    <Table.Cell className="text-end">
                                        <AddLimit categoryId={each.categoryId} />
                                    </Table.Cell>
                                </Table.Row>
                            ))}
                        </DataTable>
                    </Frame.Panel>
                </Frame>
            ) : null}
        </>
    );
}

function NoData() {
    const copy = useIntlayer("dashboard-budgets").noData;
    const { open } = useAccountFlows();
    return (
        <Frame className="mb-5 min-w-0 flex-1">
            <Frame.Panel className="flex flex-1 flex-col divide-y-0">
                <Empty
                    action={
                        <Button onClick={() => open({ kind: "entry" })}>
                            <Glyph icon={Add01Icon} size={16} />
                            {copy.add}
                        </Button>
                    }
                    icon={Wallet01Icon}
                    line={copy.line}
                    title={copy.title}
                />
            </Frame.Panel>
        </Frame>
    );
}

function BudgetsBody() {
    const { title } = useIntlayer("dashboard-budgets");
    const { ledger } = useDashboard();
    const { period } = useBudgetMonth();
    const model = useMemo(() => budgetsOverview(ledger, period), [ledger, period]);
    const hasBudgets = model.lines.length > 0 || model.overall !== null;
    let body: ReactNode = <NoData />;
    if (hasBudgets) {
        body = (
            <>
                <Kpis model={model} />
                {model.pace ? (
                    <div className="my-4 grid gap-4 lg:grid-cols-[400px_minmax(0,1fr)]">
                        <PaceCard model={model} pace={model.pace} />
                        <ChartCard model={model} pace={model.pace} />
                    </div>
                ) : (
                    <AheadCard model={model} />
                )}
                <BudgetTable model={model} />
            </>
        );
    } else if (model.hasData) {
        body = <NoBudgets model={model} />;
    }
    return (
        <main className="@container flex min-h-full min-w-0 flex-col px-4 pb-5 sm:px-6">
            <AccountsBar title={title}>
                <MonthStepper />
                <PlanButton />
                {hasBudgets ? <NewBudgetMenu /> : null}
            </AccountsBar>
            <div className="flex flex-1 flex-col" data-motion="dissolve" key={period.key}>
                {body}
            </div>
        </main>
    );
}

export function BudgetsScreen() {
    return (
        <BudgetFlowsProvider>
            <BudgetsBody />
        </BudgetFlowsProvider>
    );
}
