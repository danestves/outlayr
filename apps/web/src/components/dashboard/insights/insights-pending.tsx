import { useLocation } from "@tanstack/react-router";
import { useIntlayer } from "react-intlayer";

import { Sampled, useSample } from "@/components/dashboard/shell/sampled";
import { DashboardShell } from "@/components/dashboard/shell/shell";

import { HeldBar } from "./bar";
import { BreakdownScreen } from "./breakdown/screen";
import { CashFlowScreen } from "./flow/screen";
import { PhoneInsights } from "./insights-screen";
import { OverviewScreen } from "./overview/screen";
import { RecapScreen } from "./recap/screen";
import { ReportsScreen } from "./reports/screen";
import { usePhone } from "./use-wide";
import { YearScreen } from "./year/screen";

const SCREENS = {
    breakdown: BreakdownScreen,
    "cash-flow": CashFlowScreen,
    recap: RecapScreen,
    reports: ReportsScreen,
    year: YearScreen,
};

const isScreen = (tab: string): tab is keyof typeof SCREENS => Object.hasOwn(SCREENS, tab);

export function InsightsPending() {
    const { loadingLabel } = useIntlayer("dashboard");
    const sample = useSample();
    const phone = usePhone();
    const tab = useLocation({ select: (location) => location.pathname.split("/")[3] ?? "" });
    const Screen = isScreen(tab) ? SCREENS[tab] : OverviewScreen;
    if (phone) {
        return (
            <Sampled label={loadingLabel.value} sample={sample}>
                <PhoneInsights />
            </Sampled>
        );
    }
    return (
        <main className="@container flex min-h-full min-w-0 flex-col px-4 pb-5 sm:px-6">
            <HeldBar>
                <Sampled label={loadingLabel.value} sample={sample}>
                    <Screen />
                </Sampled>
            </HeldBar>
        </main>
    );
}

export function InsightsFirstVisit() {
    return (
        <DashboardShell>
            <InsightsPending />
        </DashboardShell>
    );
}
