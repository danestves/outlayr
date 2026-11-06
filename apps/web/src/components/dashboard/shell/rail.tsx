import DashboardIcon from "@hugeicons/core-free-icons/DashboardSquare01Icon";
import InsightsIcon from "@hugeicons/core-free-icons/PieChartIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { useIntlayer } from "react-intlayer";

import { LogoMark } from "@/components/logo-mark";

import { AccountMenu } from "./account-menu";

interface RailLinkProps {
    exact?: boolean;
    icon: IconSvgElement;
    label: string;
    to: "/app" | "/app/insights";
}

function RailLink({ exact = false, icon, label, to }: RailLinkProps) {
    return (
        <Link
            activeOptions={{ exact }}
            aria-label={label}
            className="text-muted-foreground hover:text-foreground data-[status=active]:bg-muted data-[status=active]:text-foreground grid size-9 place-items-center rounded-[10px]"
            title={label}
            to={to}
        >
            <HugeiconsIcon className="size-[18px]" icon={icon} />
        </Link>
    );
}

export function Rail() {
    const { nav } = useIntlayer("dashboard");
    return (
        <nav
            aria-label={nav.label.value}
            className="border-border sticky top-0 flex h-dvh w-[60px] shrink-0 flex-col items-center gap-2 border-r py-3.5"
        >
            <Link aria-label={nav.home.value} className="mb-3 grid size-9 place-items-center" to="/">
                <LogoMark className="size-6" />
            </Link>
            <RailLink exact icon={DashboardIcon} label={nav.dashboard.value} to="/app" />
            <RailLink icon={InsightsIcon} label={nav.insights.value} to="/app/insights" />
            <div className="mt-auto">
                <AccountMenu />
            </div>
        </nav>
    );
}
