import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import ArrowUpRight01Icon from "@hugeicons/core-free-icons/ArrowUpRight01Icon";
import Delete02Icon from "@hugeicons/core-free-icons/Delete02Icon";
import Flag02Icon from "@hugeicons/core-free-icons/Flag02Icon";
import MoreVerticalIcon from "@hugeicons/core-free-icons/MoreVerticalIcon";
import PencilEdit01Icon from "@hugeicons/core-free-icons/PencilEdit01Icon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import { useNavigate } from "@tanstack/react-router";
import { Badge } from "panelui-web/badge";
import { Button } from "panelui-web/button";
import { Kpi } from "panelui-web/kpi";
import { Menu } from "panelui-web/menu";
import { useCallback, useContext } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { ICON_TILE } from "@/components/dashboard/accounts/accounts-screen";
import { Glyph } from "@/components/dashboard/accounts/glyph";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { money } from "@/lib/ledger";
import { LedgerSettingsContext } from "@/lib/ledger-settings";

import { useGoalFlows } from "./flow-context";
import type { GoalView, Standing } from "./model";

export const PERCENT = 100;

export function useGoalMoney() {
    const { showCents } = useContext(LedgerSettingsContext);
    return useCallback(
        (amount: number, currency: string, sign?: "always" | "auto") =>
            money(amount, currency, sign, showCents && Math.round(amount * PERCENT) % PERCENT !== 0),
        [showCents]
    );
}

export const percentOf = (view: Pick<GoalView, "progress">) => Math.round(view.progress.fraction * PERCENT);

export function GoalTile({ reached = false }: { reached?: boolean }) {
    return (
        <span className={`${ICON_TILE} ${reached ? "bg-app-income/14! text-app-income!" : ""}`}>
            <Glyph icon={reached ? Tick02Icon : Flag02Icon} size={15} />
        </span>
    );
}

export function GoalBar({ className = "", reached, value }: { className?: string; reached: boolean; value: number }) {
    return (
        <Kpi.Progress
            className={`[&>[role=progressbar]]:bg-foreground/[0.06] gap-0 ${reached ? "[--pu-color:var(--color-app-income)]" : "[--pu-color:var(--color-app-tint)]"} ${className}`}
            maxValue={1}
            value={Math.min(1, Math.max(0, value))}
        />
    );
}

const BADGE = "dash-figure h-[22px] rounded-md px-2 text-xs font-medium normal-nums";

export function PaceBadge({ standing }: { standing: Standing | null }) {
    const { pace } = useIntlayer("dashboard-goals");
    const format = useGoalMoney();
    const { currency } = useDashboard().ledger;
    if (standing === null) {
        return null;
    }
    switch (standing.kind) {
        case "ahead": {
            return (
                <Badge className={BADGE} dot variant="success">
                    {pace.ahead({ amount: format(standing.amount, currency) })}
                </Badge>
            );
        }
        case "behind": {
            return (
                <Badge className={BADGE} dot variant="destructive">
                    {pace.behind({ amount: format(standing.amount, currency) })}
                </Badge>
            );
        }
        case "onPace": {
            return (
                <Badge className={BADGE} dot variant="secondary">
                    {pace.onPace}
                </Badge>
            );
        }
        default: {
            return (
                <Badge className={BADGE} dot variant="warning">
                    {pace.noRate}
                </Badge>
            );
        }
    }
}

export function ReachedBadge({ children }: { children?: ReactNode }) {
    const { pace } = useIntlayer("dashboard-goals");
    return (
        <Badge className={BADGE} dot variant="success">
            {children ?? pace.reached}
        </Badge>
    );
}

export function GoalMenu({ className = "", view }: { className?: string; view: GoalView }) {
    const { menu } = useIntlayer("dashboard-goals");
    const { open } = useGoalFlows();
    const navigate = useNavigate();
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
            <Menu.Content align="end" alignOffset={-4} className="app-shell ph-no-capture w-[200px]" sideOffset={4}>
                <Menu.Item onClick={() => navigate({ params: { goalId: view.id }, to: "/app/goals/$goalId" })}>
                    <Glyph icon={ArrowUpRight01Icon} size={16} />
                    {menu.open}
                </Menu.Item>
                <Menu.Item onClick={() => open({ goalId: view.id, kind: "edit" })}>
                    <Glyph icon={PencilEdit01Icon} size={16} />
                    {menu.edit}
                </Menu.Item>
                {view.progress.reached ? null : (
                    <Menu.Item onClick={() => open({ goalId: view.id, kind: "add" })}>
                        <Glyph icon={Add01Icon} size={16} />
                        {menu.addMoney}
                    </Menu.Item>
                )}
                <Menu.Separator />
                <Menu.Item onClick={() => open({ goalId: view.id, kind: "delete" })} variant="destructive">
                    <Glyph icon={Delete02Icon} size={16} />
                    {menu.delete}
                </Menu.Item>
            </Menu.Content>
        </Menu>
    );
}

export function Terrain({ flat = false }: { flat?: boolean }) {
    const name = flat ? "terrain-flat" : "terrain";
    const height = flat ? 180 : 874;
    const image = "pointer-events-none absolute top-0 left-0 -z-10 h-auto max-w-none select-none";
    return (
        <>
            <img alt="" className={`light-only ${image}`} height={height} src={`/goals/${name}.svg`} width={1158} />
            <img alt="" className={`dark-only ${image}`} height={height} src={`/goals/${name}-dark.svg`} width={1158} />
        </>
    );
}
