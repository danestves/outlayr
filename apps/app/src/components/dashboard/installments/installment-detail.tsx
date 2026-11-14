import ArrowLeft02Icon from "@hugeicons/core-free-icons/ArrowLeft02Icon";
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import Delete02Icon from "@hugeicons/core-free-icons/Delete02Icon";
import LinkSquare02Icon from "@hugeicons/core-free-icons/LinkSquare02Icon";
import MoreVerticalIcon from "@hugeicons/core-free-icons/MoreVerticalIcon";
import PencilEdit01Icon from "@hugeicons/core-free-icons/PencilEdit01Icon";
import { Link, useNavigate } from "@tanstack/react-router";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { Menu } from "panelui-web/menu";
import { Table } from "panelui-web/table";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { AccountsBar, Card, Cell, DataTable, MUTED } from "@/components/dashboard/accounts/accounts-screen";
import { Glyph } from "@/components/dashboard/accounts/glyph";
import { KpiBand, KpiCell } from "@/components/dashboard/accounts/parts";
import { useGoalMoney } from "@/components/dashboard/goals/parts";
import { titled, useDateFormat } from "@/components/dashboard/home/format";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { Restoring } from "@/components/dashboard/shell/sampled";
import { AccountTile } from "@/components/ledger/tiles";
import { daysBetween } from "@/lib/ledger";

import { useInstallmentFlows } from "./flow-context";
import { useDeleteInstallment } from "./installment-dialogs";
import { InstallmentFlowsProvider } from "./installment-flows";
import { openRows, planById, planViews } from "./model";
import type { InstallmentView, PlanView } from "./model";
import { BADGE, OverdueBadge, PlanBar, RowStatus, useCadenceText, useDueText, useRowLabel } from "./parts";

const BAR_MENU_OVERHANG = -23;

function usePlan(planId: string) {
    const { ledger } = useDashboard();
    return useMemo(() => planById(planViews(ledger), planId), [ledger, planId]);
}

function PaidOffBadge({ view }: { view: PlanView }) {
    const { detail } = useIntlayer("dashboard-installments");
    const due = useDueText();
    return (
        <Badge className={BADGE} variant="success">
            {view.paidOff ? detail.paidOffOn({ date: due(view.paidOff) }) : detail.paid}
        </Badge>
    );
}

function DetailBar({ view }: { view: PlanView }) {
    const { back, menu, title } = useIntlayer("dashboard-installments");
    const { open } = useInstallmentFlows();
    const format = useGoalMoney();
    const navigate = useNavigate();
    const { next } = view;
    return (
        <AccountsBar
            title={
                <span className="flex min-w-0 items-center gap-2">
                    <Button
                        aria-label={back.value}
                        className="text-muted-foreground -ms-1.5 size-[30px]"
                        nativeButton={false}
                        render={<Link to="/installments" />}
                        size="icon"
                        variant="ghost"
                    >
                        <Glyph icon={ArrowLeft02Icon} size={18} />
                    </Button>
                    <Link className="text-muted-foreground hover:text-foreground font-medium" to="/installments">
                        {title}
                    </Link>
                    <Glyph icon={ArrowRight01Icon} className="text-muted-foreground flex-none" size={14} />
                    <span className="truncate">{view.name}</span>
                </span>
            }
        >
            {view.finished || !next ? (
                <PaidOffBadge view={view} />
            ) : (
                <>
                    {view.left > next.remaining ? (
                        <Button
                            className="max-sm:hidden"
                            onClick={() => open({ kind: "payAll", planId: view.id })}
                            variant="outline"
                        >
                            {menu.payAll({ amount: format(view.left, view.currency) })}
                        </Button>
                    ) : null}
                    <Button onClick={() => open({ kind: "pay", planId: view.id })}>
                        {menu.pay({ amount: format(next.remaining, view.currency) })}
                    </Button>
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
                            className="app-shell ph-no-capture w-[220px]"
                            sideOffset={4}
                        >
                            {view.left > next.remaining ? (
                                <Menu.Item
                                    className="sm:hidden"
                                    onClick={() => open({ kind: "payAll", planId: view.id })}
                                >
                                    {menu.payAll({ amount: format(view.left, view.currency) })}
                                </Menu.Item>
                            ) : null}
                            <Menu.Item
                                onClick={() =>
                                    navigate({ params: { accountId: view.account.id }, to: "/accounts/$accountId" })
                                }
                            >
                                <Glyph icon={LinkSquare02Icon} size={16} />
                                {menu.openAccount({ name: view.account.name })}
                            </Menu.Item>
                            <Menu.Separator />
                            <Menu.Item
                                onClick={() => open({ kind: "deletePending", planId: view.id })}
                                variant="destructive"
                            >
                                <Glyph icon={Delete02Icon} size={16} />
                                {menu.deletePending}
                            </Menu.Item>
                        </Menu.Content>
                    </Menu>
                </>
            )}
        </AccountsBar>
    );
}

