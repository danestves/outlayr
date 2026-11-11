import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon";
import MoreVerticalIcon from "@hugeicons/core-free-icons/MoreVerticalIcon";
import PencilEdit01Icon from "@hugeicons/core-free-icons/PencilEdit01Icon";
import { entryLook } from "@outlayr/money/ledger-log";
import { Link } from "@tanstack/react-router";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { Frame } from "panelui-web/frame";
import { Menu } from "panelui-web/menu";
import { Switch } from "panelui-web/switch";
import { Table } from "panelui-web/table";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { AccountsBar, Cell, DataTable } from "@/components/dashboard/accounts/accounts-screen";
import { useLedgerDb } from "@/components/dashboard/accounts/flows";
import { Glyph } from "@/components/dashboard/accounts/glyph";
import { KpiBand, KpiCell, Trend } from "@/components/dashboard/accounts/parts";
import { useCategoryName, useDateFormat, useWholeMoney } from "@/components/dashboard/home/format";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import { Restoring } from "@/components/dashboard/shell/sampled";
import { LookTile, MerchantTile } from "@/components/ledger/tiles";
import { editedBudget } from "@/lib/budget-writes";
import type { LedgerRow } from "@/lib/dashboard-series-ledger";
import { daysBetween } from "@/lib/ledger";
import { ledgerBooks } from "@/lib/ledger-db";

import { cadenceOf, useWindowNames } from "./budget-dialogs";
import { BudgetFlowsProvider } from "./budget-flows";
import { useBudgetFlows } from "./flow-context";
import { budgetDetail } from "./model";
import type { BudgetDetail, BudgetLine } from "./model";
import {
    BADGE,
    BudgetMenuItems,
    CardHead,
    Dot,
    Ghost,
    HistoryBars,
    MonthStepper,
    PaceChart,
    TINT,
    quiet,
    useBudgetMonth,
    useMoney,
} from "./parts";
import { BACK, PARENT, PlanCrumbs } from "./plan-year";

const PERCENT = 100;
const HISTORY_HEIGHT = 278;
const CLOSED_HISTORY_HEIGHT = 262;
const OPEN_HISTORY_HEIGHT = 160;
const PACE_HEIGHT = 262;

const percent = (ratio: number) => `${Math.round(ratio * PERCENT)}%`;

function useDetailName() {
    const categoryName = useCategoryName();
    return (detail: BudgetDetail) => categoryName({ id: detail.categoryId, name: detail.name });
}

function DetailMenu({ line, name }: { line: BudgetLine; name: string }) {
    const { menu } = useIntlayer("dashboard-budgets");
    return (
        <Menu>
            <Menu.Trigger
                aria-label={menu.more({ name }).value}
                render={<Button className="text-muted-foreground" size="icon" variant="outline" />}
            >
                <Glyph icon={MoreVerticalIcon} size={16} />
            </Menu.Trigger>
            <Menu.Content align="end" className="app-shell ph-no-capture w-[200px]" sideOffset={4}>
                <BudgetMenuItems line={line} />
            </Menu.Content>
        </Menu>
    );
}

function DetailBar({ detail }: { detail: BudgetDetail }) {
    const copy = useIntlayer("dashboard-budgets");
    const { open } = useBudgetFlows();
    const name = useDetailName()(detail);
    return (
        <AccountsBar
            title={
                <PlanCrumbs
                    back={
                        <Button
                            aria-label={copy.back.value}
                            className={BACK}
                            nativeButton={false}
                            render={<Link search={(prev) => prev} to="/app/budgets" />}
                            size="icon"
                            variant="ghost"
                        >
                            <Glyph icon={ArrowLeft01Icon} size={16} />
                        </Button>
                    }
                    parent={
                        <Link className={PARENT} search={(prev) => prev} to="/app/budgets">
                            {copy.title}
                        </Link>
                    }
                >
                    <span className="flex min-w-0 items-center gap-2">
                        <Dot color={detail.color} size={10} />
                        <span className="truncate">{name}</span>
                        {detail.phase === "closed" ? (
                            <Badge className={`${BADGE} ms-0.5`} variant="secondary">
                                {copy.kpi.closed}
                            </Badge>
                        ) : null}
                    </span>
                </PlanCrumbs>
            }
        >
            <MonthStepper />
            {detail.line ? (
                <DetailMenu line={detail.line} name={name} />
            ) : (
                <Button onClick={() => open({ categoryId: detail.categoryId, kind: "new" })}>
                    <Glyph icon={Add01Icon} size={16} />
                    {copy.addLimit}
                </Button>
            )}
        </AccountsBar>
    );
}

