import ArrowDataTransferHorizontalIcon from "@hugeicons/core-free-icons/ArrowDataTransferHorizontalIcon";
import ArrowDown02Icon from "@hugeicons/core-free-icons/ArrowDown02Icon";
import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon";
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import ArrowUp02Icon from "@hugeicons/core-free-icons/ArrowUp02Icon";
import MoreVerticalIcon from "@hugeicons/core-free-icons/MoreVerticalIcon";
import { Link } from "@tanstack/react-router";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { Frame } from "panelui-web/frame";
import { Menu } from "panelui-web/menu";
import { Table } from "panelui-web/table";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { AccountsBar, Card, Cell, DataTable, MUTED } from "@/components/dashboard/accounts/accounts-screen";
import { Glyph } from "@/components/dashboard/accounts/glyph";
import type { AccountRow } from "@/components/dashboard/accounts/model";
import { KpiBand, KpiCell } from "@/components/dashboard/accounts/parts";
import { Empty } from "@/components/dashboard/home/empty";
import { useDateFormat } from "@/components/dashboard/home/format";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { AccountTile } from "@/components/ledger/tiles";
import { MenuContent } from "@/components/ui/menu-content";
import { useDisplayFormat } from "@/lib/ledger-settings";
import { viewTransition } from "@/lib/motion";

import { DebtFlowsProvider } from "./debt-flows";
import { useDebtFlows } from "./flow-context";
import type { DebtRow, Movement } from "./model";
import { BehindBadge, DetailMenuItems, OnTrackBadge, PayoffBar, liveLine, peopleOf, useDebts, useMoves } from "./parts";

const DAY_MS = 86_400_000;
const BAR_MENU_OVERHANG = -23;

const daysBetween = (from: string, to: string) =>
    Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);

const note = (children: ReactNode) => (
    <span className="text-muted-foreground text-app-caption min-w-0 truncate leading-5">{children}</span>
);

function useDetail(accountId: string) {
    const { model, rows } = useDebts();
    const row = peopleOf(model).find((each) => each.account.id === accountId) ?? null;
    return { accounts: rows, row };
}

function DetailBar({ row }: { row: DebtRow }) {
    const { actions, back, detail, title } = useIntlayer("dashboard-debts");
    const moves = useMoves(row);
    const settled = row.standing === "settled";
    return (
        <AccountsBar
            title={
                <span className="flex min-w-0 items-center gap-2">
                    <Button
                        aria-label={back.value}
                        className="text-muted-foreground -ms-1.5 size-7.5"
                        nativeButton={false}
                        render={<Link to="/debts" viewTransition={viewTransition("push-left", { back: true })} />}
                        size="icon"
                        variant="ghost"
                    >
                        <Glyph icon={ArrowLeft01Icon} size={16} />
                    </Button>
                    <Link
                        className="text-muted-foreground hover:text-foreground font-normal"
                        to="/debts"
                        viewTransition={viewTransition("push-left", { back: true })}
                    >
                        {title}
                    </Link>
                    <Glyph icon={ArrowRight01Icon} className="text-muted-foreground flex-none" size={14} />
                    <span className="truncate">{row.account.name}</span>
                    {settled ? (
                        <Badge className="text-app-caption! ms-1 h-5.5 rounded-md px-2 font-medium" variant="success">
                            {detail.settled}
                        </Badge>
                    ) : null}
                </span>
            }
        >
            {(settled ? moves : moves.toReversed()).map((move, index) => {
                const primary = !settled && index === moves.length - 1;
                return (
                    <Button
                        className={primary ? "" : "max-sm:hidden"}
                        key={move.label.value}
                        onClick={move.run}
                        variant={primary ? "default" : "outline"}
                    >
                        <Glyph icon={move.icon} className={primary ? "" : "text-muted-foreground"} size={16} />
                        {move.label}
                    </Button>
                );
            })}
            <Menu>
                <Menu.Trigger
                    aria-label={actions.more({ name: row.account.name }).value}
                    render={<Button size="icon" variant="outline" />}
                >
                    <Glyph icon={MoreVerticalIcon} className="text-muted-foreground" />
                </Menu.Trigger>
                <MenuContent align="end" alignOffset={BAR_MENU_OVERHANG} className="w-60" sideOffset={4}>
                    {moves.map((move) => (
                        <Menu.Item className="sm:hidden" key={move.label.value} onClick={move.run}>
                            <Glyph icon={move.icon} size={16} />
                            {move.label}
                        </Menu.Item>
                    ))}
                    <DetailMenuItems row={row} />
                </MenuContent>
            </Menu>
        </AccountsBar>
    );
}

