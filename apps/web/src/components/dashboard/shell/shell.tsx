import type { ReactNode } from "react";

import { accentCss } from "@/lib/accent";
import { useProfileMirror } from "@/lib/account-state";
import { LedgerSettingsContext, useLedgerSettings } from "@/lib/ledger-settings";

import { FlowRoot } from "../accounts/flows";
import { MobileBar } from "./mobile-bar";
import { Sidebar } from "./sidebar";

const SCROLL_KEYS = new Set(["ArrowDown", "ArrowUp", "End", "Home", "PageDown", "PageUp", " "]);

function forwardScrollKeys(content: HTMLDivElement | null) {
    const forward = (event: KeyboardEvent) => {
        if (SCROLL_KEYS.has(event.key) && document.activeElement?.matches("body, nav a")) {
            content?.focus({ preventScroll: true });
        }
    };
    document.addEventListener("keydown", forward);
    return () => document.removeEventListener("keydown", forward);
}

/** `bare` drops the sidebar and the scroll pane: onboarding owns the whole window. */
export function DashboardShell({ bare = false, children }: { bare?: boolean; children: ReactNode }) {
    const settings = useLedgerSettings();
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
            <div className="app-shell ph-no-capture flex h-dvh">
                <Sidebar />
                <div
                    className="min-w-0 flex-1 [scrollbar-gutter:stable] overflow-x-hidden overflow-y-auto overscroll-contain outline-none"
                    data-scroll-restoration-id="dashboard-content"
                    ref={forwardScrollKeys}
                    tabIndex={-1}
                >
                    <FlowRoot>
                        <MobileBar />
                        {children}
                    </FlowRoot>
                </div>
            </div>
        </LedgerSettingsContext>
    );
}