function useTypicalNote() {
    const { columns } = useIntlayer("dashboard-budgets");
    const names = useWindowNames();
    return (detail: BudgetDetail) => {
        const { from, to } = detail.typical;
        if (from === null || to === null) {
            return null;
        }
        const cadence = cadenceOf(detail.line?.budget.type ?? 0);
        return quiet(columns.range({ from: names.bar(from, cadence), to: names.bar(to, cadence) }));
    };
}

function LimitKpis({ detail, line }: { detail: BudgetDetail; line: BudgetLine }) {
    const { kpi } = useIntlayer("dashboard-budgets");
    const money = useMoney();
    const typicalNote = useTypicalNote();
    const limit = line.standing.effectiveLimit;
    const { spent } = detail;
    const ratio = limit > 0 ? spent / limit : 0;
    const over = spent > limit;
    let standing: ReactNode = (
        <Badge className={BADGE} dot variant="success">
            {line.status === "held" ? kpi.held : kpi.onTrack}
        </Badge>
    );
    if (detail.phase === "ahead") {
        standing = quiet(kpi.daysToGo({ count: detail.daysLeft }));
    } else if (over) {
        standing = (
            <Badge className={BADGE} dot variant="destructive">
                {kpi.overBudget}
            </Badge>
        );
    }
    let leftTone = "text-app-income";
    if (over) {
        leftTone = "text-app-spend";
    } else if (detail.phase === "ahead") {
        leftTone = "";
    }
    return (
        <KpiBand>
            <KpiCell color={TINT} label={kpi.spent} value={money(spent)}>
                <span className="flex min-w-0 items-center gap-2">
                    <Trend goodWhenUp={false} value={ratio > 1 ? 1 : 0}>
                        {percent(ratio)}
                    </Trend>
                    {quiet(kpi.ofLimit)}
                </span>
            </KpiCell>
            <KpiCell color={TINT} label={kpi.limit} value={money(limit)}>
                {quiet(kpi.cadence[cadenceOf(line.budget.type)])}
            </KpiCell>
            <KpiCell
                color={TINT}
                label={over ? kpi.over : kpi.left}
                tone={leftTone}
                value={money(Math.abs(limit - spent))}
            >
                {standing}
            </KpiCell>
            <KpiCell color={TINT} label={kpi.typical} value={money(detail.typical.amount ?? 0)}>
                {typicalNote(detail)}
            </KpiCell>
        </KpiBand>
    );
}

function OpenKpis({ detail }: { detail: BudgetDetail }) {
    const copy = useIntlayer("dashboard-budgets");
    const { ledger } = useDashboard();
    const { whole } = useWholeMoney(ledger.currency);
    const typicalNote = useTypicalNote();
    return (
        <KpiBand>
            <KpiCell color={TINT} label={copy.kpi.spent} value={whole(detail.spent)}>
                {quiet(copy.shareOf({ percent: percent(detail.share) }))}
            </KpiCell>
            <KpiCell color={TINT} label={copy.kpi.limit} tone="text-muted-foreground" value={copy.kpi.noLimit.value}>
                {quiet(copy.kpi.notBudgeted)}
            </KpiCell>
            <KpiCell color={TINT} label={copy.kpi.typical} value={whole(detail.typical.amount ?? 0)}>
                {typicalNote(detail)}
            </KpiCell>
        </KpiBand>
    );
}

