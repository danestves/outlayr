import ArrowDown02Icon from "@hugeicons/core-free-icons/ArrowDown02Icon";
import ArrowUp02Icon from "@hugeicons/core-free-icons/ArrowUp02Icon";
import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon";
import CancelCircleIcon from "@hugeicons/core-free-icons/CancelCircleIcon";
import Delete02Icon from "@hugeicons/core-free-icons/Delete02Icon";
import Flag02Icon from "@hugeicons/core-free-icons/Flag02Icon";
import MoreVerticalIcon from "@hugeicons/core-free-icons/MoreVerticalIcon";
import PencilEdit02Icon from "@hugeicons/core-free-icons/PencilEdit02Icon";
import { useNavigate } from "@tanstack/react-router";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { Menu } from "panelui-web/menu";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { Glyph } from "@/components/dashboard/accounts/glyph";
import { accountRows } from "@/components/dashboard/accounts/model";
import { useDateFormat } from "@/components/dashboard/home/format";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import { AccountTile } from "@/components/ledger/tiles";
import { useDisplayFormat } from "@/lib/ledger-settings";

import { useGoalMoney } from "../goals/parts";
import { useDebtFlows } from "./flow-context";
import { debtsModel, plansOf, takesPayoffPlan } from "./model";
import type { DebtRow, DebtsModel } from "./model";
import { removedPlans } from "./writes";

const PERCENT = 100;
const BADGE = "h-[22px] rounded-md px-2 text-xs font-medium normal-nums";

export function useDebts() {
    const { ledger, overview } = useDashboard();
    return useMemo(() => {
        const rows = accountRows(ledger, overview);
        return { model: debtsModel(ledger, rows), rows };
    }, [ledger, overview]);
}

export const peopleOf = (model: DebtsModel) => [...model.owesYou, ...model.youOwe, ...model.settled];

export const liveLine = (row: DebtRow) => (row.line?.endedOn === null ? row.line : null);

export function PersonTile({ row }: { row: DebtRow }) {
    const { photos } = useDashboard();
    if (row.card) {
        return <AccountTile account={row.account.look} photos={photos} size="lg" />;
    }
    return (
        <span className="bg-app-fill text-muted-foreground flex size-[26px] shrink-0 items-center justify-center rounded-full text-[11px] font-medium">
            {row.account.name.trim().charAt(0).toLocaleUpperCase()}
        </span>
    );
}

export function BehindBadge({ amount, currency }: { amount: number; currency: string }) {
    const { kpi } = useIntlayer("dashboard-debts");
    const format = useGoalMoney();
    return (
        <Badge className={BADGE} variant="warning">
            {kpi.behind({ amount: format(amount, currency) })}
        </Badge>
    );
}

export function OnTrackBadge() {
    const { kpi } = useIntlayer("dashboard-debts");
    return (
        <Badge className={BADGE} variant="success">
            {kpi.onTrack}
        </Badge>
    );
}

/** What the plan column says: the ask while a plan runs, the day it closed once settled. */
export function usePlanText() {
    const { plan } = useIntlayer("dashboard-debts");
    const { money } = useDisplayFormat();
    const date = useDateFormat();
    return (row: DebtRow): ReactNode => {
        const { currency } = row.account;
        const line = liveLine(row);
        if (line) {
            const day = date.day(line.targetDay);
            if (line.pace && line.pace.monthsLeft > 0) {
                return plan.perMonth({ amount: money(line.pace.perMonth, currency), date: day });
            }
            if (row.card) {
                return plan.payOff({ date: day });
            }
            if (row.standing === "youOwe") {
                return plan.illPay({ date: date.weekday(line.targetDay) });
            }
            return plan.by({ amount: money(line.pace?.perMonth ?? row.amount, currency), date: day });
        }
        const settled = row.card ? row.amount <= 0 : row.standing === "settled";
        const ended = row.line?.endedOn ?? (row.card ? null : row.facts.since);
        if (settled && ended) {
            return (row.card ? plan.paidOff : plan.paidBack)({ date: date.day(ended) });
        }
        return plan.none;
    };
}

export function useRemovePlan() {
    const { ledger } = useDashboard();
    const committer = useLedgerCommitter();
    const { form, plan } = useIntlayer("dashboard-debts");
    return (accountId: string) => {
        committer.commitWithUndo(removedPlans(plansOf(ledger, accountId), Date.now()), {
            failed: form.saveFailed.value,
            text: plan.removed.value,
        });
    };
}

function PlanItems({ row }: { row: DebtRow }) {
    const { actions } = useIntlayer("dashboard-debts");
    const { open } = useDebtFlows();
    const remove = useRemovePlan();
    if (!takesPayoffPlan(row.account)) {
        return null;
    }
    const live = liveLine(row);
    return (
        <>
            <Menu.Item onClick={() => open({ accountId: row.account.id, kind: "plan" })}>
                <Glyph icon={Flag02Icon} size={16} />
                {live ? actions.changePlan : actions.setPlan}
            </Menu.Item>
            {live ? (
                <Menu.Item onClick={() => remove(row.account.id)}>
                    <Glyph icon={CancelCircleIcon} size={16} />
                    {actions.removePlan}
                </Menu.Item>
            ) : null}
        </>
    );
}