const note = (children: ReactNode) => (
    <span className="text-muted-foreground min-w-0 truncate text-[13px] leading-5">{children}</span>
);

function NextCell({ view }: { view: PlanView }) {
    const { detail, kpi } = useIntlayer("dashboard-installments");
    const { today } = useDashboard().ledger;
    const format = useGoalMoney();
    const date = useDateFormat();
    const due = useDueText();
    const cadence = useCadenceText();
    const { next, overdue } = view;
    if (overdue) {
        return (
            <KpiCell color={MUTED} loose label={kpi.overdue} value={format(overdue.amount, view.currency)}>
                <OverdueBadge>{kpi.since({ date: date.day(overdue.since) })}</OverdueBadge>
            </KpiCell>
        );
    }
    if (!next) {
        const terms =
            view.each === null ? null : detail.terms({ cadence: cadence(view.cadence) ?? "", count: view.count });
        return (
            <KpiCell color={MUTED} loose label={detail.plan} value={format(view.each ?? view.scheduled, view.currency)}>
                {note(terms)}
            </KpiCell>
        );
    }
    const days = daysBetween(today, next.day);
    let when: ReactNode = detail.nextIn({ count: days, date: due(next.day) });
    if (days === 0) {
        when = detail.nextToday({ date: due(next.day) });
    } else if (days === 1) {
        when = detail.nextTomorrow({ date: due(next.day) });
    }
    return (
        <KpiCell color={MUTED} loose label={detail.next} value={format(next.remaining, view.currency)}>
            {note(when)}
        </KpiCell>
    );
}

function Kpis({ view }: { view: PlanView }) {
    const { columns, detail, kpi, progress } = useIntlayer("dashboard-installments");
    const { photos } = useDashboard();
    const { locale } = useLocale();
    const format = useGoalMoney();
    const due = useDueText();
    const cadence = useCadenceText();
    const open = openRows(view).length;
    let left: ReactNode = detail.installmentsLeft({ count: open });
    if (open === 0) {
        left = detail.nothingLeft;
    } else if (open === 1) {
        left = detail.installmentsLeftOne;
    }
    const every = view.finished ? null : cadence(view.cadence);
    return (
        <KpiBand>
            <KpiCell
                loose
                color={MUTED}
                label={kpi.leftToPay}
                tone={view.left === 0 ? "text-muted-foreground" : ""}
                value={format(view.left, view.currency)}
            >
                {note(left)}
            </KpiCell>
            <KpiCell color={MUTED} loose label={detail.paid} value={format(view.paid, view.currency)}>
                {note(progress({ count: view.count, paid: view.paidCount }))}
            </KpiCell>
            <NextCell view={view} />
            <KpiCell
                loose
                color={MUTED}
                label={view.purchaseDay ? detail.boughtFor({ date: due(view.purchaseDay) }) : columns.price}
                value={format(view.price, view.currency)}
            >
                <span className="flex min-w-0 items-center gap-2">
                    <AccountTile account={view.account.look} photos={photos} size="xs" />
                    {note(every ? `${view.account.name} · ${titled(every, locale)}` : view.account.name)}
                </span>
            </KpiCell>
        </KpiBand>
    );
}

