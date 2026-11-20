import Analytics01Icon from "@hugeicons/core-free-icons/Analytics01Icon";
import CalendarCheckIn01Icon from "@hugeicons/core-free-icons/CalendarCheckIn01Icon";
import Cancel01Icon from "@hugeicons/core-free-icons/Cancel01Icon";
import CreditCardIcon from "@hugeicons/core-free-icons/CreditCardIcon";
import DashboardSquare01Icon from "@hugeicons/core-free-icons/DashboardSquare01Icon";
import Flag02Icon from "@hugeicons/core-free-icons/Flag02Icon";
import HandCoinsIcon from "@hugeicons/core-free-icons/HandCoinsIcon";
import MagicWand01Icon from "@hugeicons/core-free-icons/MagicWand01Icon";
import PieChartIcon from "@hugeicons/core-free-icons/PieChartIcon";
import RepeatIcon from "@hugeicons/core-free-icons/RepeatIcon";
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import TransactionHistoryIcon from "@hugeicons/core-free-icons/TransactionHistoryIcon";
import Upload04Icon from "@hugeicons/core-free-icons/Upload04Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import { Link, useLocation } from "@tanstack/react-router";
import { NavRail, useNavRail } from "panelui-web/nav-rail";
import { useIntlayer } from "react-intlayer";

import { LogoMark } from "@/components/logo-mark";

import { UserMenu } from "./account-menu";
import { setPaletteOpen } from "./palette-open";
import { useReviewCount } from "./review-count";

type Path =
    | "/"
    | "/accounts"
    | "/budgets"
    | "/debts"
    | "/goals"
    | "/import"
    | "/installments"
    | "/insights"
    | "/recurring"
    | "/rules"
    | "/transactions";

const COUNT =
    "h-4.5 min-w-4.5 rounded-app-xs! bg-app-count font-app-mono leading-4.5 text-app-on-count group-data-[active]/item:bg-app-count group-data-[active]/item:text-app-on-count";

function Destination({
    count = null,
    icon,
    label,
    to,
}: {
    count?: number | null;
    icon: IconSvgElement;
    label: string;
    to: Path;
}) {
    const active = useLocation({
        select: ({ pathname }) => (to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`)),
    });
    return (
        <NavRail.Item
            active={active}
            href={to}
            icon={<HugeiconsIcon icon={icon} size={18} strokeWidth={1.5} />}
            render={<Link to={to} />}
        >
            {label}
            {count ? <NavRail.Badge className={COUNT}>{count}</NavRail.Badge> : null}
        </NavRail.Item>
    );
}

function Search({ onOpen }: { onOpen: () => void }) {
    const { nav } = useIntlayer("dashboard");
    return (
        <NavRail.Item
            className="[&_[data-slot=nav-rail-label]]:flex [&_[data-slot=nav-rail-label]]:items-center"
            icon={<HugeiconsIcon icon={Search01Icon} size={18} strokeWidth={1.5} />}
            label={nav.search.value}
            onClick={() => {
                onOpen();
                setPaletteOpen(true);
            }}
        >
            {nav.search}
            <kbd className="border-border bg-app-fill rounded-app-xs text-app-caption ml-auto border px-1.5 font-mono pointer-coarse:hidden">
                ⌘K
            </kbd>
        </NavRail.Item>
    );
}

function Fold() {
    const { nav } = useIntlayer("dashboard");
    const { mobile } = useNavRail();
    return (
        <NavRail.Trigger collapseLabel={mobile ? nav.close.value : nav.collapse.value} expandLabel={nav.collapse.value}>
            {mobile ? <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={1.5} /> : undefined}
        </NavRail.Trigger>
    );
}

export function Sidebar() {
    const { nav } = useIntlayer("dashboard");
    const { collapsed, mobile, setMobileOpen } = useNavRail();
    const toReview = useReviewCount();
    const close = () => setMobileOpen(false);
    return (
        <NavRail
            aria-label={nav.label.value}
            className="app-shell ph-no-capture max-lg:not-data-mobile:hidden lg:my-2 lg:ms-2 lg:h-auto"
        >
            <NavRail.Header>
                <NavRail.Brand
                    href="/"
                    icon={<LogoMark />}
                    label={nav.home.value}
                    onClick={close}
                    render={<Link to="/" />}
                >
                    Outlayr
                </NavRail.Brand>
                <Fold />
            </NavRail.Header>
            <NavRail.Content>
                <Search onOpen={close} />
                <NavRail.Group label={nav.label.value}>
                    <Destination icon={DashboardSquare01Icon} label={nav.dashboard.value} to="/" />
                    <Destination
                        count={toReview}
                        icon={TransactionHistoryIcon}
                        label={nav.transactions.value}
                        to="/transactions"
                    />
                    <Destination icon={CreditCardIcon} label={nav.accounts.value} to="/accounts" />
                    <Destination icon={Analytics01Icon} label={nav.insights.value} to="/insights" />
                </NavRail.Group>
                <NavRail.Group label={nav.plan.value}>
                    <Destination icon={PieChartIcon} label={nav.budgets.value} to="/budgets" />
                    <Destination icon={Flag02Icon} label={nav.goals.value} to="/goals" />
                    <Destination icon={RepeatIcon} label={nav.recurring.value} to="/recurring" />
                    <Destination icon={HandCoinsIcon} label={nav.debts.value} to="/debts" />
                    <Destination icon={CalendarCheckIn01Icon} label={nav.installments.value} to="/installments" />
                </NavRail.Group>
                <NavRail.Group label={nav.tools.value}>
                    <Destination icon={Upload04Icon} label={nav.import.value} to="/import" />
                    <Destination icon={MagicWand01Icon} label={nav.rules.value} to="/rules" />
                </NavRail.Group>
            </NavRail.Content>
            {mobile ? null : (
                <NavRail.Footer>
                    <UserMenu collapsed={collapsed} />
                </NavRail.Footer>
            )}
            <NavRail.Rail label={nav.collapse.value} />
        </NavRail>
    );
}
