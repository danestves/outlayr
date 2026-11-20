import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import ImageAdd01Icon from "@hugeicons/core-free-icons/ImageAdd01Icon";
import Invoice01Icon from "@hugeicons/core-free-icons/Invoice01Icon";
import { decimalsFor } from "@outlayr/money/currency";
import { roundMoney } from "@outlayr/money/round";
import { Link } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import { Frame } from "panelui-web/frame";
import { Select } from "panelui-web/select";
import { Table } from "panelui-web/table";
import { Tabs } from "panelui-web/tabs";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { AccountsBar, Card, Cell, DataTable, MUTED } from "@/components/dashboard/accounts/accounts-screen";
import { useAccountFlows } from "@/components/dashboard/accounts/flows";
import { Glyph } from "@/components/dashboard/accounts/glyph";
import { inMain } from "@/components/dashboard/accounts/model";
import { KpiBand, KpiCell } from "@/components/dashboard/accounts/parts";
import { useGoalMoney } from "@/components/dashboard/goals/parts";
import { Empty } from "@/components/dashboard/home/empty";
import { useDateFormat } from "@/components/dashboard/home/format";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { AccountTile } from "@/components/ledger/tiles";
import { viewTransition } from "@/lib/motion";

import { InstallmentFlowsProvider } from "./installment-flows";
import { installmentsSummary, planViews } from "./model";
import type { InstallmentsSummary, PlanView } from "./model";
import { BADGE, OrderTile, OverdueBadge, PlanBar, PlanMenu, useDueText, usePlanTerms, useRowLabel } from "./parts";

type Tab = "orders" | "paidOff";

const ALL = "all";
const POPUP = "app-shell z-60";

function useModel() {
    const { ledger } = useDashboard();
    return useMemo(() => {
        const views = planViews(ledger);
        return { summary: installmentsSummary(ledger, views), views };
    }, [ledger]);
}

const quiet = (children: ReactNode) => (
    <span className="text-muted-foreground text-app-label min-w-0 truncate leading-5">{children}</span>
);

const tone = (amount: number) => (amount === 0 ? "text-muted-foreground" : "");

function Kpis({ summary }: { summary: InstallmentsSummary }) {
    const { ledger } = useDashboard();
    const { kpi } = useIntlayer("dashboard-installments");
    const format = useGoalMoney();
    const date = useDateFormat();
    const { active, left, overdue, paid, scheduled, soon } = summary;
    const money = (amount: number) => format(amount, ledger.currency);
    const orders = active.length === 1 ? kpi.ordersOne : kpi.orders({ count: active.length });
    const payments = soon.rows.length === 1 ? kpi.paymentsOne : kpi.payments({ count: soon.rows.length });
    const [late, ...more] = overdue?.plans ?? [];
    return (
        <KpiBand>
            <KpiCell color={MUTED} loose label={kpi.leftToPay} tone={tone(left)} value={money(left)}>
                {quiet(orders)}
            </KpiCell>
            <KpiCell color={MUTED} loose label={kpi.next30} tone={tone(soon.amount)} value={money(soon.amount)}>
                {quiet(payments)}
            </KpiCell>
            <KpiCell
                color={MUTED}
                loose
                label={kpi.overdue}
                tone={tone(overdue?.amount ?? 0)}
                value={money(overdue?.amount ?? 0)}
            >
                {overdue && late ? (
                    <span className="flex min-w-0 items-center gap-2">
                        <OverdueBadge>{kpi.since({ date: date.day(overdue.since) })}</OverdueBadge>
                        {quiet(more.length > 0 ? kpi.overdueMore({ count: more.length, name: late.name }) : late.name)}
                    </span>
                ) : (
                    quiet(kpi.nothingOverdue)
                )}
            </KpiCell>
            <KpiCell color={MUTED} loose label={kpi.paidSoFar} tone={tone(paid)} value={money(paid)}>
                {quiet(kpi.ofTotal({ amount: money(scheduled) }))}
            </KpiCell>
        </KpiBand>
    );
}

