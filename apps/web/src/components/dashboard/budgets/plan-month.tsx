import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon";
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon";
import Flag02Icon from "@hugeicons/core-free-icons/Flag02Icon";
import MoreVerticalIcon from "@hugeicons/core-free-icons/MoreVerticalIcon";
import Scissor01Icon from "@hugeicons/core-free-icons/Scissor01Icon";
import SquareLock02Icon from "@hugeicons/core-free-icons/SquareLock02Icon";
import { monthKeyParts } from "@outlayr/money/year-plan";
import type { CategoryMonth, MonthProjection } from "@outlayr/money/year-plan";
import { Link, useNavigate } from "@tanstack/react-router";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { Frame } from "panelui-web/frame";
import { Menu } from "panelui-web/menu";
import { Table } from "panelui-web/table";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { AccountsBar, DataTable } from "@/components/dashboard/accounts/accounts-screen";
import { Glyph } from "@/components/dashboard/accounts/glyph";
import { KpiBand, KpiCell, Trend } from "@/components/dashboard/accounts/parts";
import { useDateFormat, useWholeMoney } from "@/components/dashboard/home/format";
import { useBox } from "@/components/dashboard/insights/use-box";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { Restoring } from "@/components/dashboard/shell/sampled";
import { UNCATEGORIZED_ID } from "@/lib/dashboard-series-ledger";
import { periodKeyOf, periodOf, shiftPeriodKey } from "@/lib/dashboard-series-period";
import type { Period } from "@/lib/dashboard-series-period";
import { daysBetween } from "@/lib/ledger";

import { BudgetFlowsProvider } from "./budget-flows";
import { useBudgetFlows } from "./flow-context";
import { MONTHS_AHEAD } from "./model";
import { BADGE, Ghost, OK, Stepper, TINT, quiet, useMoney, useMonthNames } from "./parts";
import { monthKeyOf, UNCATEGORIZED_IN, useYearPlan } from "./plan-model";
import type { PlanCategoryMeta, YearPlan } from "./plan-model";
import { PlanUsed, usePlanName } from "./plan-parts";
import { BACK, PARENT, PlanCrumbs } from "./plan-year";

const PERCENT = 100;
const HALF = 0.5;
const MUTED = "var(--color-muted-foreground)";
const STRONG = "var(--color-app-strong)";
const FIGURE = "dash-figure text-[13px]";
const NAME = "flex min-w-0 items-center gap-[9px] text-sm font-medium";
const CHART_HEIGHT = 250;
const CHART_LEFT = 44;
const TICKS = [1, 8, 15, 22] as const;

const percent = (ratio: number) => `${Math.round(ratio * PERCENT)}%`;

interface MonthView {
    month: MonthProjection;
    period: Period;
    plan: YearPlan;
    year: number;
}

function useMonthStep(periodKey: string) {
    const { ledger } = useDashboard();
    const current = periodKeyOf(ledger.today, ledger.firstDayOfMonth);
    const earliest = ledger.rows.reduce((first, row) => (row.day < first ? row.day : first), ledger.today);
    const first = periodKeyOf(earliest, ledger.firstDayOfMonth);
    const last = shiftPeriodKey(current, MONTHS_AHEAD);
    return { canNext: periodKey < last, canPrev: periodKey > first };
}

