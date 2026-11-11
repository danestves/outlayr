import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon";
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import { isShort, monthDriver, monthKey } from "@outlayr/money/year-plan";
import type { MonthProjection, YearProjection } from "@outlayr/money/year-plan";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { Frame } from "panelui-web/frame";
import { Table } from "panelui-web/table";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { AccountsBar, DataTable } from "@/components/dashboard/accounts/accounts-screen";
import { Glyph } from "@/components/dashboard/accounts/glyph";
import { KpiBand, KpiCell, Trend } from "@/components/dashboard/accounts/parts";
import { useBox } from "@/components/dashboard/insights/use-box";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { Restoring } from "@/components/dashboard/shell/sampled";
import { periodKindOf } from "@/lib/dashboard-series-period";

import { BudgetFlowsProvider } from "./budget-flows";
import { useBudgetFlows } from "./flow-context";
import { BAD, BADGE, Ghost, Stepper, TINT, quiet, useMoney } from "./parts";
import { periodKeyOfMonth, useYearPlan } from "./plan-model";
import type { YearPlan } from "./plan-model";
import { usePlanMonths, usePlanName, useShortRunSentence } from "./plan-parts";

const PERCENT = 100;
const CHART_HEIGHT = 140;
const ZERO_LINE = 112;
const BAR_REACH = 90;
// The room between the zero line and the month labels.
const DEFICIT_REACH = 18;
const LABEL_ROOM = 11;
const COLUMN_GAP = 14;
const MIN_BAR = 4;
const USED_INK = "#57554a";
const STRONG = "var(--color-app-strong)";
const MUTED = "var(--color-muted-foreground)";

/** The year the plan reads: from `period` when it names one, the running year otherwise. */
export function usePlanYear() {
    const { ledger, setFilters } = useDashboard();
    const raw = useSearch({ from: "/_account/app", select: (search) => search.period });
    const current = Number(ledger.today.slice(0, 4));
    const earliest = ledger.rows.reduce((first, row) => (row.day < first ? row.day : first), ledger.today);
    const first = Math.min(current, Number(earliest.slice(0, 4)));
    const last = current + 1;
    const kind = raw === undefined ? null : periodKindOf(raw);
    const asked = raw !== undefined && kind !== null ? Number(raw.slice(0, 4)) : current;
    const year = Math.min(last, Math.max(first, asked));
    const go = (next: number) => setFilters({ period: next === current ? null : String(next) });
    return { canNext: year < last, canPrev: year > first, current, go, year };
}

export function PlanCrumbs({ back, children, parent }: { back: ReactNode; children: ReactNode; parent: ReactNode }) {
    return (
        <span className="flex min-w-0 items-center gap-2">
            {back}
            {parent}
            <Glyph icon={ArrowRight01Icon} className="text-muted-foreground flex-none" size={14} />
            {children}
        </span>
    );
}

export const BACK = "text-muted-foreground size-[30px]";
export const PARENT = "text-muted-foreground hover:text-foreground text-[13px] font-normal";

function YearBar({ year }: { year: ReturnType<typeof usePlanYear> }) {
    const plan = useIntlayer("dashboard-budgets-plan");
    const { title } = useIntlayer("dashboard-budgets");
    return (
        <AccountsBar
            title={
                <PlanCrumbs
                    back={
                        <Button
                            aria-label={title.value}
                            className={BACK}
                            nativeButton={false}
                            render={<Link search={(prev) => ({ ...prev, period: undefined })} to="/app/budgets" />}
                            size="icon"
                            variant="outline"
                        >
                            <Glyph icon={ArrowLeft01Icon} size={16} />
                        </Button>
                    }
                    parent={
                        <Link className={PARENT} search={(prev) => ({ ...prev, period: undefined })} to="/app/budgets">
                            {title}
                        </Link>
                    }
                >
                    <span className="truncate">{plan.title}</span>
                </PlanCrumbs>
            }
        >
            <Stepper
                canNext={year.canNext}
                canPrev={year.canPrev}
                label={String(year.year)}
                next={plan.nextYear.value}
                onStep={(steps) => year.go(year.year + steps)}
                previous={plan.previousYear.value}
            />
        </AccountsBar>
    );
}

const percent = (ratio: number) => `${Math.round(ratio * PERCENT)}%`;

