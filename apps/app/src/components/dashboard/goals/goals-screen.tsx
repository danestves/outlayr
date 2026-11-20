import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import Flag02Icon from "@hugeicons/core-free-icons/Flag02Icon";
import { Link } from "@tanstack/react-router";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { Frame } from "panelui-web/frame";
import { Table } from "panelui-web/table";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { AccountsBar, Card, Cell, DataTable, MUTED } from "@/components/dashboard/accounts/accounts-screen";
import { Glyph } from "@/components/dashboard/accounts/glyph";
import { accountRows } from "@/components/dashboard/accounts/model";
import { KpiBand, KpiCell } from "@/components/dashboard/accounts/parts";
import { useMonthShort } from "@/components/dashboard/accounts/worth-chart";
import { Empty } from "@/components/dashboard/home/empty";
import { titled, useDateFormat, useMonthYear } from "@/components/dashboard/home/format";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { AccountTile } from "@/components/ledger/tiles";
import { viewTransition } from "@/lib/motion";

import { useGoalFlows } from "./flow-context";
import { GoalFlowsProvider } from "./goal-flows";
import { goalsSummary, goalViews, lastMonth, roadOf, standingOf } from "./model";
import type { GoalsSummary, GoalView, Road } from "./model";
import { GoalBar, GoalMenu, GoalTile, PaceBadge, PERCENT, ReachedBadge, percentOf, useGoalMoney } from "./parts";

const ROAD_LABELS = 12;

function useGoalsModel() {
    const { ledger, overview } = useDashboard();
    return useMemo(() => {
        const views = goalViews(ledger, accountRows(ledger, overview));
        const summary = goalsSummary(ledger, views);
        return { last: lastMonth(ledger), road: roadOf(ledger, summary.active), summary, views };
    }, [ledger, overview]);
}

const quiet = (children: ReactNode) => (
    <span className="text-muted-foreground text-app-label min-w-0 truncate leading-5">{children}</span>
);

function Kpis({ income, summary }: { income: number; summary: GoalsSummary }) {
    const { ledger } = useDashboard();
    const { kpi } = useIntlayer("dashboard-goals");
    const format = useGoalMoney();
    const monthYear = useMonthYear();
    const { active, monthly, next, reached, toGo } = summary;
    let activeNote: ReactNode = kpi.active({ count: active.length });
    if (active.length === 0) {
        activeNote = kpi.activeNone;
    } else if (active.length === 1) {
        activeNote = kpi.activeOne;
    }
    let reachedNote: ReactNode = kpi.reachedNone;
    if (reached.length === 1) {
        reachedNote = reached[0]?.name;
    } else if (reached.length > 1) {
        reachedNote = kpi.reachedMore({ count: reached.length - 1, name: reached[0]?.name ?? "" });
    }
    return (
        <KpiBand>
            <KpiCell color={MUTED} label={kpi.toGo} value={format(toGo, ledger.currency)}>
                {quiet(activeNote)}
            </KpiCell>
            <KpiCell color={MUTED} label={kpi.monthly} value={format(monthly, ledger.currency)}>
                {income > 0 ? (
                    <span className="flex min-w-0 items-center gap-2">
                        <Badge
                            className="dash-figure text-muted-foreground text-app-caption! h-5 rounded-full px-2 font-medium"
                            variant="secondary"
                        >
                            {Math.round((monthly / income) * PERCENT)}%
                        </Badge>
                        {quiet(kpi.ofIncome)}
                    </span>
                ) : (
                    quiet(kpi.noIncome)
                )}
            </KpiCell>
            <KpiCell
                color={MUTED}
                label={kpi.nextUp}
                quiet={next === null}
                value={next?.targetDay ? monthYear(next.targetDay) : "–"}
            >
                {quiet(next?.name)}
            </KpiCell>
            <KpiCell color={MUTED} label={kpi.reached} value={String(reached.length)}>
                {quiet(reachedNote)}
            </KpiCell>
        </KpiBand>
    );
}

function GoalLink({ view }: { view: GoalView }) {
    return (
        <Link
            className="text-app-body flex min-w-0 items-center gap-2.5 font-medium hover:underline"
            params={{ goalId: view.id }}
            to="/goals/$goalId"
            viewTransition={viewTransition("push-left")}
        >
            <GoalTile reached={view.progress.reached} />
            <span className="truncate">{view.name}</span>
        </Link>
    );
}

