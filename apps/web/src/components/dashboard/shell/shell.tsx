import type { ReactNode } from "react";

import { accentCss } from "@/lib/accent";
import { LedgerSettingsContext, useLedgerSettings } from "@/lib/ledger-settings";

import { Rail } from "./rail";

export function DashboardShell({ children }: { children: ReactNode }) {
    const settings = useLedgerSettings();
    return (
        <LedgerSettingsContext value={settings}>
            <style>{accentCss(settings.accent)}</style>
            <div className="app-shell ph-no-capture flex min-h-dvh">
                <Rail />
                <div className="min-w-0 flex-1">{children}</div>
            </div>
        </LedgerSettingsContext>
    );
}
