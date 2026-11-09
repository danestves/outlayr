import Analytics01Icon from "@hugeicons/core-free-icons/Analytics01Icon";
import CalendarCheckIn01Icon from "@hugeicons/core-free-icons/CalendarCheckIn01Icon";
import CreditCardIcon from "@hugeicons/core-free-icons/CreditCardIcon";
import DashboardSquare01Icon from "@hugeicons/core-free-icons/DashboardSquare01Icon";
import Flag02Icon from "@hugeicons/core-free-icons/Flag02Icon";
import HandCoinsIcon from "@hugeicons/core-free-icons/HandCoinsIcon";
import MagicWand01Icon from "@hugeicons/core-free-icons/MagicWand01Icon";
import PieChartIcon from "@hugeicons/core-free-icons/PieChartIcon";
import RepeatIcon from "@hugeicons/core-free-icons/RepeatIcon";
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import SidebarLeftIcon from "@hugeicons/core-free-icons/SidebarLeftIcon";
import TransactionHistoryIcon from "@hugeicons/core-free-icons/TransactionHistoryIcon";
import Upload04Icon from "@hugeicons/core-free-icons/Upload04Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import { Tooltip } from "panelui-web/tooltip";
import { useSyncExternalStore } from "react";
import type { ReactElement } from "react";
import { useIntlayer } from "react-intlayer";

import { LogoMark } from "@/components/logo-mark";

import { UserMenu } from "./account-menu";

const COLLAPSED_KEY = "outlayr-sidebar-collapsed";
const listeners = new Set<() => void>();

function storedCollapsed() {
    try {
        return localStorage.getItem(COLLAPSED_KEY) === "1";
    } catch {
        return false;
    }
}