function YearKpis({ plan }: { plan: YearPlan }) {
    const { kpi } = useIntlayer("dashboard-budgets-plan");
    const money = useMoney();
    const { goals, projection } = plan;
    const { totals } = projection;
    const ahead = projection.months.filter((month) => month.status === "ahead").length;
    let aheadNote: ReactNode = kpi.monthsAhead({ count: ahead });
    if (ahead === 0) {
        aheadNote = kpi.noMonthsAhead;
    } else if (ahead === 1) {
        aheadNote = kpi.monthAhead;
    }
    let goalNote: ReactNode = kpi.goals({ count: goals.size });
    if (goals.size === 0) {
        goalNote = kpi.noGoals;
    } else if (goals.size === 1) {
        goalNote = kpi.oneGoal;
    }
    const ratio = totals.in > 0 ? totals.out / totals.in : 0;
    return (
        <KpiBand>
            <KpiCell
                color={MUTED}
                label={kpi.unassigned}
                tone={projection.unassigned < 0 ? "text-app-spend" : ""}
                value={money(projection.unassigned)}
            >
                {quiet(aheadNote)}
            </KpiCell>
            <KpiCell color={MUTED} label={kpi.in} value={money(totals.in)}>
                {quiet(kpi.perMonth({ amount: money(totals.in / projection.months.length) }))}
            </KpiCell>
            <KpiCell color={MUTED} label={kpi.setAside} value={money(totals.setAside)}>
                {quiet(goalNote)}
            </KpiCell>
            <KpiCell color={MUTED} label={kpi.out} value={money(totals.out)}>
                <span className="flex min-w-0 items-center gap-2">
                    {totals.in > 0 ? (
                        <Trend goodWhenUp={false} value={ratio > 1 ? 1 : 0}>
                            {percent(ratio)}
                        </Trend>
                    ) : null}
                    {quiet(kpi.ofIncome)}
                </span>
            </KpiCell>
        </KpiBand>
    );
}

function EmptyKpis({ plan }: { plan: YearPlan }) {
    const { kpi } = useIntlayer("dashboard-budgets-plan");
    const money = useMoney();
    const perMonth = [...plan.goals.values()].reduce((sum, goal) => sum + goal.perMonth, 0);
    return (
        <KpiBand>
            <KpiCell color={MUTED} label={kpi.in} tone="text-muted-foreground" value={money(0)}>
                {quiet(kpi.nothingExpected)}
            </KpiCell>
            <KpiCell color={MUTED} label={kpi.out} tone="text-muted-foreground" value={money(0)}>
                {quiet(kpi.nothingPlanned)}
            </KpiCell>
            <KpiCell color={MUTED} label={kpi.setAside} value={money(perMonth)}>
                {quiet(kpi.fromGoals)}
            </KpiCell>
            <KpiCell
                color={MUTED}
                label={kpi.monthsPlanned}
                tone="text-muted-foreground"
                value={kpi.count({ count: 0, total: plan.projection.months.length }).value}
            >
                {quiet(String(plan.projection.year))}
            </KpiCell>
        </KpiBand>
    );
}

