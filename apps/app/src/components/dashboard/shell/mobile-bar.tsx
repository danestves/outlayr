import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import SidebarLeftIcon from "@hugeicons/core-free-icons/SidebarLeftIcon";
import { HugeiconsIcon } from "@hugeicons/react";
import { useLocation } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import { NavRail } from "panelui-web/nav-rail";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { useOpenFlow } from "@/components/dashboard/accounts/flows";
import { IconButton } from "@/components/ui/icon-button";

import { AccountSheet } from "./account-menu";

export function MobileBar() {
    const { account, nav } = useIntlayer("dashboard");
    const page = useLocation({ select: (location) => location.pathname.split("/")[1] });
    let title: ReactNode = nav.dashboard;
    if (page === "insights") {
        title = nav.insights;
    } else if (page === "accounts") {
        title = nav.accounts;
    } else if (page === "transactions") {
        title = nav.transactions;
    } else if (page === "recurring") {
        title = nav.recurring;
    } else if (page === "rules") {
        title = nav.rules;
    } else if (page === "goals") {
        title = nav.goals;
    } else if (page === "budgets") {
        title = nav.budgets;
    } else if (page === "debts") {
        title = nav.debts;
    } else if (page === "installments") {
        title = nav.installments;
    } else if (page === "settings") {
        title = account.settings;
    }
    return (
        <header className="dash-mobile-bar bg-background border-border sticky top-0 z-20 flex items-center gap-1 border-b lg:hidden">
            <NavRail.Trigger
                collapseLabel={nav.close.value}
                expandLabel={nav.open.value}
                render={<Button size="icon-lg" variant="ghost" />}
            >
                <HugeiconsIcon icon={SidebarLeftIcon} strokeWidth={2} />
            </NavRail.Trigger>
            <h1 className="min-w-0 truncate text-[17px] font-semibold">{title}</h1>
            <IconButton
                aria-disabled
                className="text-muted-foreground ml-auto"
                icon={Search01Icon}
                label={nav.search.value}
                size="lg"
            />
            <AccountSheet />
        </header>
    );
}

export function AddButton() {
    const { add } = useIntlayer("dashboard");
    const openFlow = useOpenFlow();
    return (
        <Button
            aria-label={add.entry.value}
            className="fixed right-4 bottom-[max(16px,env(safe-area-inset-bottom))] z-30 size-14 rounded-full shadow-lg lg:hidden"
            onClick={() => openFlow({ kind: "entry" })}
        >
            <HugeiconsIcon icon={Add01Icon} size={24} strokeWidth={2} />
        </Button>
    );
}