function usePaceNote() {
    const { ledger } = useDashboard();
    const { pace } = useIntlayer("dashboard-budgets");
    const { whole } = useWholeMoney(ledger.currency);
    const date = useDateFormat();
    return (detail: BudgetDetail, line: BudgetLine): ReactNode => {
        const { runOut } = line.standing;
        const left = line.standing.effectiveLimit - detail.spent;
        if (detail.phase === "ahead") {
            return null;
        }
        if (left < 0 && runOut) {
            const facts = { count: runOut.daysEarly, date: date.day(runOut.day) };
            if (runOut.daysEarly === 0) {
                return pace.ranOutLast(facts);
            }
            return runOut.daysEarly === 1 ? pace.ranOutOne(facts) : pace.ranOut(facts);
        }
        if (detail.phase === "closed") {
            return pace.held({ amount: whole(left) });
        }
        return detail.daysLeft === 1
            ? pace.underOne({ amount: whole(left) })
            : pace.under({ amount: whole(left), count: detail.daysLeft });
    };
}

function PaceCard({ detail, line }: { detail: BudgetDetail; line: BudgetLine }) {
    const { ledger } = useDashboard();
    const { pace } = useIntlayer("dashboard-budgets");
    const note = usePaceNote()(detail, line);
    return (
        <Frame className="min-w-0">
            <CardHead
                aside={note ? <span className="text-muted-foreground text-[13px]">{note}</span> : null}
                title={pace.chart}
            />
            <Frame.Panel className="pb-3">
                <PaceChart
                    currency={ledger.currency}
                    daily={detail.daily}
                    from={detail.window.from}
                    height={PACE_HEIGHT}
                    label={pace.chart.value}
                    limit={line.standing.effectiveLimit}
                    total={daysBetween(detail.window.from, detail.window.to) + 1}
                />
            </Frame.Panel>
        </Frame>
    );
}

function EntryTile({ row }: { row: LedgerRow }) {
    const { ledger } = useDashboard();
    const look = useMemo(() => {
        const source = ledger.books.transactions.find((each) => each.localId === row.id);
        const category = ledger.books.categories.find((each) => each.localId === source?.categoryId);
        return source ? entryLook(source, category) : null;
    }, [ledger.books, row.id]);
    if (!(look?.icon || look?.emoji)) {
        return <MerchantTile name={row.note || "?"} size="lg" />;
    }
    return <LookTile look={look} plain size="lg" />;
}

function TransactionsCard({ detail }: { detail: BudgetDetail }) {
    const copy = useIntlayer("dashboard-budgets");
    const { ledger } = useDashboard();
    const money = useMoney();
    const date = useDateFormat();
    const fallback = useDetailName()(detail);
    const { columns } = copy;
    const tiled = detail.line !== null;
    return (
        <Frame className="min-w-0 flex-1">
            <CardHead
                aside={<span className="dash-figure text-muted-foreground text-[13px]">{detail.rows.length}</span>}
                title={copy.detail.transactions}
            />
            {detail.rows.length === 0 ? (
                <Frame.Panel className="relative isolate flex min-h-[348px] flex-1 flex-col items-center justify-end overflow-hidden px-6 pb-7 text-center">
                    <Ghost height={348} name="spending" width={846} />
                    <p className="text-muted-foreground text-[13px] leading-5">{copy.detail.noSpending}</p>
                </Frame.Panel>
            ) : (
                <Frame.Panel className="flex-1 p-0">
                    <DataTable
                        density={tiled ? "compact" : "comfortable"}
                        head={[columns.merchant, columns.account, columns.date, columns.amount]}
                        numbers={0}
                        phoneHidden={[2]}
                    >
                        {detail.rows.map((row) => {
                            const merchant = row.note || fallback;
                            return (
                                <Table.Row className="hover:bg-app-hover relative transition-colors" key={row.id}>
                                    <Cell>
                                        <Link
                                            className="focus-visible:ring-ring flex min-w-0 items-center gap-[9px] rounded-sm text-sm font-medium outline-none after:absolute after:inset-0 focus-visible:ring-2"
                                            search={(prev) => ({ accounts: prev.accounts, entry: row.id })}
                                            to="/app/transactions"
                                        >
                                            {tiled ? <EntryTile row={row} /> : null}
                                            <span className="max-w-[160px] truncate sm:max-w-[280px]">{merchant}</span>
                                        </Link>
                                    </Cell>
                                    <Cell className="text-muted-foreground">
                                        {(row.accountId && ledger.accounts.get(row.accountId)?.name) ?? ""}
                                    </Cell>
                                    <Cell className="dash-figure text-muted-foreground">{date.day(row.day)}</Cell>
                                    <Cell className="font-normal" figure>
                                        {money(-row.amount)}
                                    </Cell>
                                </Table.Row>
                            );
                        })}
                    </DataTable>
                </Frame.Panel>
            )}
        </Frame>
    );
}

