import { NavRail } from "panelui-web/nav-rail";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { accentCss } from "@/lib/accent";
import { useProfileMirror } from "@/lib/account-state";
import { LedgerSettingsContext, useLedgerSettings } from "@/lib/ledger-settings";

import { FlowRoot } from "../accounts/flows";
import { MobileBar } from "./mobile-bar";
import { Sidebar } from "./sidebar";
import { OfflineBar } from "./status";

const SCROLL_KEYS = new Set(["ArrowDown", "ArrowUp", "End", "Home", "PageDown", "PageUp", " "]);

function forwardScrollKeys(content: HTMLDivElement | null) {
    const forward = (event: KeyboardEvent) => {
        if (!event.defaultPrevented && SCROLL_KEYS.has(event.key) && document.activeElement?.matches("body, nav a")) {
            content?.focus({ preventScroll: true });
        }
    };
    document.addEventListener("keydown", forward);
    return () => document.removeEventListener("keydown", forward);
}

/** `bare` drops the sidebar and the scroll pane: onboarding owns the whole window. */
export function DashboardShell({ bare = false, children }: { bare?: boolean; children: ReactNode }) {
    const settings = useLedgerSettings();
    const { skip } = useIntlayer("dashboard-shell");
    useProfileMirror();
    if (bare) {
        return (
            <LedgerSettingsContext value={settings}>
                <style>{accentCss(settings.accent)}</style>
                <div className="app-shell ph-no-capture min-h-dvh text-sm">
                    <FlowRoot>{children}</FlowRoot>
                </div>
            </LedgerSettingsContext>
        );
    }
    return (
        <LedgerSettingsContext value={settings}>
            <style>{accentCss(settings.accent)}</style>
            <NavRail.Provider
                className="app-shell ph-no-capture h-dvh min-h-0"
                mobileBreakpoint="64rem"
                storageKey="outlayr-nav-rail"
            >
                <a
                    className="bg-foreground text-background focus:rounded-app-lg fixed top-3 left-3 z-50 -translate-y-24 px-3 py-2 text-sm font-semibold focus:translate-y-0"
                    href="#main"
                >
                    {skip}
                </a>
                <Sidebar />
                <div
                    className="min-w-0 flex-1 [scrollbar-gutter:stable] overflow-x-hidden overflow-y-auto overscroll-contain outline-none"
                    data-scroll-restoration-id="dashboard-content"
                    id="main"
                    ref={forwardScrollKeys}
                    tabIndex={-1}
                >
                    <FlowRoot>
                        <MobileBar />
                        <OfflineBar />
                        {children}
                    </FlowRoot>
                </div>
            </NavRail.Provider>
        </LedgerSettingsContext>
    );
}
