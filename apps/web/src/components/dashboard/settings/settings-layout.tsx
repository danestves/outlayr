import { useLocation } from "@tanstack/react-router";
import { Toast } from "panelui-web/toast";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { Sampled, useSample } from "@/components/dashboard/shell/sampled";
import { DashboardShell } from "@/components/dashboard/shell/shell";

import { AboutSettings } from "./about/screen";
import { Account } from "./account";
import { Categories } from "./categories/screen";
import { settingsToasts } from "./categories/write";
import { Currency } from "./currency";
import { DataSettings } from "./data/screen";
import { Invite } from "./invite";
import { SettingsNav } from "./nav";
import { Preferences } from "./preferences";
import { Time } from "./time";
import { Usage } from "./usage";

export function SettingsLayout({ children }: { children: ReactNode }) {
    const { title } = useIntlayer("dashboard-settings");
    return (
        <Toast.Provider position="bottom-center" toastManager={settingsToasts}>
            <div className="flex min-h-full min-w-0">
                <aside className="border-border sticky top-0 h-dvh w-[208px] shrink-0 border-r px-3 max-lg:hidden">
                    <h1 className="flex h-16 items-center px-2.5 text-lg font-semibold tracking-[-0.02em]">{title}</h1>
                    <SettingsNav />
                </aside>
                <main className="@container min-w-0 flex-1 px-4 pb-5 sm:px-6">{children}</main>
            </div>
        </Toast.Provider>
    );
}

const SECTIONS = {
    about: AboutSettings,
    account: Account,
    categories: Categories,
    currency: Currency,
    data: DataSettings,
    invite: Invite,
    preferences: Preferences,
    time: Time,
    usage: Usage,
} as const;

const isSection = (name: string | undefined): name is keyof typeof SECTIONS => name !== undefined && name in SECTIONS;

export function SettingsPending() {
    const { loadingLabel } = useIntlayer("dashboard");
    const sample = useSample();
    const name = useLocation({ select: (location) => location.pathname.split("/")[3] });
    const Section = isSection(name) ? SECTIONS[name] : undefined;
    return (
        <SettingsLayout>
            {Section ? (
                <Sampled label={loadingLabel.value} sample={sample}>
                    <Section />
                </Sampled>
            ) : (
                <SettingsNav list />
            )}
        </SettingsLayout>
    );
}

export function SettingsFirstVisit() {
    return (
        <DashboardShell>
            <SettingsPending />
        </DashboardShell>
    );
}