function OrderLink({ view }: { view: PlanView }) {
    return (
        <Link
            className="text-app-body flex max-w-34 min-w-0 items-center gap-2.5 font-medium hover:underline sm:max-w-none"
            params={{ planId: view.id }}
            to="/installments/$planId"
            viewTransition={viewTransition("push-left")}
        >
            <OrderTile look={view.look} />
            <span className="truncate">{view.name}</span>
        </Link>
    );
}

const SOFT = "dash-figure text-muted-foreground text-app-label";

function OrdersTable({ views }: { views: readonly PlanView[] }) {
    const { columns, progress } = useIntlayer("dashboard-installments");
    const format = useGoalMoney();
    const terms = usePlanTerms();
    const due = useDueText();
    return (
        <DataTable
            density="comfortable"
            head={[columns.order, columns.plan, columns.progress, columns.next, columns.leftToPay]}
            numbers={0}
            phoneHidden={[2, 3]}
        >
            {views.map((view) => (
                <Table.Row key={view.id}>
                    <Cell>
                        <OrderLink view={view} />
                    </Cell>
                    <Cell className={SOFT}>{terms(view)}</Cell>
                    <Cell className="w-50">
                        <span className="flex items-center gap-2.5">
                            <PlanBar className="w-34.5" view={view} />
                            <span className="dash-figure text-muted-foreground text-app-caption">
                                {progress({ count: view.count, paid: view.paidCount })}
                            </span>
                        </span>
                    </Cell>
                    <Cell>
                        {view.next?.overdue ? (
                            <OverdueBadge />
                        ) : (
                            <span className={SOFT}>{view.next ? due(view.next.day) : "–"}</span>
                        )}
                    </Cell>
                    <Cell>
                        <span className="flex items-center justify-end gap-3">
                            <span className="dash-figure text-app-body font-medium">
                                {format(view.left, view.currency)}
                            </span>
                            <PlanMenu view={view} />
                        </span>
                    </Cell>
                </Table.Row>
            ))}
        </DataTable>
    );
}

function AccountName({ view }: { view: PlanView }) {
    return (
        <span className="text-app-label flex min-w-0 items-center gap-2">
            <AccountTile account={view.account.look} size="sm" />
            <span className="truncate">{view.account.name}</span>
        </span>
    );
}

function PaidOffTable({ views }: { views: readonly PlanView[] }) {
    const { columns } = useIntlayer("dashboard-installments");
    const format = useGoalMoney();
    const terms = usePlanTerms();
    const due = useDueText();
    return (
        <DataTable
            density="comfortable"
            head={[columns.order, columns.plan, columns.account, columns.paidOff, columns.price]}
            numbers={0}
            phoneHidden={[2, 3]}
        >
            {views.map((view) => (
                <Table.Row key={view.id}>
                    <Cell>
                        <OrderLink view={view} />
                    </Cell>
                    <Cell className={SOFT}>{terms(view)}</Cell>
                    <Cell>
                        <AccountName view={view} />
                    </Cell>
                    <Cell>
                        {view.paidOff ? (
                            <span className={`${BADGE} bg-app-income/14 text-app-income inline-flex items-center`}>
                                {due(view.paidOff)}
                            </span>
                        ) : null}
                    </Cell>
                    <Cell figure>{format(view.price, view.currency)}</Cell>
                </Table.Row>
            ))}
        </DataTable>
    );
}