function PlanKpi({ row }: { row: DebtRow }) {
    const { ledger } = useDashboard();
    const { detail, plan } = useIntlayer("dashboard-debts");
    const { money } = useDisplayFormat();
    const date = useDateFormat();
    const { currency } = row.account;
    const { line } = row;
    if (line === null) {
        return (
            <KpiCell color={MUTED} label={detail.plan} tone="text-muted-foreground" value="–">
                {note(plan.none)}
            </KpiCell>
        );
    }
    if (line.endedOn !== null) {
        const early = daysBetween(line.endedOn, line.targetDay);
        const day = date.day(line.endedOn);
        return (
            <KpiCell color={MUTED} label={detail.plan} value={money(0, currency)}>
                {note(early > 0 ? plan.early({ count: early, date: day }) : plan.paidBack({ date: day }))}
            </KpiCell>
        );
    }
    const { pace } = line;
    const day = date.day(line.targetDay);
    if (pace && pace.monthsLeft > 0) {
        return (
            <KpiCell color={MUTED} label={detail.plan} value={money(pace.perMonth, currency)}>
                {note(plan.monthUntil({ date: day }))}
            </KpiCell>
        );
    }
    return (
        <KpiCell color={MUTED} label={detail.plan} value={money(pace?.perMonth ?? row.amount, currency)}>
            {note(plan.byDays({ count: Math.max(0, daysBetween(ledger.today, line.targetDay)), date: day }))}
        </KpiCell>
    );
}

function Kpis({ row }: { row: DebtRow }) {
    const { detail, kpi, plan } = useIntlayer("dashboard-debts");
    const { money } = useDisplayFormat();
    const date = useDateFormat();
    const { added, repaid, since } = row.facts;
    const { currency } = row.account;
    const lent = row.facts.side === "owesYou";
    const times = (count: number) => (count === 1 ? detail.once : detail.times({ count }));
    let balanceLabel: ReactNode = detail.balance;
    if (row.standing === "owesYou") {
        balanceLabel = kpi.owesYou;
    } else if (row.standing === "youOwe") {
        balanceLabel = kpi.youOwe;
    }
    let sinceNote: ReactNode = null;
    if (since) {
        sinceNote =
            row.standing === "settled"
                ? plan.paidBack({ date: date.day(since) })
                : detail.since({ date: date.day(since) });
    }
    return (
        <KpiBand>
            <KpiCell color={MUTED} label={balanceLabel} value={money(row.amount, currency)}>
                {note(sinceNote)}
            </KpiCell>
            <KpiCell
                color={MUTED}
                label={lent ? detail.lent : detail.borrowed}
                tone={added.count === 0 ? "text-muted-foreground" : ""}
                value={money(added.total, currency)}
            >
                {note(times(added.count))}
            </KpiCell>
            <KpiCell
                color={MUTED}
                label={detail.paidBack}
                tone={repaid.count === 0 ? "text-muted-foreground" : ""}
                value={money(repaid.total, currency)}
            >
                {note(times(repaid.count))}
            </KpiCell>
            <PlanKpi row={row} />
        </KpiBand>
    );
}

function ProgressCard({ row }: { row: DebtRow }) {
    const { actions, detail } = useIntlayer("dashboard-debts");
    const { open } = useDebtFlows();
    const { money } = useDisplayFormat();
    const date = useDateFormat();
    const line = liveLine(row);
    if (line === null) {
        return null;
    }
    const { currency, name } = row.account;
    const facts = { date: date.day(line.targetDay), name };
    const owesYou = row.standing === "owesYou";
    const { added, repaid } = row.facts;
    return (
        <Frame className="mt-4 min-w-0" variant="plain">
            <Frame.Panel className="bg-card flex flex-col gap-3 rounded-3xl border px-5 py-4">
                <div className="flex min-h-8 flex-wrap items-center gap-2.5">
                    <b className="text-app-label font-medium">
                        {owesYou ? detail.theyPay(facts) : detail.youPay(facts)}
                    </b>
                    {line.behind ? <BehindBadge amount={line.behind} currency={currency} /> : <OnTrackBadge />}
                    <Button
                        className="ms-auto"
                        onClick={() => open({ accountId: row.account.id, kind: "plan" })}
                        size="sm"
                        variant="outline"
                    >
                        {actions.changePlan}
                    </Button>
                </div>
                <PayoffBar row={row} />
                <div className="dash-figure text-muted-foreground text-app-caption flex justify-between gap-3">
                    <span>{detail.paidBackTotal({ amount: money(repaid.total, currency) })}</span>
                    <span>
                        {(owesYou ? detail.lentTotal : detail.borrowedTotal)({ amount: money(added.total, currency) })}
                    </span>
                </div>
            </Frame.Panel>
        </Frame>
    );
}