function MonthBar({ view }: { view: MonthView }) {
    const copy = useIntlayer("dashboard-budgets-plan");
    const { next, previous } = useIntlayer("dashboard-budgets");
    const names = useMonthNames();
    const navigate = useNavigate();
    const { canNext, canPrev } = useMonthStep(view.period.key);
    const { ledger } = useDashboard();
    const yearSearch = view.year === Number(ledger.today.slice(0, 4)) ? undefined : String(view.year);
    return (
        <AccountsBar
            title={
                <PlanCrumbs
                    back={
                        <Button
                            aria-label={copy.back.value}
                            className={BACK}
                            nativeButton={false}
                            render={
                                <Link search={(prev) => ({ ...prev, period: yearSearch })} to="/app/budgets/plan" />
                            }
                            size="icon"
                            variant="ghost"
                        >
                            <Glyph icon={ArrowLeft01Icon} size={16} />
                        </Button>
                    }
                    parent={
                        <Link
                            className={PARENT}
                            search={(prev) => ({ ...prev, period: yearSearch })}
                            to="/app/budgets/plan"
                        >
                            {copy.title}
                        </Link>
                    }
                >
                    <span className="truncate">{names.month(view.period.key)}</span>
                    {view.month.status === "closed" ? (
                        <Badge className={`${BADGE} ms-1`} variant="secondary">
                            {copy.status.closed}
                        </Badge>
                    ) : null}
                </PlanCrumbs>
            }
        >
            <Stepper
                canNext={canNext}
                canPrev={canPrev}
                label={names.long(view.period.key)}
                next={next.value}
                onStep={(steps) =>
                    navigate({
                        params: { month: shiftPeriodKey(view.period.key, steps) },
                        search: (prev) => prev,
                        to: "/app/budgets/plan/$month",
                    })
                }
                previous={previous.value}
            />
        </AccountsBar>
    );
}

function MonthKpis({ view }: { view: MonthView }) {
    const { kpi } = useIntlayer("dashboard-budgets-plan");
    const money = useMoney();
    const { month } = view;
    const short = month.left < -HALF;
    const empty = month.categories.length === 0;
    let leftLabel: ReactNode = short ? kpi.shortBy : kpi.leftByPlan;
    if (month.status === "closed") {
        leftLabel = kpi.leftOver;
    } else if (month.status === "current") {
        leftLabel = short ? kpi.shortBy : kpi.leftThisMonth;
    }
    const used = month.in > 0 ? (month.out + month.setAside) / month.in : 0;
    let inNote: ReactNode = month.in > 0 ? kpi.expected : kpi.notYet;
    if (month.status === "closed") {
        inNote = kpi.allArrived;
    } else if (month.status === "current") {
        const toCome = month.inPlanned - month.inActual;
        inNote = toCome > HALF ? kpi.toCome({ amount: money(toCome) }) : kpi.allArrived;
    }
    const drift = month.outActual - month.outPlanned;
    let spentNote: ReactNode = quiet(kpi.notStarted);
    if (month.status !== "ahead" && Math.abs(drift) > HALF) {
        spentNote = (
            <span className="flex min-w-0 items-center gap-2">
                <Trend goodWhenUp={false} value={drift > 0 ? 1 : -1}>
                    {`${drift > 0 ? "+" : "-"}${money(Math.abs(drift))}`}
                </Trend>
                {quiet(drift > 0 ? kpi.overPlan : kpi.underPlan)}
            </span>
        );
    } else if (month.status !== "ahead") {
        spentNote = null;
    }
    return (
        <KpiBand>
            <KpiCell
                color={MUTED}
                label={leftLabel}
                tone={short ? "text-app-spend" : ""}
                value={money(short && month.status !== "closed" ? -month.left : month.left)}
            >
                {empty || month.in <= 0 ? (
                    quiet(kpi.nothingPlanned)
                ) : (
                    <span className="flex min-w-0 items-center gap-2">
                        <Trend goodWhenUp={false} value={used > 1 ? 1 : 0}>
                            {percent(used)}
                        </Trend>
                        {quiet(kpi.ofIncome)}
                    </span>
                )}
            </KpiCell>
            <KpiCell color={MUTED} label={kpi.in} value={money(month.in)}>
                {quiet(inNote)}
            </KpiCell>
            <KpiCell color={MUTED} label={kpi.planned} value={money(month.outPlanned + month.setAside)}>
                {quiet(kpi.setAsideAmount({ amount: money(month.setAside) }))}
            </KpiCell>
            <KpiCell color={MUTED} label={kpi.spent} value={money(month.status === "ahead" ? 0 : month.outActual)}>
                {spentNote}
            </KpiCell>
        </KpiBand>
    );
}

function CardHead({ aside, title }: { aside?: ReactNode; title: ReactNode }) {
    return (
        <Frame.Header>
            <Frame.Title as="h2" className="whitespace-nowrap">
                {title}
            </Frame.Title>
            {aside ? (
                <Frame.Action className="dash-figure text-muted-foreground row-span-1 self-center justify-self-end text-[13px]">
                    {aside}
                </Frame.Action>
            ) : null}
        </Frame.Header>
    );
}

