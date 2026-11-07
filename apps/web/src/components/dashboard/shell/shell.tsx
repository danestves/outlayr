import type { ReactNode } from "react";

import { accentCss } from "@/lib/accent";
import { LedgerSettingsContext, useLedgerSettings } from "@/lib/ledger-settings";

import { Sidebar } from "./sidebar";

export function DashboardShell({ children }: { children: ReactNode }) {
    const settings = useLedgerSettings();
    return (
        <LedgerSettingsContext value={settings}>
            <style>{accentCss(settings.accent)}</style>
            <div className="app-shell ph-no-capture flex min-h-dvh">
                <Sidebar />
                <div className="min-w-0 flex-1">{children}</div>
            </div>
        </LedgerSettingsContext>
    );
}