function RowMenu({ item, view }: { item: InstallmentView; view: PlanView }) {
    const { menu } = useIntlayer("dashboard-installments");
    const { open } = useInstallmentFlows();
    const remove = useDeleteInstallment();
    const label = useRowLabel();
    return (
        <Menu>
            <Menu.Trigger
                aria-label={menu.more({ name: label(view, item) }).value}
                render={
                    <Button className="text-muted-foreground -mx-2 -my-1 size-[26px]" size="icon-sm" variant="ghost" />
                }
            >
                <Glyph icon={MoreVerticalIcon} size={17} />
            </Menu.Trigger>
            <Menu.Content align="end" alignOffset={-4} className="app-shell ph-no-capture w-[200px]" sideOffset={4}>
                <Menu.Item onClick={() => open({ installmentId: item.id, kind: "edit", planId: view.id })}>
                    <Glyph icon={PencilEdit01Icon} size={16} />
                    {menu.edit}
                </Menu.Item>
                {item.status === "paid" ? null : (
                    <>
                        <Menu.Separator />
                        <Menu.Item onClick={() => remove(view, item)} variant="destructive">
                            <Glyph icon={Delete02Icon} size={16} />
                            {menu.deleteInstallment}
                        </Menu.Item>
                    </>
                )}
            </Menu.Content>
        </Menu>
    );
}

function PaidFrom({ item }: { item: InstallmentView }) {
    const { ledger } = useDashboard();
    const { detail } = useIntlayer("dashboard-installments");
    if (item.status !== "paid") {
        return null;
    }
    if (item.paidFrom === null) {
        return detail.outside;
    }
    return ledger.books.accounts.find((row) => row.localId === item.paidFrom)?.name ?? null;
}

function Schedule({ view }: { view: PlanView }) {
    const { columns, detail } = useIntlayer("dashboard-installments");
    const format = useGoalMoney();
    const due = useDueText();
    const label = useRowLabel();
    const rows = view.rows.toSorted((a, b) => a.sequence - b.sequence);
    return (
        <Card
            action={<PlanBar className="w-[200px] max-sm:w-[120px]" view={view} />}
            className="flex-1"
            count={rows.length}
            title={detail.schedule}
        >
            <DataTable
                density="comfortable"
                head={[
                    columns.installment,
                    columns.due,
                    columns.status,
                    columns.paidFrom,
                    columns.amount,
                    columns.leftAfter,
                ]}
                phoneHidden={[2, 4, 5]}
            >
                {rows.map((item) => {
                    const muted = item.status === "paid" && !view.finished;
                    return (
                        <Table.Row className={muted ? "text-muted-foreground" : ""} key={item.id}>
                            <Cell>{label(view, item)}</Cell>
                            <Cell className="dash-figure">{due(item.day)}</Cell>
                            <Cell>
                                <RowStatus item={item} next={item.id === view.next?.id} />
                            </Cell>
                            <Cell className="text-muted-foreground">
                                <PaidFrom item={item} />
                            </Cell>
                            <Cell className="font-normal" figure>
                                {format(item.owed, view.currency)}
                            </Cell>
                            <Cell>
                                <span className="flex items-center justify-end gap-3">
                                    <span className="dash-figure text-sm">{format(item.leftAfter, view.currency)}</span>
                                    {view.finished ? null : <RowMenu item={item} view={view} />}
                                </span>
                            </Cell>
                        </Table.Row>
                    );
                })}
            </DataTable>
        </Card>
    );
}

function NotFound() {
    const { back, detail, title } = useIntlayer("dashboard-installments");
    return (
        <main className="min-w-0 px-4 pb-5 sm:px-6">
            <AccountsBar title={title} />
            <p className="text-muted-foreground py-6 text-sm">
                {detail.notFound}{" "}
                <Link className="text-foreground underline" to="/installments">
                    {back}
                </Link>
            </p>
        </main>
    );
}

function SampleDetail() {
    const [first] = useDashboard().ledger.books.installmentPlans;
    return first ? <DetailPage planId={first.localId} /> : null;
}

function DetailPage({ planId }: { planId: string }) {
    const view = usePlan(planId);
    const { restoring } = useDashboard();
    if (!view && restoring) {
        return (
            <Restoring>
                <SampleDetail />
            </Restoring>
        );
    }
    if (!view) {
        return <NotFound />;
    }
    return (
        <main className="@container flex min-h-dvh min-w-0 flex-col px-4 pb-5 sm:px-6">
            <DetailBar view={view} />
            <div className="flex flex-1 flex-col gap-4">
                <Kpis view={view} />
                <Schedule view={view} />
            </div>
        </main>
    );
}

export function InstallmentDetail({ planId }: { planId: string }) {
    return (
        <InstallmentFlowsProvider>
            <DetailPage planId={planId} />
        </InstallmentFlowsProvider>
    );
}