function AddRow({ children, onClick }: { children: ReactNode; onClick: () => void }) {
    return (
        <button
            className="text-app-tint hover:bg-foreground/[0.02] flex h-11 w-full items-center gap-1.5 border-t px-5 text-[13px] font-medium"
            onClick={onClick}
            type="button"
        >
            <Glyph icon={Add01Icon} size={16} />
            {children}
        </button>
    );
}

function RowMenu({ entry, meta, view }: { entry: CategoryMonth; meta: PlanCategoryMeta; view: MonthView }) {
    const { menu } = useIntlayer("dashboard-budgets-plan");
    const { open } = useBudgetFlows();
    const planName = usePlanName();
    const canTrim = !entry.income && view.month.status !== "closed" && entry.planned > 0;
    return (
        <Menu>
            <Menu.Trigger
                render={
                    <Button
                        aria-label={menu.more({ name: planName(meta) }).value}
                        className="text-muted-foreground size-7"
                        size="icon"
                        variant="ghost"
                    />
                }
            >
                <Glyph icon={MoreVerticalIcon} size={17} />
            </Menu.Trigger>
            <Menu.Content align="end" className="app-shell ph-no-capture w-[240px]" sideOffset={4}>
                <Menu.Item
                    onClick={() =>
                        open({ categoryId: meta.id, income: meta.income, kind: "plan", month: view.month.key })
                    }
                >
                    <Glyph icon={Calendar03Icon} size={16} />
                    {menu.plan({ year: view.year })}
                </Menu.Item>
                {canTrim ? (
                    <Menu.Item onClick={() => open({ categoryId: meta.id, kind: "trim", month: view.month.key })}>
                        <Glyph icon={Scissor01Icon} size={16} />
                        {menu.trim}
                    </Menu.Item>
                ) : null}
            </Menu.Content>
        </Menu>
    );
}

function EntryName({ meta, view }: { meta: PlanCategoryMeta | undefined; view: MonthView }) {
    const planName = usePlanName();
    const { open } = useBudgetFlows();
    const color = meta?.income ? OK : (meta?.color ?? MUTED);
    if (!meta?.plannable || view.month.status === "closed") {
        return (
            <span className={NAME}>
                <i className="block size-2 flex-none rounded-full" style={{ background: color }} />
                <span className="truncate">{planName(meta)}</span>
            </span>
        );
    }
    return (
        <button
            className={`${NAME} hover:underline`}
            onClick={() => open({ categoryId: meta.id, income: meta.income, kind: "plan", month: view.month.key })}
            type="button"
        >
            <i className="block size-2 flex-none rounded-full" style={{ background: color }} />
            <span className="truncate">{planName(meta)}</span>
        </button>
    );
}

function NowCell({ entry }: { entry: CategoryMonth }) {
    const { row } = useIntlayer("dashboard-budgets-plan");
    const money = useMoney();
    if (entry.actual > entry.planned + HALF) {
        return (
            <Table.Cell className={`${FIGURE} text-app-spend`}>
                {row.over({ amount: money(entry.actual - entry.planned) })}
            </Table.Cell>
        );
    }
    if (entry.planned > 0 && entry.actual >= entry.planned - HALF) {
        return <Table.Cell className={FIGURE}>{row.paid({ amount: money(entry.actual) })}</Table.Cell>;
    }
    return <Table.Cell className={FIGURE}>{row.left({ amount: money(entry.planned - entry.actual) })}</Table.Cell>;
}

function noteOf(entry: CategoryMonth, daysLeft: number) {
    const left = entry.planned - entry.actual;
    return left > HALF && entry.actual < entry.planned - HALF ? left / Math.max(1, daysLeft) : null;
}

function ResultCell({ entry }: { entry: CategoryMonth }) {
    const { row } = useIntlayer("dashboard-budgets-plan");
    const money = useMoney();
    const gap = entry.actual - entry.planned;
    if (gap > HALF) {
        return <Table.Cell className={`${FIGURE} text-app-spend`}>{row.over({ amount: money(gap) })}</Table.Cell>;
    }
    return (
        <Table.Cell className={`${FIGURE} text-muted-foreground`}>
            {gap < -HALF ? row.under({ amount: money(-gap) }) : row.onPlan}
        </Table.Cell>
    );
}

