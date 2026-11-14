import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import Calendar01Icon from "@hugeicons/core-free-icons/Calendar01Icon";
import { Link } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import { Frame } from "panelui-web/frame";
import { Table } from "panelui-web/table";
import { Tabs } from "panelui-web/tabs";
import { useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { AccountsBar, Cell, DataTable, MUTED } from "@/components/dashboard/accounts/accounts-screen";
import { Glyph } from "@/components/dashboard/accounts/glyph";
import { KpiBand, KpiCell } from "@/components/dashboard/accounts/parts";
import { useDateFormat } from "@/components/dashboard/home/format";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { Restoring } from "@/components/dashboard/shell/sampled";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { DebtFlowsProvider } from "./debt-flows";
import { useDebtFlows } from "./flow-context";
import { DUE_DAYS } from "./model";
import type { DebtRow, DebtsModel } from "./model";
import { BehindBadge, DebtMenu, PersonTile, usePlanText, useDebts } from "./parts";

type Tab = "all" | "owesYou" | "settled" | "youOwe";

const TABS: readonly Tab[] = ["all", "owesYou", "youOwe", "settled"];

const quiet = (children: ReactNode) => (
    <span className="text-muted-foreground min-w-0 truncate text-xs leading-5">{children}</span>
);

const tone = (value: number) => (value === 0 ? "text-muted-foreground" : "");

function Kpis({ model }: { model: DebtsModel }) {
    const { ledger } = useDashboard();
    const { kpi } = useIntlayer("dashboard-debts");
    const { money } = useDisplayFormat();
    const { behind, cards, owesYou, totals, youOwe } = model;
    const net = totals.owesYou - totals.youOwe;
    const people = (count: number) => quiet(count === 1 ? kpi.person : kpi.people({ count }));
    const owing = cards.filter((row) => row.amount > 0);
    let cardsNote: ReactNode = kpi.none;
    if (owing.length === 1) {
        cardsNote = owing[0]?.account.name;
    } else if (owing.length > 1) {
        cardsNote = kpi.cardsMore({ count: owing.length - 1, name: owing[0]?.account.name ?? "" });
    }
    let netNote: ReactNode = quiet(kpi.allClear);
    if (behind?.line?.behind) {
        netNote = (
            <span className="flex min-w-0 items-center gap-2">
                <BehindBadge amount={behind.line.behind} currency={behind.account.currency} />
                {quiet(behind.account.name)}
            </span>
        );
    } else if (owesYou.length + youOwe.length > 0) {
        netNote = people(owesYou.length + youOwe.length);
    }
    const figure = (value: number) => money(value, ledger.currency);
    return (
        <KpiBand>
            <KpiCell color={MUTED} label={kpi.owesYou} tone={tone(totals.owesYou)} value={figure(totals.owesYou)}>
                {people(owesYou.length)}
            </KpiCell>
            <KpiCell color={MUTED} label={kpi.youOwe} tone={tone(totals.youOwe)} value={figure(totals.youOwe)}>
                {people(youOwe.length)}
            </KpiCell>
            <KpiCell color={MUTED} label={kpi.net} tone={tone(net)} value={figure(net)}>
                {netNote}
            </KpiCell>
            <KpiCell color={MUTED} label={kpi.cards} tone={tone(totals.cards)} value={figure(totals.cards)}>
                {quiet(cardsNote)}
            </KpiCell>
        </KpiBand>
    );
}

function DueStrip({ due }: { due: NonNullable<DebtsModel["due"]> }) {
    const { ledger } = useDashboard();
    const copy = useIntlayer("dashboard-debts").due;
    const { money } = useDisplayFormat();
    const date = useDateFormat();
    const { count, next } = due;
    const facts = { count, date: date.day(next.day), name: next.name };
    let summary: ReactNode = count === 1 ? copy.summaryOne(facts) : copy.summary(facts);
    if (next.overdue) {
        summary = count === 1 ? copy.overdueOne(facts) : copy.overdue(facts);
    }
    return (
        <div className="bg-card mt-3 flex min-h-11 flex-wrap items-center gap-x-2.5 gap-y-1 rounded-xl border px-3.5 py-2 text-[13px]">
            <Glyph icon={Calendar01Icon} className="text-muted-foreground" size={16} />
            <span>{copy.title({ days: DUE_DAYS })}</span>
            <span className="dash-figure">{money(due.total, ledger.currency)}</span>
            <span className="text-muted-foreground min-w-0 truncate">{summary}</span>
        </div>
    );
}

function NameCell({ row }: { row: DebtRow }) {
    const name = (
        <>
            <PersonTile row={row} />
            <span className="truncate">{row.account.name}</span>
        </>
    );
    const style = "flex min-w-0 items-center gap-2.5 text-sm font-medium hover:underline";
    return row.card ? (
        <Link className={style} params={{ accountId: row.account.id }} to="/accounts/$accountId">
            {name}
        </Link>
    ) : (
        <Link className={style} params={{ accountId: row.account.id }} to="/debts/$accountId">
            {name}
        </Link>
    );
}

function Row({ row }: { row: DebtRow }) {
    const { money } = useDisplayFormat();
    const date = useDateFormat();
    const planText = usePlanText();
    return (
        <Table.Row>
            <Cell className="w-[280px] max-w-[280px]">
                <NameCell row={row} />
            </Cell>
            <Cell className="dash-figure text-muted-foreground w-[160px] text-[13px]">{date.day(row.lastDay)}</Cell>
            <Cell className="text-muted-foreground text-[13px]">{planText(row)}</Cell>
            <Cell className="w-[150px]">
                <span className="flex items-center justify-end gap-3">
                    <span className="dash-figure text-sm font-medium">{money(row.amount, row.account.currency)}</span>
                    <DebtMenu row={row} />
                </span>
            </Cell>
        </Table.Row>
    );
}

function Group({ rows, title, total }: { rows: readonly DebtRow[]; title: ReactNode; total: number }) {
    const { ledger } = useDashboard();
    const { money } = useDisplayFormat();
    if (rows.length === 0) {
        return null;
    }
    return (
        <>
            <Table.Row className="bg-foreground/[0.016] hover:bg-foreground/[0.016]">
                <Table.Cell className="text-muted-foreground h-8 py-0 text-xs font-medium" colSpan={3}>
                    {title}
                </Table.Cell>
                <Table.Cell align="end" className="dash-figure text-muted-foreground h-8 py-0 text-xs font-medium">
                    {money(total, ledger.currency)}
                </Table.Cell>
            </Table.Row>
            {rows.map((row) => (
                <Row key={row.account.id} row={row} />
            ))}
        </>
    );
}

function TabBar({ counts, onTab, tab }: { counts: Record<Tab, number | null>; onTab: (tab: Tab) => void; tab: Tab }) {
    const { tabs } = useIntlayer("dashboard-debts");
    return (
        <Tabs onValueChange={(next: Tab) => onTab(next)} value={tab} variant="underline">
            <Tabs.List aria-label={tabs.all.value} className="max-w-full overflow-x-auto">
                {TABS.map((each) => (
                    <Tabs.Trigger key={each} value={each}>
                        {tabs[each]}
                        {counts[each] === null ? null : (
                            <span className="dash-figure text-muted-foreground ml-1 text-xs">{counts[each]}</span>
                        )}
                    </Tabs.Trigger>
                ))}
            </Tabs.List>
        </Tabs>
    );
}

function tabCounts(model: DebtsModel): Record<Tab, number | null> {
    return {
        all: null,
        owesYou: model.owesYou.length,
        settled: model.settled.length,
        youOwe: model.youOwe.length + model.cards.length,
    };
}

function DebtsTable({ model }: { model: DebtsModel }) {
    const { columns, groups, kpi } = useIntlayer("dashboard-debts");
    const [tab, setTab] = useState<Tab>("all");
    const shows = (group: Tab) => tab === "all" || tab === group;
    return (
        <Frame className="mt-3 min-w-0 flex-1">
            <Frame.Header className="pb-0">
                <TabBar counts={tabCounts(model)} onTab={setTab} tab={tab} />
            </Frame.Header>
            <Frame.Panel className="flex-1 p-0">
                <DataTable
                    head={[columns.name, columns.last, columns.plan, columns.balance]}
                    numbers={0}
                    phoneHidden={[2, 3]}
                >
                    {shows("owesYou") ? (
                        <Group rows={model.owesYou} title={kpi.owesYou} total={model.totals.owesYou} />
                    ) : null}
                    {shows("youOwe") ? (
                        <>
                            <Group rows={model.youOwe} title={kpi.youOwe} total={model.totals.youOwe} />
                            <Group rows={model.cards} title={kpi.cards} total={model.totals.cards} />
                        </>
                    ) : null}
                    {shows("settled") ? (
                        <Group rows={model.settled} title={groups.settled({ count: model.settled.length })} total={0} />
                    ) : null}
                </DataTable>
            </Frame.Panel>
        </Frame>
    );
}

const GHOST_ROWS = [
    [80, 64, 238, 72],
    [46, 52, 238, 68],
    [92, 72, 238, 58],
    [62, 70, 238, 56],
    [88, 64, 238, 54],
    [76, 70, 238, 66],
    [78, 76, 238, 70],
] as const;

const pill = (width: number) => <i className="border-app-strong block h-2 rounded-full border" style={{ width }} />;

const GHOST_GRID = "grid grid-cols-[minmax(0,336px)_minmax(0,268px)_minmax(0,1fr)_auto] items-center px-4";

function EmptyDebts() {
    const { empty, newDebt } = useIntlayer("dashboard-debts");
    const { open } = useDebtFlows();
    return (
        <>
            <div aria-hidden className="[mask-image:linear-gradient(to_bottom,black_70%,transparent)]">
                <div className={`${GHOST_GRID} h-[50px] border-b`}>
                    {[52, 48, 46, 40].map((width, index) => (
                        <span className={index === 3 ? "justify-self-end" : ""} key={width}>
                            {pill(width)}
                        </span>
                    ))}
                </div>
                {GHOST_ROWS.map(([name, last, plan, balance]) => (
                    <div className={`${GHOST_GRID} h-[42px] border-b last:border-0`} key={`${name}-${balance}`}>
                        <span className="flex items-center gap-2.5">
                            <i className="border-app-strong block size-7 rounded-lg border" />
                            {pill(name)}
                        </span>
                        {pill(last)}
                        {pill(plan)}
                        <span className="justify-self-end">{pill(balance)}</span>
                    </div>
                ))}
            </div>
            <div className="flex flex-col items-center gap-1.5 px-6 pt-6 pb-10 text-center">
                <b className="text-[15px] leading-[22px] font-semibold">{empty.title}</b>
                <p className="text-muted-foreground max-w-[320px] text-[13px] leading-5">{empty.line}</p>
                <Button className="mt-2.5" onClick={() => open({ kind: "new", personId: null, verb: "borrowed" })}>
                    <Glyph icon={Add01Icon} size={16} />
                    {newDebt}
                </Button>
            </div>
        </>
    );
}

function EmptyCard({ model }: { model: DebtsModel }) {
    const [tab, setTab] = useState<Tab>("all");
    return (
        <Frame className="mt-3 min-w-0 flex-1">
            <Frame.Header className="pb-0">
                <TabBar counts={tabCounts(model)} onTab={setTab} tab={tab} />
            </Frame.Header>
            <Frame.Panel className="flex-1 p-0">
                <EmptyDebts />
            </Frame.Panel>
        </Frame>
    );
}

function DebtsList() {
    const { newDebt, somethingIOwe, title } = useIntlayer("dashboard-debts");
    const { model } = useDebts();
    const { restoring } = useDashboard();
    const { open } = useDebtFlows();
    const empty = model.owesYou.length + model.youOwe.length + model.settled.length + model.cards.length === 0;
    if (empty && restoring) {
        return (
            <Restoring>
                <DebtsList />
            </Restoring>
        );
    }
    return (
        <main className="@container flex min-h-full min-w-0 flex-col px-4 pb-5 sm:px-6">
            <AccountsBar title={title}>
                <Button onClick={() => open({ kind: "owe" })} variant="outline">
                    <Glyph icon={Add01Icon} size={16} />
                    {somethingIOwe}
                </Button>
                <Button onClick={() => open({ kind: "new", personId: null, verb: "borrowed" })}>
                    <Glyph icon={Add01Icon} size={16} />
                    {newDebt}
                </Button>
            </AccountsBar>
            <Kpis model={model} />
            {model.due ? <DueStrip due={model.due} /> : null}
            {empty ? <EmptyCard model={model} /> : <DebtsTable model={model} />}
        </main>
    );
}

export function DebtsScreen() {
    return (
        <DebtFlowsProvider>
            <DebtsList />
        </DebtFlowsProvider>
    );
}
