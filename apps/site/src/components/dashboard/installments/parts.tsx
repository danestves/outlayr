import CalendarCheckIn01Icon from "@hugeicons/core-free-icons/CalendarCheckIn01Icon";
import Delete02Icon from "@hugeicons/core-free-icons/Delete02Icon";
import LinkSquare02Icon from "@hugeicons/core-free-icons/LinkSquare02Icon";
import MoreVerticalIcon from "@hugeicons/core-free-icons/MoreVerticalIcon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import TickDouble02Icon from "@hugeicons/core-free-icons/TickDouble02Icon";
import { useNavigate } from "@tanstack/react-router";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { Menu } from "panelui-web/menu";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { ICON_TILE } from "@/components/dashboard/accounts/accounts-screen";
import { Glyph } from "@/components/dashboard/accounts/glyph";
import { GoalBar, useGoalMoney } from "@/components/dashboard/goals/parts";
import { useDateFormat } from "@/components/dashboard/home/format";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { CATEGORY_ICONS } from "@/components/ledger/category-icons";
import { daysBetween } from "@/lib/ledger";

import { useInstallmentFlows } from "./flow-context";
import { isWeekly } from "./model";
import type { Cadence, InstallmentView, PlanView } from "./model";

export const BADGE = "h-6 rounded-md px-2 text-xs font-medium";

export function OrderTile({ look }: { look: PlanView["look"] }) {
    const icon = look?.icon ? CATEGORY_ICONS.get(look.icon) : undefined;
    return (
        <span className={ICON_TILE}>
            {!icon && look?.emoji ? (
                <span className="text-sm leading-none">{look.emoji}</span>
            ) : (
                <Glyph icon={icon ?? CalendarCheckIn01Icon} size={15} />
            )}
        </span>
    );
}

export function PlanBar({ className = "", view }: { className?: string; view: PlanView }) {
    return (
        <GoalBar
            className={className}
            reached={view.finished}
            value={view.scheduled > 0 ? view.paid / view.scheduled : 0}
        />
    );
}

export function useCadenceText() {
    const { cadence } = useIntlayer("dashboard-installments");
    return (value: Cadence | null) => {
        if (value === null) {
            return null;
        }
        if (value.kind === "monthly") {
            return cadence.monthly.value;
        }
        if (value.kind === "semimonthly") {
            return cadence.semimonthly.value;
        }
        return isWeekly(value) ? cadence.weekly.value : cadence.days({ count: value.every }).value;
    };
}

export function usePlanTerms() {
    const { plan } = useIntlayer("dashboard-installments");
    const format = useGoalMoney();
    return (view: PlanView) => {
        const rest =
            view.each === null
                ? plan.mixed({ count: view.count }).value
                : plan.each({ amount: format(view.each, view.currency), count: view.count }).value;
        return view.upfront ? plan.withUpfront({ rest }).value : rest;
    };
}

export function useRowLabel() {
    const { row } = useIntlayer("dashboard-installments");
    return (view: Pick<PlanView, "count">, item: Pick<InstallmentView, "sequence">) =>
        item.sequence === 0 ? row.upfront.value : row.installment({ count: view.count, index: item.sequence }).value;
}

export function useDueText() {
    const date = useDateFormat();
    const { today } = useDashboard().ledger;
    return (day: string) => (day.slice(0, 4) === today.slice(0, 4) ? date.day(day) : date.full(day));
}

export function OverdueBadge({ children }: { children?: ReactNode }) {
    const { status } = useIntlayer("dashboard-installments");
    return (
        <Badge className={BADGE} variant="destructive">
            {children ?? status.overdue}
        </Badge>
    );
}

export function RowStatus({ item, next }: { item: InstallmentView; next: boolean }) {
    const { status } = useIntlayer("dashboard-installments");
    const { today } = useDashboard().ledger;
    if (item.status === "paid") {
        return (
            <Badge className={BADGE} variant="success">
                {status.paid}
            </Badge>
        );
    }
    if (item.overdue) {
        return <OverdueBadge />;
    }
    if (!next) {
        return (
            <span className="text-muted-foreground text-[13px]">
                {item.status === "partial" ? status.partial : status.comingUp}
            </span>
        );
    }
    const days = daysBetween(today, item.day);
    let text: ReactNode = status.inDays({ count: days });
    if (days === 0) {
        text = status.today;
    } else if (days === 1) {
        text = status.tomorrow;
    }
    return (
        <Badge className={BADGE} variant="warning">
            {text}
        </Badge>
    );
}

export function PlanMenu({ className = "", view }: { className?: string; view: PlanView }) {
    const { menu } = useIntlayer("dashboard-installments");
    const { open } = useInstallmentFlows();
    const format = useGoalMoney();
    const navigate = useNavigate();
    const { next } = view;
    return (
        <Menu>
            <Menu.Trigger
                aria-label={menu.more({ name: view.name }).value}
                render={
                    <Button
                        className={`text-muted-foreground -mx-2 size-[26px] ${className}`}
                        size="icon-sm"
                        variant="ghost"
                    />
                }
            >
                <Glyph icon={MoreVerticalIcon} size={17} />
            </Menu.Trigger>
            <Menu.Content align="end" alignOffset={-4} className="app-shell ph-no-capture w-[220px]" sideOffset={4}>
                {next ? (
                    <Menu.Item onClick={() => open({ kind: "pay", planId: view.id })}>
                        <Glyph icon={Tick02Icon} size={16} />
                        {menu.pay({ amount: format(next.remaining, view.currency) })}
                    </Menu.Item>
                ) : null}
                {next && view.left > next.remaining ? (
                    <Menu.Item onClick={() => open({ kind: "payAll", planId: view.id })}>
                        <Glyph icon={TickDouble02Icon} size={16} />
                        {menu.payAll({ amount: format(view.left, view.currency) })}
                    </Menu.Item>
                ) : null}
                <Menu.Item onClick={() => navigate({ params: { planId: view.id }, to: "/app/installments/$planId" })}>
                    <Glyph icon={LinkSquare02Icon} size={16} />
                    {menu.open}
                </Menu.Item>
                {view.finished ? null : (
                    <>
                        <Menu.Separator />
                        <Menu.Item
                            onClick={() => open({ kind: "deletePending", planId: view.id })}
                            variant="destructive"
                        >
                            <Glyph icon={Delete02Icon} size={16} />
                            {menu.deletePending}
                        </Menu.Item>
                    </>
                )}
            </Menu.Content>
        </Menu>
    );
}