function OutCard({ view }: { view: MonthView }) {
    const { columns, month: copy, row } = useIntlayer("dashboard-budgets-plan");
    const money = useMoney();
    const { ledger } = useDashboard();
    const { open } = useBudgetFlows();
    const { month, plan } = view;
    const out = month.categories.filter((entry) => !entry.income);
    const { status } = month;
    const daysLeft = daysBetween(ledger.today, view.period.to) + 1;
    let head: ReactNode[] = [columns.category, columns.planned, columns.typical, ""];
    if (status === "current") {
        head = [columns.category, columns.used, columns.planned, columns.now, columns.note, ""];
    } else if (status === "closed") {
        head = [columns.category, columns.used, columns.planned, columns.spent, columns.result];
    }
    const aside =
        status === "ahead"
            ? money(month.outPlanned)
            : copy.of({ planned: money(month.outPlanned), spent: money(month.outActual) });
    return (
        <Frame className="min-w-0">
            <CardHead aside={aside} title={copy.out} />
            <Frame.Panel className="p-0">
                <DataTable head={head} numbers={0} phoneHidden={status === "ahead" ? [3] : [2, 5]}>
                    {out.map((entry) => {
                        const meta = plan.categories.get(entry.categoryId);
                        const color = meta?.color ?? MUTED;
                        const perDay = noteOf(entry, daysLeft);
                        const typical = plan.projection.typical.get(entry.categoryId);
                        return (
                            <Table.Row key={entry.categoryId}>
                                <Table.Cell className="max-w-[220px]">
                                    <EntryName meta={meta} view={view} />
                                </Table.Cell>
                                {status === "ahead" ? null : (
                                    <Table.Cell className={status === "closed" ? "w-[190px]" : "w-[170px]"}>
                                        <PlanUsed color={color} planned={entry.planned} spent={entry.actual} />
                                    </Table.Cell>
                                )}
                                <Table.Cell
                                    className={`${FIGURE} ${status === "ahead" ? "" : "text-muted-foreground"}`}
                                >
                                    {money(entry.planned)}
                                </Table.Cell>
                                {status === "ahead" ? (
                                    <Table.Cell className={`${FIGURE} text-muted-foreground`}>
                                        {typical === undefined ? "" : money(typical)}
                                    </Table.Cell>
                                ) : null}
                                {status === "current" ? (
                                    <>
                                        <NowCell entry={entry} />
                                        <Table.Cell className={`${FIGURE} text-muted-foreground`}>
                                            {perDay === null ? "" : row.perDay({ amount: money(perDay) })}
                                        </Table.Cell>
                                    </>
                                ) : null}
                                {status === "closed" ? (
                                    <>
                                        <Table.Cell className={FIGURE}>{money(entry.actual)}</Table.Cell>
                                        <ResultCell entry={entry} />
                                    </>
                                ) : null}
                                {status === "closed" ? null : (
                                    <Table.Cell className="w-10 text-end">
                                        {meta?.plannable ? <RowMenu entry={entry} meta={meta} view={view} /> : null}
                                    </Table.Cell>
                                )}
                            </Table.Row>
                        );
                    })}
                </DataTable>
                {status === "current" ? (
                    <AddRow onClick={() => open({ categoryId: null, income: false, kind: "plan", month: month.key })}>
                        {copy.addCategory}
                    </AddRow>
                ) : null}
                {status === "closed" ? (
                    <p className="text-muted-foreground flex h-11 items-center gap-1.5 border-t px-5 text-[13px] font-medium">
                        <Glyph icon={SquareLock02Icon} size={16} />
                        {copy.lockedNote}
                    </p>
                ) : null}
                {status === "ahead" ? null : <SpentChart view={view} />}
            </Frame.Panel>
        </Frame>
    );
}

function chartTop(value: number) {
    const magnitude = 10 ** Math.floor(Math.log10(Math.max(1, value)));
    const step = magnitude / 2;
    return Math.max(step, Math.ceil((value * 1.02) / step) * step);
}