function AccountName({ view }: { view: GoalView }) {
    return (
        <span className="text-app-label flex min-w-0 items-center gap-2">
            <AccountTile account={view.account.look} size="sm" />
            <span className="truncate">{view.account.name}</span>
        </span>
    );
}

function ProgressCell({ view }: { view: GoalView }) {
    return (
        <Cell>
            <span className="flex items-center gap-2.5">
                <GoalBar className="w-40" reached={view.progress.reached} value={view.progress.fraction} />
                <span className="dash-figure text-muted-foreground text-app-label w-9">{percentOf(view)}%</span>
            </span>
        </Cell>
    );
}

const FIGURE = "dash-figure text-app-body";
const SOFT = "dash-figure text-muted-foreground text-app-body";

function ActiveCard({ views }: { views: readonly GoalView[] }) {
    const { ledger } = useDashboard();
    const { columns, sections } = useIntlayer("dashboard-goals");
    const format = useGoalMoney();
    const monthYear = useMonthYear();
    if (views.length === 0) {
        return null;
    }
    return (
        <Card aside={views.length} title={sections.active}>
            <DataTable
                density="comfortable"
                head={[
                    columns.goal,
                    columns.account,
                    columns.progress,
                    columns.saved,
                    columns.target,
                    columns.by,
                    columns.monthly,
                    columns.pace,
                    "",
                ]}
                numbers={0}
                phoneHidden={[2, 4, 5]}
            >
                {views.map((view) => (
                    <Table.Row key={view.id}>
                        <Cell>
                            <GoalLink view={view} />
                        </Cell>
                        <Cell>
                            <AccountName view={view} />
                        </Cell>
                        <ProgressCell view={view} />
                        <Cell className={`${FIGURE} font-medium`}>{format(view.saved, view.savedCurrency)}</Cell>
                        <Cell className={SOFT}>{format(view.target, view.targetCurrency)}</Cell>
                        <Cell className={SOFT}>{view.targetDay ? monthYear(view.targetDay) : "–"}</Cell>
                        <Cell className={`${FIGURE} font-medium`}>
                            {view.progress.pace ? format(view.progress.pace.perMonth, ledger.currency) : "–"}
                        </Cell>
                        <Cell>
                            <PaceBadge standing={standingOf(view)} />
                        </Cell>
                        <Cell className="w-10">
                            <GoalMenu view={view} />
                        </Cell>
                    </Table.Row>
                ))}
            </DataTable>
        </Card>
    );
}

function ReachedCard({ views }: { views: readonly GoalView[] }) {
    const { columns, sections } = useIntlayer("dashboard-goals");
    const format = useGoalMoney();
    const monthYear = useMonthYear();
    if (views.length === 0) {
        return null;
    }
    return (
        <Card aside={views.length} title={sections.reached}>
            <DataTable
                density="comfortable"
                head={[
                    columns.goal,
                    columns.account,
                    columns.progress,
                    columns.holds,
                    columns.target,
                    columns.by,
                    columns.status,
                    "",
                ]}
                numbers={0}
                phoneHidden={[2, 3, 5]}
            >
                {views.map((view) => (
                    <Table.Row key={view.id}>
                        <Cell>
                            <GoalLink view={view} />
                        </Cell>
                        <Cell>
                            <AccountName view={view} />
                        </Cell>
                        <ProgressCell view={view} />
                        <Cell className={`${FIGURE} font-medium`}>{format(view.saved, view.savedCurrency)}</Cell>
                        <Cell className={SOFT}>{format(view.target, view.targetCurrency)}</Cell>
                        <Cell className={SOFT}>{view.targetDay ? monthYear(view.targetDay) : "–"}</Cell>
                        <Cell>
                            <ReachedBadge />
                        </Cell>
                        <Cell className="w-10">
                            <GoalMenu view={view} />
                        </Cell>
                    </Table.Row>
                ))}
            </DataTable>
        </Card>
    );
}

const ROAD_GRID = "grid grid-cols-[minmax(6rem,8.75rem)_minmax(0,1fr)_5.625rem] items-center gap-x-4";