function Fact({ children, label }: { children: ReactNode; label: ReactNode }) {
    return (
        <div className="flex h-[42px] items-center justify-between gap-3 border-t text-[13px]">
            <span className="text-muted-foreground">{label}</span>
            {children}
        </div>
    );
}

function BudgetCard({ detail, line }: { detail: BudgetDetail; line: BudgetLine }) {
    const copy = useIntlayer("dashboard-budgets");
    const { ledger } = useDashboard();
    const { open } = useBudgetFlows();
    const db = useLedgerDb();
    const committer = useLedgerCommitter();
    const money = useMoney();
    const date = useDateFormat();
    const name = useDetailName()(detail);
    const { budget } = line;
    const from =
        budget.startDate === null
            ? line.standing.from
            : new Date(budget.startDate + ledger.offsetAt(budget.startDate)).toISOString().slice(0, 10);
    const carry = (rollover: boolean) => {
        const books = ledgerBooks(db);
        const fresh = (line.table === "budgets" ? books.budgets : books.mainBudget).find(
            (row) => row.localId === line.id
        );
        if (!fresh) {
            return;
        }
        const draft = { amount: fresh.amount, name: fresh.name ?? "", rollover, startDay: null, type: fresh.type };
        void committer.commit([editedBudget({ ...ledger, books }, line.table, fresh, draft, Date.now())], {
            failed: copy.form.failed.value,
        });
    };
    return (
        <Frame className="min-w-0">
            <CardHead
                aside={
                    <Button onClick={() => open({ budgetId: line.id, kind: "edit" })} size="sm" variant="outline">
                        <Glyph icon={PencilEdit01Icon} className="text-muted-foreground" size={15} />
                        {copy.detail.edit}
                    </Button>
                }
                title={copy.detail.budget}
            />
            <Frame.Panel className="pt-0 pb-1.5">
                <Fact label={copy.detail.limit}>
                    <span className="dash-figure">{money(line.standing.limit)}</span>
                </Fact>
                <Fact label={copy.detail.every}>{copy.cadence[cadenceOf(budget.type)]}</Fact>
                <Fact label={copy.detail.from}>
                    <span className="dash-figure">{date.full(from)}</span>
                </Fact>
                <Fact label={copy.detail.carryOver}>
                    <Switch
                        aria-label={copy.detail.carryOver.value}
                        checked={budget.rollover}
                        onCheckedChange={carry}
                    />
                </Fact>
                {detail.phase === "closed" ? (
                    <p className="text-muted-foreground border-t pt-2.5 pb-1.5 text-xs">{copy.detail.closedNote}</p>
                ) : (
                    <Fact label={copy.detail.name}>
                        <span className="truncate">{line.customName ?? name}</span>
                    </Fact>
                )}
            </Frame.Panel>
        </Frame>
    );
}