function SpentChart({ view }: { view: MonthView }) {
    const { month: copy } = useIntlayer("dashboard-budgets-plan");
    const { ledger } = useDashboard();
    const { whole } = useWholeMoney(ledger.currency);
    const money = useMoney();
    const date = useDateFormat();
    const [ref, { width }] = useBox<HTMLElement>();
    const { month, period } = view;
    const through = period.to < ledger.today ? period.to : ledger.today;
    const byDay = new Map<string, number>();
    for (const row of ledger.rows) {
        if (!row.income && row.day >= period.from && row.day <= through) {
            byDay.set(row.day, (byDay.get(row.day) ?? 0) + row.amount);
        }
    }
    const count = daysBetween(period.from, through) + 1;
    const cumulative: number[] = [];
    let running = 0;
    for (let index = 0; index < count; index += 1) {
        const day = new Date(Date.parse(`${period.from}T12:00:00Z`) + index * 86_400_000).toISOString().slice(0, 10);
        running += byDay.get(day) ?? 0;
        cumulative.push(running);
    }
    const top = chartTop(Math.max(month.in, running));
    const x = (index: number) => CHART_LEFT + (index / Math.max(1, period.days - 1)) * (width - CHART_LEFT);
    const y = (value: number) => CHART_HEIGHT - 22 - (value / top) * (CHART_HEIGHT - 30);
    const path = cumulative.map((value, index) => `${index ? "L" : "M"}${x(index).toFixed(1)} ${y(value).toFixed(1)}`);
    const ticks = [...TICKS.filter((tick) => tick < period.days), period.days];
    return (
        <>
            <div className="flex h-[52px] items-center gap-2 border-t px-5">
                <b className="text-muted-foreground text-sm font-medium">{copy.spentAgainst}</b>
                <span className="dash-figure text-muted-foreground ms-auto text-[13px]">{money(month.in)}</span>
            </div>
            <figure aria-label={copy.spentAgainst.value} className="px-5 pb-3" ref={ref}>
                {width > 0 ? (
                    <svg aria-hidden className="block overflow-visible" height={CHART_HEIGHT} width={width}>
                        {[0, month.in].map((value) => (
                            <g key={value}>
                                <line stroke={STRONG} x1={CHART_LEFT} x2={width} y1={y(value)} y2={y(value)} />
                                <text
                                    className="dash-figure"
                                    fill={MUTED}
                                    style={{ fontSize: 11, textAnchor: "end" }}
                                    x={36}
                                    y={y(value) + 4}
                                >
                                    {whole(value)}
                                </text>
                            </g>
                        ))}
                        {path.length > 1 ? (
                            <path d={path.join("")} fill="none" stroke={TINT} strokeLinejoin="round" strokeWidth={2} />
                        ) : null}
                        {ticks.map((tick) => {
                            let anchor: "end" | "middle" | "start" = "middle";
                            if (tick === 1) {
                                anchor = "start";
                            } else if (tick === period.days) {
                                anchor = "end";
                            }
                            const day = new Date(Date.parse(`${period.from}T12:00:00Z`) + (tick - 1) * 86_400_000)
                                .toISOString()
                                .slice(0, 10);
                            return (
                                <text
                                    className="dash-figure"
                                    fill={MUTED}
                                    key={tick}
                                    style={{ fontSize: 11, textAnchor: anchor }}
                                    x={x(tick - 1)}
                                    y={CHART_HEIGHT - 4}
                                >
                                    {date.day(day)}
                                </text>
                            );
                        })}
                    </svg>
                ) : (
                    <div style={{ height: CHART_HEIGHT }} />
                )}
            </figure>
        </>
    );
}

