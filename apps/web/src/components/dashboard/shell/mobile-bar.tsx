import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import Menu01Icon from "@hugeicons/core-free-icons/Menu01Icon";
import Search01Icon from "@hugeicons/core-free-icons/Search01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link, useLocation } from "@tanstack/react-router";
import { Button } from "panelui-web/button";
import { Sheet } from "panelui-web/sheet";
import { useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { useOpenFlow } from "@/components/dashboard/accounts/flows";
import { LogoMark } from "@/components/logo-mark";

import { UserMenu } from "./account-menu";
import { NavLinks, SearchButton } from "./sidebar";

export function MobileBar() {
    const { account, add, nav } = useIntlayer("dashboard");
    const openFlow = useOpenFlow();
    const page = useLocation({ select: (location) => location.pathname.split("/")[2] });
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
    } else if (page === "debts") {
        title = nav.debts;
    } else if (page === "settings") {
        title = account.settings;
    }
    const [open, setOpen] = useState(false);
    return (
        <header className="dash-mobile-bar bg-background border-border sticky top-0 z-20 flex items-center gap-1 border-b lg:hidden">
            <Sheet onOpenChange={setOpen} open={open} side="left">
                <Sheet.Trigger aria-label={nav.open.value} render={<Button size="icon-lg" variant="ghost" />}>
                    <HugeiconsIcon icon={Menu01Icon} strokeWidth={2} />
                </Sheet.Trigger>
                <Sheet.Content
                    className="app-shell dash-drawer ph-no-capture w-[min(320px,calc(100vw-56px))]"
                    detached={false}
                    onClick={(event) => {
                        if (event.target instanceof Element && event.target.closest("a[href]")) {
                            setOpen(false);
                        }
                    }}
                >
                    <Sheet.Header
                        title={
                            <span className="flex items-center gap-[9px] text-[15px] font-semibold">
                                <Link aria-label={nav.home.value} className="text-app-tint -m-2.5 p-2.5" to="/">
                                    <LogoMark className="size-6" />
                                </Link>
                                Outlayr
                            </span>
                        }
                    />
                    <div className="shrink-0 px-3">
                        <SearchButton />
                    </div>
                    <Sheet.Body className="min-h-0 flex-1 overscroll-contain px-3 pb-2">
                        <NavLinks collapsed={false} />
                    </Sheet.Body>
                    <Sheet.Footer className="border-border border-t px-3 pt-1 pb-[max(12px,env(safe-area-inset-bottom))]">
                        <UserMenu collapsed={false} side="top" />
                    </Sheet.Footer>
                </Sheet.Content>
            </Sheet>
            <h1 className="min-w-0 truncate text-[17px] font-semibold">{title}</h1>
            <Button
                aria-disabled
                aria-label={nav.search.value}
                className="text-muted-foreground ml-auto"
                size="icon-lg"
                variant="ghost"
            >
                <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
            </Button>
            <Button
                aria-label={add.entry.value}
                className="mx-[5px]"
                onClick={() => openFlow({ kind: "entry" })}
                size="icon"
            >
                <HugeiconsIcon icon={Add01Icon} size={20} strokeWidth={2} />
            </Button>
        </header>
    );
}
