import {
    RiArrowRightSLine,
    RiBankCardLine,
    RiBarChartBoxLine,
    RiCalendarCheckLine,
    RiFlagLine,
    RiHandCoinLine,
    RiHistoryLine,
    RiLayoutGridLine,
    RiMagicLine,
    RiPieChartLine,
    RiRepeatLine,
    RiSearch2Line,
    RiSideBarLine,
    RiUpload2Line,
} from "@remixicon/react";
import type { RemixiconComponentType } from "@remixicon/react";
import { Link } from "@tanstack/react-router";
import { useSyncExternalStore } from "react";
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
    icon: RemixiconComponentType;
    label: string;
}

function Soon({ collapsed, icon: Icon, label }: NavProps) {
    return (
        <span aria-disabled className="dash-nav" title={label}>
            <Icon className="shrink-0" size={17} />
            {collapsed ? null : label}
        </span>
    );
}

function NavLink({
    collapsed,
    exact,
    icon: Icon,
    label,
    to,
}: NavProps & { exact?: boolean; to: "/app" | "/app/insights" }) {
    return (
        <Link activeOptions={{ exact, includeSearch: false }} className="dash-nav" title={label} to={to}>
            <Icon className="shrink-0" size={17} />
            {collapsed ? null : label}
        </Link>
    );
}

export function SearchButton() {
    const { nav } = useIntlayer("dashboard");
    return (
        <button
            aria-disabled
            className="border-border bg-app-hover text-muted-foreground mb-1 flex h-[34px] shrink-0 items-center gap-[9px] rounded-[10px] border px-2.5 text-[13px]"
            type="button"
        >
            <RiSearch2Line size={15} />
            {nav.search}
            <kbd className="ml-auto text-[11px] leading-4">⌘K</kbd>
        </button>
    );
}

export function NavLinks({ collapsed }: { collapsed: boolean }) {
    const { nav } = useIntlayer("dashboard");
    const group = (label: string) =>
        collapsed ? (
            <div className="h-4" />
        ) : (
            <div className="text-muted-foreground px-2.5 pt-3 pb-1 text-xs leading-4">{label}</div>
        );
    return (
        <>
            {group(nav.label.value)}
            <NavLink collapsed={collapsed} exact icon={RiLayoutGridLine} label={nav.dashboard.value} to="/app" />
            <Soon collapsed={collapsed} icon={RiHistoryLine} label={nav.transactions.value} />
            <Soon collapsed={collapsed} icon={RiBankCardLine} label={nav.accounts.value} />
            <NavLink collapsed={collapsed} icon={RiBarChartBoxLine} label={nav.insights.value} to="/app/insights" />
            {group(nav.plan.value)}
            <Soon collapsed={collapsed} icon={RiPieChartLine} label={nav.budgets.value} />
            <Soon collapsed={collapsed} icon={RiFlagLine} label={nav.goals.value} />
            <Soon collapsed={collapsed} icon={RiRepeatLine} label={nav.recurring.value} />
            <Soon collapsed={collapsed} icon={RiHandCoinLine} label={nav.debts.value} />
            <Soon collapsed={collapsed} icon={RiCalendarCheckLine} label={nav.installments.value} />
            {group(nav.tools.value)}
            <Soon collapsed={collapsed} icon={RiUpload2Line} label={nav.import.value} />
            <Soon collapsed={collapsed} icon={RiMagicLine} label={nav.rules.value} />
        </>
    );
}

export function Sidebar() {
    const { nav } = useIntlayer("dashboard");
    const collapsed = useSyncExternalStore(subscribeCollapsed, storedCollapsed, () => false);
    return (
        <nav
            aria-label={nav.label.value}
            className={`border-border flex h-dvh shrink-0 flex-col overflow-y-auto overscroll-none border-r px-3 pb-3 max-lg:hidden ${collapsed ? "w-[60px]" : "w-[232px]"}`}
        >
            <div className="flex h-16 items-center gap-[9px] px-2 text-[15px] font-semibold">
                <Link aria-label={nav.home.value} className="text-app-tint flex items-center gap-[9px]" to="/">
                    <LogoMark className="size-6 shrink-0" />
                </Link>
                {collapsed ? null : "Outlayr"}
                {collapsed ? null : (
                    <button
                        aria-label={nav.collapse.value}
                        className="text-muted-foreground ml-auto"
                        onClick={toggleCollapsed}
                        type="button"
                    >
                        <RiSideBarLine size={17} />
                    </button>
                )}
            </div>
            {collapsed ? (
                <button
                    aria-label={nav.collapse.value}
                    className="dash-nav"
                    onClick={toggleCollapsed}
                    title={nav.collapse.value}
                    type="button"
                >
                    <RiArrowRightSLine className="shrink-0" size={17} />
                </button>
            ) : (
                <SearchButton />
            )}
            <NavLinks collapsed={collapsed} />
            <UserMenu collapsed={collapsed} />
        </nav>
    );
}