function InCard({ view }: { view: MonthView }) {
    const { columns, month: copy } = useIntlayer("dashboard-budgets-plan");
    const money = useMoney();
    const date = useDateFormat();
    const { ledger } = useDashboard();
    const { open } = useBudgetFlows();
    const { month, period, plan } = view;
    const income = month.categories.filter((entry) => entry.income);
    const arrivals = new Map<string, string>();
    for (const row of ledger.rows) {
        if (row.income && row.day >= period.from && row.day <= period.to) {
            const id = row.topId === UNCATEGORIZED_ID ? UNCATEGORIZED_IN : row.topId;
            const seen = arrivals.get(id);
            if (seen === undefined || row.day > seen) {
                arrivals.set(id, row.day);
            }
        }
    }
    return (
        <Frame className="min-w-0">
            <CardHead
                aside={copy.of({ planned: money(month.inPlanned), spent: money(month.inActual) })}
                title={copy.in}
            />
            <Frame.Panel className="p-0">
                {income.length > 0 ? (
                    <DataTable
                        head={[columns.source, month.status === "closed" ? columns.got : columns.now, columns.arrived]}
                        numbers={0}
                    >
                        {income.map((entry) => {
                            const arrived = arrivals.get(entry.categoryId);
                            return (
                                <Table.Row key={entry.categoryId}>
                                    <Table.Cell className="max-w-[180px]">
                                        <EntryName meta={plan.categories.get(entry.categoryId)} view={view} />
                                    </Table.Cell>
                                    <Table.Cell className={FIGURE}>{money(entry.actual)}</Table.Cell>
                                    <Table.Cell className={`${FIGURE} text-muted-foreground`}>
                                        {arrived === undefined ? "" : date.day(arrived)}
                                    </Table.Cell>
                                </Table.Row>
                            );
                        })}
                    </DataTable>
                ) : (
                    <p className="text-muted-foreground px-5 pb-4 text-[13px]">{copy.noIncome}</p>
                )}
                {month.status === "current" ? (
                    <AddRow onClick={() => open({ categoryId: null, income: true, kind: "plan", month: month.key })}>
                        {copy.addIncome}
                    </AddRow>
                ) : null}
            </Frame.Panel>
        </Frame>
    );
}

function SetAsideCard({ view }: { view: MonthView }) {
    const { columns, month: copy, row } = useIntlayer("dashboard-budgets-plan");
    const money = useMoney();
    const names = useMonthNames();
    const { month, plan } = view;
    return (
        <Frame className="min-w-0">
            <CardHead aside={money(month.setAside)} title={copy.setAside} />
            <Frame.Panel className="p-0">
                <DataTable head={[columns.goal, columns.aMonth, columns.toward]} numbers={0}>
                    {month.goals.map(({ amount, goalId }) => {
                        const goal = plan.goals.get(goalId);
                        if (!goal) {
                            return null;
                        }
                        const date =
                            goal.targetDay === null
                                ? ""
                                : `${names.short(goal.targetDay)} ${goal.targetDay.slice(0, 4)}`;
                        return (
                            <Table.Row key={goalId}>
                                <Table.Cell className="max-w-[180px]">
                                    <span className={NAME}>
                                        <Glyph
                                            icon={Flag02Icon}
                                            className="text-muted-foreground flex-none"
                                            size={16}
                                        />
                                        <span className="truncate">{goal.name}</span>
                                    </span>
                                </Table.Cell>
                                <Table.Cell className={FIGURE}>{money(amount)}</Table.Cell>
                                <Table.Cell className={`${FIGURE} text-muted-foreground`}>
                                    {date === ""
                                        ? money(goal.target)
                                        : row.toward({ amount: money(goal.target), date })}
                                </Table.Cell>
                            </Table.Row>
                        );
                    })}
                </DataTable>
            </Frame.Panel>
        </Frame>
    );
}

