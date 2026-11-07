import type { ReactNode } from "react";

import { accentCss } from "@/lib/accent";
import { LedgerSettingsContext, useLedgerSettings } from "@/lib/ledger-settings";

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

export function DashboardShell({ children }: { children: ReactNode }) {
    const settings = useLedgerSettings();
    return (
        <LedgerSettingsContext value={settings}>
            <style>{accentCss(settings.accent)}</style>
            <div className="app-shell ph-no-capture flex h-dvh">
                <Sidebar />
                <div
                    className="min-w-0 flex-1 [scrollbar-gutter:stable] overflow-y-auto overscroll-contain outline-none"
                    data-scroll-restoration-id="dashboard-content"
                    ref={forwardScrollKeys}
                    tabIndex={-1}
                >
                    {children}
                </div>
            </div>
        </LedgerSettingsContext>
    );
}