function subscribeCollapsed(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

function toggleCollapsed() {
    try {
        localStorage.setItem(COLLAPSED_KEY, storedCollapsed() ? "0" : "1");
    } catch {
        return;
    }
    for (const listener of listeners) {
        listener();
    }
}

interface NavProps {
    collapsed: boolean;
    icon: IconSvgElement;
    label: string;
}

function RailTip({ children, label }: { children: ReactElement; label: string }) {
    return (
        <Tooltip>
            <Tooltip.Trigger render={children} />
            <Tooltip.Content side="right" sideOffset={10} variant="outline">
                {label}
            </Tooltip.Content>
        </Tooltip>
    );
}

function Soon({ collapsed, icon, label }: NavProps) {
    const { nav } = useIntlayer("dashboard");
    const item = (
        <span aria-disabled className="dash-nav" title={collapsed ? undefined : label}>
            <HugeiconsIcon className="shrink-0" icon={icon} size={17} strokeWidth={1.5} />
            {collapsed ? <span className="sr-only">{label}</span> : label}
            <span className="dash-soon">{nav.soon}</span>
        </span>
    );
    return collapsed ? <RailTip label={label}>{item}</RailTip> : item;
}

function NavLink({
    collapsed,
    exact,
    icon,
    label,
    to,
}: NavProps & {
    exact?: boolean;
    to: "/app" | "/app/accounts" | "/app/insights" | "/app/transactions";
}) {
    const item = (
        <Link activeOptions={{ exact, includeSearch: false }} className="dash-nav" to={to}>
            <HugeiconsIcon className="shrink-0" icon={icon} size={17} strokeWidth={1.5} />
            {collapsed ? <span className="sr-only">{label}</span> : label}
        </Link>
    );
    return collapsed ? <RailTip label={label}>{item}</RailTip> : item;
}

export function SearchButton({ collapsed = false }: { collapsed?: boolean }) {
    const { nav } = useIntlayer("dashboard");
    if (collapsed) {
        return (
            <RailTip label={nav.search.value}>
                <Button
                    aria-disabled
                    aria-label={nav.search.value}
                    className="text-muted-foreground"
                    size="icon"
                    variant="ghost"
                >
                    <HugeiconsIcon icon={Search01Icon} size={17} strokeWidth={1.5} />
                </Button>
            </RailTip>
        );
    }
    return (
        <Button
            aria-disabled
            className="text-muted-foreground mb-1 w-full shrink-0 justify-start gap-2 px-3 font-normal"
            variant="outline"
        >
            <HugeiconsIcon icon={Search01Icon} size={16} strokeWidth={1.5} />
            {nav.search}
            <kbd className="border-border bg-app-fill ml-auto rounded-[4px] border px-1.5 font-mono text-xs leading-4 pointer-coarse:hidden">
                ⌘K
            </kbd>
        </Button>
    );
}

export function NavLinks({ collapsed }: { collapsed: boolean }) {
    const { nav } = useIntlayer("dashboard");
    const group = (label: string) =>
        collapsed ? (
            <div className="border-app-strong mx-2 my-1.5 border-t" />
        ) : (
            <div className="text-muted-foreground px-2.5 pt-3 pb-1 text-xs leading-4 [.dash-drawer_&]:pt-2">
                {label}
            </div>
        );
    return (
        <>
            {group(nav.label.value)}
            <NavLink collapsed={collapsed} exact icon={DashboardSquare01Icon} label={nav.dashboard.value} to="/app" />
            <NavLink
                collapsed={collapsed}
                icon={TransactionHistoryIcon}
                label={nav.transactions.value}
                to="/app/transactions"
            />
            <NavLink collapsed={collapsed} icon={CreditCardIcon} label={nav.accounts.value} to="/app/accounts" />
            <NavLink collapsed={collapsed} icon={Analytics01Icon} label={nav.insights.value} to="/app/insights" />
            {group(nav.plan.value)}
            <Soon collapsed={collapsed} icon={PieChartIcon} label={nav.budgets.value} />
            <Soon collapsed={collapsed} icon={Flag02Icon} label={nav.goals.value} />
            <Soon collapsed={collapsed} icon={RepeatIcon} label={nav.recurring.value} />
            <Soon collapsed={collapsed} icon={HandCoinsIcon} label={nav.debts.value} />
            <Soon collapsed={collapsed} icon={CalendarCheckIn01Icon} label={nav.installments.value} />
            {group(nav.tools.value)}
            <Soon collapsed={collapsed} icon={Upload04Icon} label={nav.import.value} />
            <Soon collapsed={collapsed} icon={MagicWand01Icon} label={nav.rules.value} />
        </>
    );
}

export function Sidebar() {
    const { nav } = useIntlayer("dashboard");
    const collapsed = useSyncExternalStore(subscribeCollapsed, storedCollapsed, () => false);
    const toggle = (
        <Button
            aria-label={nav.collapse.value}
            className={collapsed ? "text-muted-foreground" : "text-muted-foreground -mr-2"}
            onClick={toggleCollapsed}
            size={collapsed ? "icon" : "icon-sm"}
            variant="ghost"
        >
            <HugeiconsIcon className="size-[17px]" icon={SidebarLeftIcon} strokeWidth={1.5} />
        </Button>
    );
    return (
        <nav
            aria-label={nav.label.value}
            className={`border-border flex h-dvh shrink-0 flex-col overflow-y-auto overscroll-none border-r px-3 pb-3 max-lg:hidden ${collapsed ? "w-16" : "w-[232px]"}`}
        >
            <div
                className={`flex h-16 shrink-0 items-center gap-[9px] text-[15px] font-semibold ${collapsed ? "justify-center" : "px-2"}`}
            >
                <Link aria-label={nav.home.value} className="text-app-tint flex items-center gap-[9px]" to="/">
                    <LogoMark className="size-6 shrink-0" />
                </Link>
                {collapsed ? null : "Outlayr"}
                {collapsed ? null : <span className="-mr-[7.5px] ml-auto">{toggle}</span>}
            </div>
            {collapsed ? (
                <div className="-mt-1.5 flex flex-col items-center">
                    <RailTip label={nav.collapse.value}>{toggle}</RailTip>
                    <SearchButton collapsed />
                </div>
            ) : (
                <SearchButton />
            )}
            <NavLinks collapsed={collapsed} />
            <UserMenu collapsed={collapsed} />
        </nav>
    );
}