function WhereCard({ view }: { view: MonthView }) {
    const { month: copy } = useIntlayer("dashboard-budgets-plan");
    const money = useMoney();
    const { month } = view;
    const spent = month.status === "closed" ? month.outActual : month.out;
    const left = month.in - spent - month.setAside;
    const base = Math.max(month.in, spent + month.setAside, 1);
    const line = (label: ReactNode, value: number, last = false) => (
        <div className={`flex h-10 items-center justify-between ${last ? "" : "border-b"}`}>
            <span className="text-muted-foreground text-[13px]">{label}</span>
            <span className={`dash-figure text-sm ${value < 0 ? "text-app-spend" : ""}`}>{money(value)}</span>
        </div>
    );
    return (
        <Frame className="min-w-0 flex-1">
            <CardHead aside={money(month.in)} title={copy.whereItWent} />
            <Frame.Panel className="px-4">
                <div aria-hidden className="flex h-3 gap-0.5 overflow-hidden rounded-full">
                    <i
                        className="bg-app-tint block h-full rounded-full"
                        style={{ width: `${(spent / base) * PERCENT}%` }}
                    />
                    {month.setAside > 0 ? (
                        <i
                            className="bg-muted-foreground block h-full rounded-full"
                            style={{ width: `${(month.setAside / base) * PERCENT}%` }}
                        />
                    ) : null}
                    {left > 0 ? <i className="bg-app-income block h-full flex-1 rounded-full" /> : null}
                </div>
                <div className="mt-2.5">
                    {line(copy.spent, spent)}
                    {line(copy.setAside, month.setAside)}
                    {line(month.status === "closed" ? copy.leftOver : copy.left, left, true)}
                </div>
            </Frame.Panel>
        </Frame>
    );
}

function EmptyMonth({ view }: { view: MonthView }) {
    const { empty, month: copy } = useIntlayer("dashboard-budgets-plan");
    const names = useMonthNames();
    const { open } = useBudgetFlows();
    const { key } = view.month;
    return (
        <Frame className="mt-4 mb-5 min-w-0 flex-1">
            <Frame.Panel className="relative isolate flex min-h-[744px] flex-1 flex-col items-center gap-1.5 overflow-hidden px-6 pt-[392px] text-center">
                <Ghost height={744} name="month" />
                <b className="text-[15px] leading-[22px] font-semibold">
                    {empty.monthTitle({ month: names.month(view.period.key) })}
                </b>
                <p className="text-muted-foreground mb-2.5 max-w-[320px] text-[13px] leading-5">{empty.monthLine}</p>
                <div className="flex flex-wrap justify-center gap-2">
                    <Button
                        onClick={() => open({ categoryId: null, income: false, kind: "plan", month: key })}
                        variant="outline"
                    >
                        <Glyph icon={Add01Icon} size={16} />
                        {copy.addCategory}
                    </Button>
                    <Button onClick={() => open({ categoryId: null, income: true, kind: "plan", month: key })}>
                        <Glyph icon={Add01Icon} size={16} />
                        {copy.addIncome}
                    </Button>
                </div>
            </Frame.Panel>
        </Frame>
    );
}

function PlanMonthBody({ periodKey }: { periodKey: string }) {
    const { ledger, restoring } = useDashboard();
    const key = monthKeyOf(periodKey);
    const { year } = monthKeyParts(key);
    const plan = useYearPlan(year);
    const month = plan.projection.months.find((each) => each.key === key);
    if (!month) {
        return null;
    }
    const view: MonthView = { month, period: periodOf(periodKey, ledger.firstDayOfMonth), plan, year };
    const empty = month.categories.length === 0;
    if (empty && restoring) {
        return (
            <Restoring>
                <PlanMonthBody periodKey={periodKey} />
            </Restoring>
        );
    }
    let body: ReactNode;
    if (empty) {
        body = <EmptyMonth view={view} />;
    } else if (month.status === "ahead") {
        body = (
            <div className="mt-4 mb-5 flex min-w-0 flex-1 flex-col">
                <OutCard view={view} />
            </div>
        );
    } else {
        body = (
            <div className="mt-4 mb-5 grid min-w-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
                <OutCard view={view} />
                <div className="flex min-w-0 flex-col gap-4">
                    <InCard view={view} />
                    {month.goals.length > 0 ? <SetAsideCard view={view} /> : null}
                    <WhereCard view={view} />
                </div>
            </div>
        );
    }
    return (
        <main className="@container flex min-h-full min-w-0 flex-col px-4 pb-5 sm:px-6">
            <MonthBar view={view} />
            <MonthKpis view={view} />
            {body}
        </main>
    );
}

export function PlanMonthScreen({ month }: { month: string }) {
    return (
        <BudgetFlowsProvider>
            <PlanMonthBody periodKey={month} />
        </BudgetFlowsProvider>
    );
}