function AccountFilter({
    onPick,
    value,
    views,
}: {
    onPick: (id: string) => void;
    value: string;
    views: readonly PlanView[];
}) {
    const { tabs } = useIntlayer("dashboard-installments");
    const accounts = [...new Map(views.map((view) => [view.account.id, view.account])).values()];
    const picked = accounts.find((account) => account.id === value);
    const items = [
        { label: tabs.allAccounts.value, value: ALL },
        ...accounts.map((account) => ({ label: account.name, value: account.id })),
    ];
    return (
        <Select items={items} onValueChange={(next) => next !== null && onPick(next)} value={picked ? value : ALL}>
            <Select.Trigger aria-label={tabs.allAccounts.value} className="text-app-label! w-auto gap-2" size="sm">
                {picked ? <AccountTile account={picked.look} size="sm" /> : null}
                <Select.Value />
            </Select.Trigger>
            <Select.Content align="end" className={POPUP}>
                <Select.Item value={ALL}>{tabs.allAccounts}</Select.Item>
                <Select.Separator />
                {accounts.map((account) => (
                    <Select.Item
                        icon={<AccountTile account={account.look} size="sm" />}
                        key={account.id}
                        value={account.id}
                    >
                        {account.name}
                    </Select.Item>
                ))}
            </Select.Content>
        </Select>
    );
}

function ImportButton() {
    const { importScreenshot } = useIntlayer("dashboard-installments");
    const { open } = useAccountFlows();
    return (
        <Button onClick={() => open({ kind: "scan" })} variant="outline">
            <Glyph icon={ImageAdd01Icon} className="text-muted-foreground" size={16} />
            {importScreenshot}
        </Button>
    );
}

function NewPurchase() {
    const { newPurchase } = useIntlayer("dashboard-installments");
    const { open } = useAccountFlows();
    return (
        <Button onClick={() => open({ kind: "purchase" })}>
            <Glyph icon={Add01Icon} size={16} />
            {newPurchase}
        </Button>
    );
}

function EmptyOrders() {
    const { empty } = useIntlayer("dashboard-installments");
    return (
        <Empty
            action={
                <>
                    <ImportButton />
                    <NewPurchase />
                </>
            }
            icon={Invoice01Icon}
            line={empty.line}
            title={empty.title}
        />
    );
}

const count = (value: number) => <span className="dash-figure text-muted-foreground text-app-caption">{value}</span>;

function OrdersCard({
    accountId,
    onAccount,
    onTab,
    summary,
    tab,
}: {
    accountId: string;
    onAccount: (id: string) => void;
    onTab: (tab: Tab) => void;
    summary: InstallmentsSummary;
    tab: Tab;
}) {
    const { paidOffCount, tabs } = useIntlayer("dashboard-installments");
    const { ledger } = useDashboard();
    const format = useGoalMoney();
    const { active, paidOff } = summary;
    const all = [...active, ...paidOff];
    const empty = all.length === 0;
    const mine = (view: PlanView) => accountId === ALL || view.account.id === accountId;
    const shownOff = paidOff.filter(mine);
    const priced = shownOff.reduce((sum, view) => sum + view.price, 0);
    const oneCurrency = shownOff.every((view) => view.currency === shownOff[0]?.currency);
    return (
        <Tabs
            className={`min-w-0 ${tab === "paidOff" || empty ? "flex flex-1 flex-col" : ""}`}
            onValueChange={onTab}
            value={tab}
            variant="underline"
        >
            <Frame className="min-w-0 flex-1">
                <div className="relative flex h-10 items-center gap-3">
                    <Tabs.List aria-label={tabs.orders.value} className="h-10 self-end">
                        <Tabs.Trigger value="orders">
                            {tabs.orders}
                            {count(active.length)}
                        </Tabs.Trigger>
                        <Tabs.Trigger value="paidOff">
                            {tabs.paidOff}
                            {count(paidOff.length)}
                        </Tabs.Trigger>
                    </Tabs.List>
                    {empty ? null : (
                        <span className="absolute end-1 top-1 z-10">
                            <AccountFilter onPick={onAccount} value={accountId} views={all} />
                        </span>
                    )}
                </div>
                <Frame.Panel className="relative flex flex-1 flex-col">
                    {empty ? (
                        <EmptyOrders />
                    ) : (
                        <>
                            <Tabs.Content data-motion="dissolve" value="orders">
                                <OrdersTable views={active.filter(mine)} />
                            </Tabs.Content>
                            <Tabs.Content className="flex flex-1 flex-col" data-motion="dissolve" value="paidOff">
                                <div className="flex-1">
                                    <PaidOffTable views={shownOff} />
                                </div>
                                {shownOff.length > 0 ? (
                                    <div className="text-app-label flex h-12 items-center justify-between px-4">
                                        <span className="text-muted-foreground">
                                            {paidOffCount({ count: shownOff.length })}
                                        </span>
                                        {oneCurrency ? (
                                            <span className="dash-figure">
                                                {format(priced, shownOff[0]?.currency ?? ledger.currency)}
                                            </span>
                                        ) : null}
                                    </div>
                                ) : null}
                            </Tabs.Content>
                        </>
                    )}
                </Frame.Panel>
            </Frame>
        </Tabs>
    );
}

