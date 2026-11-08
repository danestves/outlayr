import { RiAddLine, RiCloseLine, RiMenu2Line, RiSearch2Line } from "@remixicon/react";
import { Link, useLocation } from "@tanstack/react-router";
import { Sheet } from "panelui-web/sheet";
import { useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { LogoMark } from "@/components/logo-mark";

import { UserMenu } from "./account-menu";
import { NavLinks, SearchButton } from "./sidebar";

export function MobileBar() {
    const { add, nav } = useIntlayer("dashboard");
    const path = useLocation({ select: (location) => location.pathname });
    let title: ReactNode = nav.dashboard;
    if (path.endsWith("/insights")) {
        title = nav.insights;
    } else if (path.startsWith("/app/accounts")) {
        title = nav.accounts;
    }
    const [open, setOpen] = useState(false);
    return (
        <header className="dash-mobile-bar bg-background border-border sticky top-0 z-20 flex items-center gap-1 border-b lg:hidden">
            <Sheet onOpenChange={setOpen} open={open} side="left">
                <Sheet.Trigger aria-label={nav.open.value} className="dash-icon-btn">
                    <RiMenu2Line size={21} />
                </Sheet.Trigger>
                <Sheet.Content
                    className="app-shell dash-sheet dash-drawer ph-no-capture bg-background h-auto w-[min(320px,calc(100vw-56px))] px-3 pt-[env(safe-area-inset-top)] pb-[max(12px,env(safe-area-inset-bottom))]"
                    detached={false}
                    showClose={false}
                    onClick={(event) => {
                        if (event.target instanceof Element && event.target.closest("a[href]")) {
                            setOpen(false);
                        }
                    }}
                >
                    <div className="flex h-12 shrink-0 items-center gap-[9px] pr-1.5 pl-2">
                        <Link
                            aria-label={nav.home.value}
                            className="text-app-tint -mx-2.5 flex size-11 items-center justify-center"
                            to="/"
                        >
                            <LogoMark className="size-6" />
                        </Link>
                        <Sheet.Title className="text-[15px] font-semibold">Outlayr</Sheet.Title>
                        <Sheet.Close
                            aria-label={nav.close.value}
                            className="dash-icon-btn text-muted-foreground ml-auto"
                        >
                            <RiCloseLine size={21} />
                        </Sheet.Close>
                    </div>
                    <SearchButton />
                    <div className="-mx-3 min-h-0 flex-1 overflow-y-auto overscroll-contain px-3">
                        <NavLinks collapsed={false} />
                    </div>
                    <div className="border-border -mx-3 flex flex-col border-t px-3 pt-1">
                        <UserMenu collapsed={false} side="top" />
                    </div>
                </Sheet.Content>
            </Sheet>
            <h1 className="min-w-0 truncate text-[17px] font-semibold">{title}</h1>
            <button
                aria-disabled
                aria-label={nav.search.value}
                className="dash-icon-btn text-muted-foreground ml-auto"
                type="button"
            >
                <RiSearch2Line size={20} />
            </button>
            <button
                aria-disabled
                aria-label={add.entry.value}
                className="dash-icon-btn"
                title={add.hint.value}
                type="button"
            >
                <span className="dash-btn size-[34px] justify-center p-0">
                    <RiAddLine size={20} />
                </span>
            </button>
        </header>
    );
}