function LeftChart({ projection }: { projection: YearProjection }) {
    const [ref, { width }] = useBox<HTMLElement>();
    const money = useMoney();
    const months = usePlanMonths();
    const { chart } = useIntlayer("dashboard-budgets-plan");
    const top = Math.max(1, ...projection.months.map((month) => Math.abs(month.left)));
    const scale = BAR_REACH / top;
    const deepest = Math.max(1, ...projection.months.map((month) => -month.left));
    const deficitScale = Math.min(scale, DEFICIT_REACH / deepest);
    const column = width / projection.months.length;
    const barWidth = Math.max(0, column - COLUMN_GAP);
    return (
        <figure aria-label={chart.title.value} ref={ref}>
            {width > 0 ? (
                <svg aria-hidden className="block overflow-visible" height={CHART_HEIGHT + LABEL_ROOM} width={width}>
                    <line stroke={STRONG} x1={0} x2={width} y1={ZERO_LINE} y2={ZERO_LINE} />
                    {projection.months.map((month, index) => {
                        const { left } = month;
                        const short = left < 0;
                        const x = index * column + COLUMN_GAP / 2;
                        const height = Math.max(Math.abs(left) * (short ? deficitScale : scale), MIN_BAR);
                        const y = short ? ZERO_LINE : ZERO_LINE - height;
                        const current = month.status === "current";
                        const center = x + barWidth / 2;
                        return (
                            <g key={month.key}>
                                {month.status === "ahead" ? (
                                    <rect
                                        fill="none"
                                        height={height - 1}
                                        rx={4}
                                        stroke={short ? BAD : MUTED}
                                        strokeDasharray="3 3"
                                        width={Math.max(0, barWidth - 1)}
                                        x={x + 0.5}
                                        y={y + 0.5}
                                    />
                                ) : (
                                    <rect
                                        fill={current ? TINT : STRONG}
                                        height={height}
                                        rx={4}
                                        width={barWidth}
                                        x={x}
                                        y={y}
                                    />
                                )}
                                <text
                                    className="dash-figure"
                                    fill={short ? BAD : MUTED}
                                    style={{ fontSize: 11, textAnchor: "middle" }}
                                    x={center}
                                    y={short ? ZERO_LINE - 5 : y - 5}
                                >
                                    {money(left)}
                                </text>
                                <text
                                    className="dash-figure"
                                    fill={current ? "var(--color-foreground)" : MUTED}
                                    style={{ fontSize: 11, textAnchor: "middle" }}
                                    x={center}
                                    y={CHART_HEIGHT + 2}
                                >
                                    {months.short(month.key)}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            ) : (
                <div style={{ height: CHART_HEIGHT + LABEL_ROOM }} />
            )}
        </figure>
    );
}

function LeftCard({ plan }: { plan: YearPlan }) {
    const { chart } = useIntlayer("dashboard-budgets-plan");
    const sentence = useShortRunSentence();
    const { projection } = plan;
    const open = projection.months.filter((month) => month.status !== "closed");
    const short = open.filter(isShort).length;
    const line = sentence(projection, plan.categories) ?? (open.length > 0 ? chart.covered.value : null);
    return (
        <Frame className="my-4 min-w-0">
            <Frame.Header className="flex flex-wrap items-center gap-2">
                <Frame.Title as="h2" className="whitespace-nowrap">
                    {chart.title}
                </Frame.Title>
                {short > 0 ? (
                    <Badge className={`${BADGE} ms-1.5`} dot variant="destructive">
                        {chart.short({ count: short, total: open.length })}
                    </Badge>
                ) : null}
                {line ? <span className="text-muted-foreground ms-auto text-[13px] leading-5">{line}</span> : null}
            </Frame.Header>
            <Frame.Panel className="px-4 pt-5">
                <LeftChart projection={projection} />
            </Frame.Panel>
        </Frame>
    );
}

function biggest(plan: YearPlan, month: MonthProjection) {
    const driver = monthDriver(plan.projection, month);
    const out = month.categories.filter((entry) => !entry.income);
    const entry =
        out.find((each) => each.categoryId === driver) ??
        out.reduce<(typeof out)[number] | undefined>(
            (best, each) => (best === undefined || each.projected > best.projected ? each : best),
            undefined
        );
    return entry && entry.projected > 0 ? entry : null;
}

function YearStatus({ month }: { month: MonthProjection }) {
    const { status } = useIntlayer("dashboard-budgets-plan");
    const money = useMoney();
    if (month.status === "current") {
        return (
            <Badge className={BADGE} dot variant="success">
                {status.current}
            </Badge>
        );
    }
    if (isShort(month)) {
        return (
            <Badge className={BADGE} dot variant="destructive">
                {status.short({ amount: money(-month.left) })}
            </Badge>
        );
    }
    return (
        <Badge className={`${BADGE} [&>[data-slot=badge-dot]]:text-muted-foreground`} dot variant="outline">
            {month.status === "closed" ? status.closed : status.ahead}
        </Badge>
    );
}

function MonthRow({ month, plan }: { month: MonthProjection; plan: YearPlan }) {
    const money = useMoney();
    const months = usePlanMonths();
    const planName = usePlanName();
    const navigate = useNavigate();
    const short = isShort(month);
    let used = month.out > 0 ? 1 : 0;
    if (month.in > 0) {
        used = Math.min(1, (month.out + month.setAside) / month.in);
    }
    let ink = USED_INK;
    if (short) {
        ink = BAD;
    } else if (month.status === "current") {
        ink = TINT;
    }
    const big = month.status === "ahead" ? biggest(plan, month) : null;
    const params = { month: periodKeyOfMonth(month.key) };
    return (
        <Table.Row
            className="cursor-pointer"
            onClick={() => navigate({ params, search: (prev) => prev, to: "/app/budgets/plan/$month" })}
        >
            <Table.Cell className="font-medium">
                <Link
                    className="hover:underline"
                    onClick={(event) => event.stopPropagation()}
                    params={params}
                    search={(prev) => prev}
                    to="/app/budgets/plan/$month"
                >
                    {months.month(month.key)}
                </Link>
            </Table.Cell>
            <Table.Cell className="w-[220px]">
                <div aria-hidden className="bg-foreground/5 flex h-2 overflow-hidden rounded-full">
                    <i className="block h-full rounded-full" style={{ background: ink, width: `${used * PERCENT}%` }} />
                </div>
            </Table.Cell>
            <Table.Cell className="dash-figure text-muted-foreground text-[13px]">{money(month.in)}</Table.Cell>
            <Table.Cell className="dash-figure text-[13px]">{money(month.out)}</Table.Cell>
            <Table.Cell className="dash-figure text-muted-foreground text-[13px]">{money(month.setAside)}</Table.Cell>
            <Table.Cell className={`dash-figure text-[13px] ${short ? "text-app-spend" : ""}`}>
                {money(month.left)}
            </Table.Cell>
            <Table.Cell className="text-muted-foreground text-[13px]">
                {big ? `${planName(plan.categories.get(big.categoryId))} ${money(big.projected)}` : ""}
            </Table.Cell>
            <Table.Cell>
                <YearStatus month={month} />
            </Table.Cell>
        </Table.Row>
    );
}

function MonthsTable({ plan }: { plan: YearPlan }) {
    const { columns } = useIntlayer("dashboard-budgets-plan");
    return (
        <Frame className="mb-5 min-w-0 flex-1">
            <Frame.Panel className="flex-1 p-0">
                <DataTable
                    head={[
                        columns.month,
                        columns.used,
                        columns.in,
                        columns.out,
                        columns.setAside,
                        columns.left,
                        columns.biggest,
                        columns.status,
                    ]}
                    numbers={0}
                    phoneHidden={[2, 3, 5, 7]}
                >
                    {plan.projection.months.map((month) => (
                        <MonthRow key={month.key} month={month} plan={plan} />
                    ))}
                </DataTable>
            </Frame.Panel>
        </Frame>
    );
}

function EmptyYear({ plan }: { plan: YearPlan }) {
    const { empty } = useIntlayer("dashboard-budgets-plan");
    const months = usePlanMonths();
    const { open } = useBudgetFlows();
    const first = monthKey(plan.projection.year, 0);
    return (
        <Frame className="mt-4 mb-5 min-w-0 flex-1">
            <Frame.Panel className="relative isolate flex min-h-[744px] flex-1 flex-col items-center gap-1.5 divide-y-0 overflow-hidden px-6 pt-[392px] text-center">
                <Ghost height={744} name="year" />
                <b className="text-[15px] leading-[22px] font-semibold">
                    {empty.yearTitle({ year: plan.projection.year })}
                </b>
                <p className="text-muted-foreground mb-2.5 max-w-[320px] text-[13px] leading-5">{empty.yearLine}</p>
                <Button onClick={() => open({ categoryId: null, income: false, kind: "plan", month: first })}>
                    <Glyph icon={Add01Icon} size={16} />
                    {empty.planFirst({ month: months.month(first) })}
                </Button>
            </Frame.Panel>
        </Frame>
    );
}

function PlanYearBody() {
    const { restoring } = useDashboard();
    const year = usePlanYear();
    const plan = useYearPlan(year.year);
    const empty = plan.projection.months.every((month) => month.categories.length === 0);
    if (empty && restoring) {
        return (
            <Restoring>
                <PlanYearBody />
            </Restoring>
        );
    }
    return (
        <main className="@container flex min-h-full min-w-0 flex-col px-4 pb-5 sm:px-6">
            <YearBar year={year} />
            {empty ? (
                <>
                    <EmptyKpis plan={plan} />
                    <EmptyYear plan={plan} />
                </>
            ) : (
                <>
                    <YearKpis plan={plan} />
                    <LeftCard plan={plan} />
                    <MonthsTable plan={plan} />
                </>
            )}
        </main>
    );
}

export function PlanYearScreen() {
    return (
        <BudgetFlowsProvider>
            <PlanYearBody />
        </BudgetFlowsProvider>
    );
}