function AccountCell({ accounts, movement }: { accounts: readonly AccountRow[]; movement: Movement }) {
    const { detail } = useIntlayer("dashboard-debts");
    if (movement.kind === "boughtOnCredit" || movement.kind === "soldOnCredit") {
        return <span className="text-muted-foreground">–</span>;
    }
    const account = accounts.find((row) => row.id === movement.accountId);
    if (!account) {
        return <span className="text-muted-foreground">{detail.outside}</span>;
    }
    return (
        <span className="flex min-w-0 items-center gap-2">
            <AccountTile account={account.look} size="sm" />
            <span className="truncate">{account.name}</span>
        </span>
    );
}

function Movements({ accounts, row }: { accounts: readonly AccountRow[]; row: DebtRow }) {
    const { columns, detail, kinds } = useIntlayer("dashboard-debts");
    const { money } = useDisplayFormat();
    const date = useDateFormat();
    const { movements } = row.facts;
    const { currency } = row.account;
    return (
        <Card className="mt-4 flex-1" count={movements.length} title={detail.movements}>
            {movements.length === 0 ? (
                <Empty icon={ArrowDataTransferHorizontalIcon} title={detail.noMovements} />
            ) : (
                <DataTable
                    density="comfortable"
                    head={[
                        columns.date,
                        columns.movement,
                        columns.account,
                        columns.note,
                        columns.amount,
                        columns.balance,
                    ]}
                    phoneHidden={[3, 4]}
                >
                    {movements.map((movement) => (
                        <Table.Row key={movement.id}>
                            <Cell className="dash-figure text-muted-foreground text-app-label">
                                {date.day(movement.day)}
                            </Cell>
                            <Cell>
                                <span className="text-app-label flex items-center gap-2.5 font-medium">
                                    <span className="bg-app-fill text-muted-foreground rounded-app-sm flex size-6.5 shrink-0 items-center justify-center">
                                        <Glyph icon={movement.amount > 0 ? ArrowDown02Icon : ArrowUp02Icon} size={14} />
                                    </span>
                                    {kinds[movement.kind]}
                                </span>
                            </Cell>
                            <Cell className="text-app-label">
                                <AccountCell accounts={accounts} movement={movement} />
                            </Cell>
                            <Cell className="text-muted-foreground text-app-label max-w-70 truncate">
                                {movement.note}
                            </Cell>
                            <Cell className={movement.kind === "gotPaidBack" ? "text-app-income" : ""} figure>
                                {money(movement.amount, currency, "always")}
                            </Cell>
                            <Cell figure>{money(Math.abs(movement.balance), currency)}</Cell>
                        </Table.Row>
                    ))}
                </DataTable>
            )}
        </Card>
    );
}

function NotFound() {
    const { back, detail, title } = useIntlayer("dashboard-debts");
    return (
        <main className="min-w-0 px-4 pb-5 sm:px-6">
            <AccountsBar title={title} />
            <p className="text-muted-foreground text-app-body py-6">
                {detail.notFound}{" "}
                <Link className="text-foreground underline" to="/debts">
                    {back}
                </Link>
            </p>
        </main>
    );
}

function DetailPage({ accountId }: { accountId: string }) {
    const { accounts, row } = useDetail(accountId);
    if (!row) {
        return <NotFound />;
    }
    return (
        <main className="@container flex min-h-dvh min-w-0 flex-col px-4 pb-5 sm:px-6">
            <DetailBar row={row} />
            <Kpis row={row} />
            <ProgressCard row={row} />
            <Movements accounts={accounts} row={row} />
        </main>
    );
}

export function DebtDetail({ accountId }: { accountId: string }) {
    return (
        <DebtFlowsProvider>
            <DetailPage accountId={accountId} />
        </DebtFlowsProvider>
    );
}