/** The two moves a person takes from where the balance sits: settle it, or add to it. */
export function useMoves(row: DebtRow) {
    const { actions } = useIntlayer("dashboard-debts");
    const { open } = useDebtFlows();
    const personId = row.account.id;
    const pay = () => open({ accountId: personId, kind: settlesAtOnce(row) ? "settle" : "pay" });
    switch (row.standing) {
        case "owesYou": {
            return [
                { icon: ArrowDown02Icon, label: actions.gotPaidBack, run: pay },
                {
                    icon: ArrowUp02Icon,
                    label: actions.lendMore,
                    run: () => open({ kind: "new", personId, verb: "lent" }),
                },
            ];
        }
        case "youOwe": {
            return [
                { icon: ArrowUp02Icon, label: actions.payBack, run: pay },
                {
                    icon: ArrowDown02Icon,
                    label: actions.borrowMore,
                    run: () => open({ kind: "new", personId, verb: "borrowed" }),
                },
            ];
        }
        default: {
            return [
                {
                    icon: ArrowDown02Icon,
                    label: actions.borrow,
                    run: () => open({ kind: "new", personId, verb: "borrowed" }),
                },
                { icon: ArrowUp02Icon, label: actions.lend, run: () => open({ kind: "new", personId, verb: "lent" }) },
            ];
        }
    }
}

/** A one-shot plan asks for the whole balance, so paying it is one tap. */
export const settlesAtOnce = (row: DebtRow) => {
    const line = liveLine(row);
    return line !== null && line.pace !== null && line.pace.monthsLeft === 0;
};

function PersonItems({ row }: { row: DebtRow }) {
    const moves = useMoves(row);
    const { actions } = useIntlayer("dashboard-debts");
    const { open } = useDebtFlows();
    return (
        <>
            {moves.map((move) => (
                <Menu.Item key={move.label.value} onClick={move.run}>
                    <Glyph icon={move.icon} size={16} />
                    {move.label}
                </Menu.Item>
            ))}
            <Menu.Item onClick={() => open({ accountId: row.account.id, kind: "rename" })}>
                <Glyph icon={PencilEdit02Icon} size={16} />
                {actions.rename}
            </Menu.Item>
            <PlanItems row={row} />
        </>
    );
}

export function DeleteItem({ row }: { row: DebtRow }) {
    const { actions } = useIntlayer("dashboard-debts");
    const { open } = useDebtFlows();
    return (
        <>
            <Menu.Separator />
            <Menu.Item onClick={() => open({ accountId: row.account.id, kind: "delete" })} variant="destructive">
                <Glyph icon={Delete02Icon} size={16} />
                {actions.delete}
            </Menu.Item>
        </>
    );
}

export function DebtMenu({ row }: { row: DebtRow }) {
    const { actions } = useIntlayer("dashboard-debts");
    const navigate = useNavigate();
    return (
        <Menu>
            <Menu.Trigger
                aria-label={actions.more({ name: row.account.name }).value}
                render={<Button className="text-muted-foreground -mx-2 size-[26px]" size="icon-sm" variant="ghost" />}
            >
                <Glyph icon={MoreVerticalIcon} size={17} />
            </Menu.Trigger>
            <Menu.Content align="end" alignOffset={-4} className="app-shell ph-no-capture w-[200px]" sideOffset={4}>
                {row.card ? (
                    <>
                        <Menu.Item
                            onClick={() =>
                                navigate({ params: { accountId: row.account.id }, to: "/app/accounts/$accountId" })
                            }
                        >
                            <Glyph icon={ArrowUpRight01Icon} size={16} />
                            {actions.open}
                        </Menu.Item>
                        <PlanItems row={row} />
                    </>
                ) : (
                    <>
                        <PersonItems row={row} />
                        <DeleteItem row={row} />
                    </>
                )}
            </Menu.Content>
        </Menu>
    );
}

/** The bar's menu, where the two moves already sit as buttons. */
export function DetailMenuItems({ row }: { row: DebtRow }) {
    const { actions } = useIntlayer("dashboard-debts");
    const { open } = useDebtFlows();
    return (
        <>
            <Menu.Item onClick={() => open({ accountId: row.account.id, kind: "rename" })}>
                <Glyph icon={PencilEdit02Icon} size={16} />
                {actions.rename}
            </Menu.Item>
            <PlanItems row={row} />
            <DeleteItem row={row} />
        </>
    );
}

/** Paid back over everything added, with what the plan says should be paid by now shaded after it. */
export function PayoffBar({ row }: { row: DebtRow }) {
    const { added, repaid } = row.facts;
    const behind = liveLine(row)?.behind ?? 0;
    const share = (amount: number) => (added.total > 0 ? Math.min(PERCENT, (amount / added.total) * PERCENT) : 0);
    const paid = share(repaid.total);
    const late = Math.min(PERCENT - paid, share(behind));
    return (
        <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
            <i
                className={`block h-full rounded-full ${row.standing === "owesYou" ? "bg-app-income" : "bg-app-tint"}`}
                style={{ width: `${paid}%` }}
            />
            {late > 0 ? (
                <i
                    className="block h-full rounded-full bg-[color-mix(in_oklab,var(--color-app-warn)_55%,var(--color-app-fill))]"
                    style={{ width: `${late}%` }}
                />
            ) : null}
            <i className="bg-app-fill block h-full flex-1 rounded-full" />
        </div>
    );
}