function ComingUpCard({ accountId, summary }: { accountId: string; summary: InstallmentsSummary }) {
    const { ledger } = useDashboard();
    const { columns, comingUp } = useIntlayer("dashboard-installments");
    const format = useGoalMoney();
    const due = useDueText();
    const label = useRowLabel();
    const rows =
        accountId === ALL ? summary.soon.rows : summary.soon.rows.filter(({ plan }) => plan.account.id === accountId);
    if (rows.length === 0) {
        return null;
    }
    const total =
        accountId === ALL
            ? summary.soon.amount
            : roundMoney(
                  rows.reduce((sum, { plan, row }) => sum + inMain(ledger, row.remaining, plan.currency).value, 0),
                  decimalsFor(ledger.currency)
              );
    return (
        <Card aside={format(total, ledger.currency)} className="flex-1" title={comingUp}>
            <DataTable
                density="comfortable"
                head={[columns.date, columns.order, columns.installment, columns.amount]}
                numbers={0}
                phoneHidden={[3]}
            >
                {rows.map(({ plan, row }) => (
                    <Table.Row key={row.id}>
                        <Cell
                            className={`dash-figure text-app-label ${row.overdue ? "text-destructive" : "text-muted-foreground"}`}
                        >
                            {due(row.day)}
                        </Cell>
                        <Cell className="text-app-label">
                            <Link
                                className="hover:underline"
                                params={{ planId: plan.id }}
                                to="/installments/$planId"
                                viewTransition={viewTransition("push-left")}
                            >
                                {plan.name}
                            </Link>
                        </Cell>
                        <Cell className="text-muted-foreground text-app-label">{label(plan, row)}</Cell>
                        <Cell figure>{format(row.remaining, plan.currency)}</Cell>
                    </Table.Row>
                ))}
            </DataTable>
        </Card>
    );
}

function InstallmentsList() {
    const { title } = useIntlayer("dashboard-installments");
    const { summary, views } = useModel();
    const empty = views.length === 0;
    const [accountId, setAccountId] = useState(ALL);
    const [tab, setTab] = useState<Tab>(
        summary.active.length === 0 && summary.paidOff.length > 0 ? "paidOff" : "orders"
    );
    return (
        <main className="@container flex min-h-full min-w-0 flex-col px-4 pb-5 sm:px-6">
            <AccountsBar title={title}>
                {empty ? null : <ImportButton />}
                <NewPurchase />
            </AccountsBar>
            <Kpis summary={summary} />
            <div className="mt-4 flex flex-1 flex-col gap-4">
                <OrdersCard
                    accountId={accountId}
                    key={empty ? "empty" : "orders"}
                    onAccount={setAccountId}
                    onTab={setTab}
                    summary={summary}
                    tab={tab}
                />
                {empty || tab === "paidOff" ? null : <ComingUpCard accountId={accountId} summary={summary} />}
            </div>
        </main>
    );
}

export function InstallmentsScreen() {
    return (
        <InstallmentFlowsProvider>
            <InstallmentsList />
        </InstallmentFlowsProvider>
    );
}
