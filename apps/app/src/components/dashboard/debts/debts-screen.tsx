import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import Calendar01Icon from "@hugeicons/core-free-icons/Calendar01Icon";
import UserGroupIcon from "@hugeicons/core-free-icons/UserGroupIcon";
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
import { Empty } from "@/components/dashboard/home/empty";
import { useDateFormat } from "@/components/dashboard/home/format";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useDisplayFormat } from "@/lib/ledger-settings";
import { viewTransition } from "@/lib/motion";

import { DebtFlowsProvider } from "./debt-flows";
import { useDebtFlows } from "./flow-context";
import { DUE_DAYS } from "./model";
import type { DebtRow, DebtsModel } from "./model";
import { BehindBadge, DebtMenu, PersonTile, usePlanText, useDebts } from "./parts";

type Tab = "all" | "owesYou" | "settled" | "youOwe";

const TABS: readonly Tab[] = ["all", "owesYou", "youOwe", "settled"];

const quiet = (children: ReactNode) => (
    <span className="text-muted-foreground text-app-caption min-w-0 truncate leading-5">{children}</span>
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
        <div className="bg-card rounded-app-lg text-app-label mt-3 flex min-h-11 flex-wrap items-center gap-x-2.5 gap-y-1 border py-1.5 ps-3.5 pe-1.5">
            <Glyph icon={Calendar01Icon} className="text-muted-foreground" size={16} />
            <span>{copy.title({ days: DUE_DAYS })}</span>
            <span className="dash-figure">{money(due.total, ledger.currency)}</span>
            <span className="text-muted-foreground min-w-0 flex-1 truncate">{summary}</span>
            <Button
                nativeButton={false}
                render={<Link to="/installments" viewTransition={viewTransition("push-left")} />}
                size="sm"
                variant="outline"
            >
                {copy.open}
            </Button>
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
    const style = "text-app-body flex min-w-0 items-center gap-2.5 font-medium hover:underline";
    const push = viewTransition("push-left");
    return row.card ? (
        <Link className={style} params={{ accountId: row.account.id }} to="/accounts/$accountId" viewTransition={push}>
            {name}
        </Link>
    ) : (
        <Link className={style} params={{ accountId: row.account.id }} to="/debts/$accountId" viewTransition={push}>
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
            <Cell className="w-70 max-w-70">
                <NameCell row={row} />
            </Cell>
            <Cell className="dash-figure text-muted-foreground text-app-label w-40">{date.day(row.lastDay)}</Cell>
            <Cell className="text-muted-foreground text-app-label">{planText(row)}</Cell>
            <Cell className="w-37.5">
                <span className="flex items-center justify-end gap-3">
                    <span className="dash-figure text-app-body font-medium">
                        {money(row.amount, row.account.currency)}
                    </span>
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
            <Table.Row className="bg-app-hover hover:bg-app-hover">
                <Table.Cell className="text-muted-foreground text-app-caption h-8 py-0 font-medium" colSpan={3}>
                    {title}
                </Table.Cell>
                <Table.Cell
                    align="end"
                    className="dash-figure text-muted-foreground text-app-caption h-8 py-0 font-medium"
                >
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
                            <span className="dash-figure text-muted-foreground text-app-caption ml-1">
                                {counts[each]}
                            </span>
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
                <div data-motion="dissolve" key={tab}>
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
                            <Group
                                rows={model.settled}
                                title={groups.settled({ count: model.settled.length })}
                                total={0}
                            />
                        ) : null}
                    </DataTable>
                </div>
            </Frame.Panel>
        </Frame>
    );
}

function EmptyDebts() {
    const { empty, newDebt } = useIntlayer("dashboard-debts");
    const { open } = useDebtFlows();
    return (
        <Empty
            action={
                <Button onClick={() => open({ kind: "new", personId: null, verb: "borrowed" })}>
                    <Glyph icon={Add01Icon} size={16} />
                    {newDebt}
                </Button>
            }
            icon={UserGroupIcon}
            line={empty.line}
            title={empty.title}
        />
    );
}

function EmptyCard({ model }: { model: DebtsModel }) {
    const [tab, setTab] = useState<Tab>("all");
    return (
        <Frame className="mt-3 min-w-0 flex-1">
            <Frame.Header className="pb-0">
                <TabBar counts={tabCounts(model)} onTab={setTab} tab={tab} />
            </Frame.Header>
            <Frame.Panel className="flex flex-1 flex-col p-0">
                <EmptyDebts />
            </Frame.Panel>
        </Frame>
    );
}

function DebtsList() {
    const { newDebt, somethingIOwe, title } = useIntlayer("dashboard-debts");
    const { model } = useDebts();
    const { open } = useDebtFlows();
    const empty = model.owesYou.length + model.youOwe.length + model.settled.length + model.cards.length === 0;
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