function RoadCard({ road }: { road: Road | null }) {
    const { ledger } = useDashboard();
    const { sections } = useIntlayer("dashboard-goals");
    const format = useGoalMoney();
    const monthYear = useMonthYear();
    const short = useMonthShort();
    if (road === null) {
        return null;
    }
    const { months, rows } = road;
    const every = Math.ceil(months.length / ROAD_LABELS);
    const [first = "", last = first] = [months[0], months.at(-1)];
    const segments = (filled: number) => (
        <span className="flex gap-1">
            {months.map((month, index) => (
                <i
                    className={`block h-3.5 min-w-0 flex-1 rounded-xs ${index < filled ? "bg-app-tint/70" : "bg-app-hover"}`}
                    key={month}
                />
            ))}
        </span>
    );
    return (
        <Card
            aside={
                <span className="font-sans">
                    {sections.range({ from: monthYear(`${first}-15`), to: monthYear(`${last}-15`) })}
                </span>
            }
            className="flex-1"
            title={sections.road}
        >
            <div className="overflow-x-auto px-4">
                <div className="min-w-140">
                    <div className={`${ROAD_GRID} h-10 border-b`}>
                        <span />
                        <span className="flex gap-1">
                            {months.map((month, index) => (
                                <span
                                    className="dash-figure text-muted-foreground text-app-micro min-w-0 flex-1 truncate text-center"
                                    key={month}
                                >
                                    {index % every === 0 ? short(`${month}-15`) : ""}
                                </span>
                            ))}
                        </span>
                        <span />
                    </div>
                    {rows.map(({ filled, view }) => (
                        <div className={`${ROAD_GRID} h-24 border-b last:border-0`} key={view.id}>
                            <Link
                                className="text-app-label truncate font-medium hover:underline"
                                params={{ goalId: view.id }}
                                to="/goals/$goalId"
                                viewTransition={viewTransition("push-left")}
                            >
                                {view.name}
                            </Link>
                            {segments(filled)}
                            <span className="dash-figure text-muted-foreground text-app-label text-end">
                                {view.comparable
                                    ? format(view.progress.remaining, ledger.currency)
                                    : format(Math.max(0, view.target - view.saved), view.targetCurrency)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );
}

function NewGoal() {
    const { newGoal } = useIntlayer("dashboard-goals");
    const { open } = useGoalFlows();
    return (
        <Button onClick={() => open({ kind: "create" })}>
            <Glyph icon={Add01Icon} size={16} />
            {newGoal}
        </Button>
    );
}

function EmptyGoals({ kept, month }: { kept: number; month: string }) {
    const { ledger } = useDashboard();
    const { empty } = useIntlayer("dashboard-goals");
    const format = useGoalMoney();
    const date = useDateFormat();
    const { locale } = useLocale();
    return (
        <Frame className="mb-4 min-w-0 flex-1">
            <Frame.Panel className="flex flex-1 flex-col divide-y-0">
                <Empty
                    action={<NewGoal />}
                    icon={Flag02Icon}
                    line={
                        kept > 0
                            ? empty.kept({
                                  amount: format(kept, ledger.currency),
                                  month: titled(date.month(month), locale),
                              })
                            : empty.line
                    }
                    title={empty.title}
                />
            </Frame.Panel>
        </Frame>
    );
}

function GoalsList() {
    const { title } = useIntlayer("dashboard-goals");
    const { last, road, summary, views } = useGoalsModel();
    const empty = views.length === 0;
    return (
        <main className="@container flex min-h-full min-w-0 flex-col px-4 pb-5 sm:px-6">
            <AccountsBar title={title}>{empty ? null : <NewGoal />}</AccountsBar>
            {empty ? (
                <EmptyGoals kept={last.kept} month={last.month} />
            ) : (
                <>
                    <Kpis income={last.income} summary={summary} />
                    <div className="mt-4 flex flex-1 flex-col gap-4">
                        <ActiveCard views={summary.active} />
                        <ReachedCard views={summary.reached} />
                        <RoadCard road={road} />
                    </div>
                </>
            )}
        </main>
    );
}

export function GoalsScreen() {
    return (
        <GoalFlowsProvider>
            <GoalsList />
        </GoalFlowsProvider>
    );
}