function HistoryCard({ detail }: { detail: BudgetDetail }) {
    const copy = useIntlayer("dashboard-budgets");
    const { ledger } = useDashboard();
    const { whole } = useWholeMoney(ledger.currency);
    const names = useWindowNames();
    const { line } = detail;
    const cadence = cadenceOf(line?.budget.type ?? 0);
    const bars = detail.history.map((window) => ({
        key: window.from,
        label: names.bar(window.from, cadence),
        spent: window.spent,
    }));
    const limit = line?.standing.effectiveLimit ?? null;
    const over = detail.history.filter((window) => window.limit !== null && window.spent > window.limit).length;
    let height = HISTORY_HEIGHT;
    if (!line) {
        height = OPEN_HISTORY_HEIGHT;
    } else if (detail.phase === "closed") {
        height = CLOSED_HISTORY_HEIGHT;
    }
    return (
        <Frame className={`min-w-0 ${line ? "flex-1" : ""}`}>
            <CardHead
                aside={
                    line ? (
                        <span className="text-muted-foreground text-[13px]">
                            {copy.detail.overCount({ count: over, total: detail.history.length })}
                        </span>
                    ) : null
                }
                title={copy.detail.last[cadence]}
            />
            <Frame.Panel className={line ? "pb-2" : ""}>
                <HistoryBars
                    bars={bars}
                    color={detail.color}
                    height={height}
                    limit={limit}
                    selected={detail.selected}
                />
            </Frame.Panel>
            {line ? (
                <Frame.Panel className="p-0">
                    <DataTable
                        head={[copy.columns.window[cadence], copy.columns.spent, copy.columns.against]}
                        numbers={1}
                    >
                        {detail.history.toReversed().map((window) => {
                            const left = window.limit === null ? null : window.limit - window.spent;
                            let against: ReactNode = copy.none;
                            if (left !== null) {
                                against =
                                    left >= 0
                                        ? copy.status.under({ amount: whole(left) })
                                        : copy.status.over({ amount: whole(-left) });
                            }
                            let tone = "text-muted-foreground";
                            if (left !== null) {
                                tone = left >= 0 ? "text-app-income" : "text-app-spend";
                            }
                            return (
                                <Table.Row key={window.from}>
                                    <Cell>{names.bar(window.from, cadence)}</Cell>
                                    <Cell className="font-normal" figure>
                                        {whole(window.spent)}
                                    </Cell>
                                    <Cell className={`font-normal ${tone}`} figure>
                                        {against}
                                    </Cell>
                                </Table.Row>
                            );
                        })}
                    </DataTable>
                </Frame.Panel>
            ) : null}
        </Frame>
    );
}

function NotFound() {
    const copy = useIntlayer("dashboard-budgets");
    return (
        <main className="min-w-0 px-4 pb-5 sm:px-6">
            <AccountsBar title={copy.title} />
            <p className="text-muted-foreground py-6 text-sm">
                {copy.detail.notFound}{" "}
                <Link className="text-foreground underline" search={(prev) => prev} to="/app/budgets">
                    {copy.back}
                </Link>
            </p>
        </main>
    );
}

function SampleDetail() {
    const first = useDashboard().ledger.books.budgets.find((row) => row.deletedAt === null && row.categoryId !== null);
    return first?.categoryId ? <DetailPage categoryId={first.categoryId} /> : null;
}

function DetailPage({ categoryId }: { categoryId: string }) {
    const { ledger, restoring } = useDashboard();
    const { period } = useBudgetMonth();
    const detail = useMemo(() => budgetDetail(ledger, categoryId, period), [categoryId, ledger, period]);
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
    const { line } = detail;
    return (
        <main className="@container flex min-h-full min-w-0 flex-col px-4 pb-5 sm:px-6">
            <DetailBar detail={detail} />
            <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_296px]">
                <div className="flex min-w-0 flex-col gap-4">
                    {line ? <LimitKpis detail={detail} line={line} /> : <OpenKpis detail={detail} />}
                    {line ? <PaceCard detail={detail} line={line} /> : null}
                    <TransactionsCard detail={detail} />
                </div>
                <div className="flex min-w-0 flex-col gap-4">
                    {line ? <BudgetCard detail={detail} line={line} /> : null}
                    <HistoryCard detail={detail} />
                </div>
            </div>
        </main>
    );
}

export function BudgetDetailScreen({ categoryId }: { categoryId: string }) {
    return (
        <BudgetFlowsProvider>
            <DetailPage categoryId={categoryId} />
        </BudgetFlowsProvider>
    );
}
