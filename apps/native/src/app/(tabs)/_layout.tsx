import { NativeTabs } from "expo-router/native-tabs";

import { useDatabase } from "@/contexts/local-data-context";
import { useOverBudgetCount } from "@/data/budgets";
import { useReviewCount } from "@/data/review-queue";
import { useNow } from "@/data/use-now";
import { useTranslation } from "@/i18n/context";
import { useResumedImport } from "@/screens/import/use-resumed-import";
import { useColors } from "@/theme/use-colors";
import { TourProvider } from "@/tour/tour-provider";

const LABEL_STYLE = {
    default: { fontWeight: "400" },
    selected: { fontWeight: "600" },
} as const;

export default function TabLayout() {
    useResumedImport();
    const { tint } = useColors();
    const t = useTranslation();
    const db = useDatabase();
    const nowMs = useNow();
    const overBudget = useOverBudgetCount(db, nowMs);
    const toReview = useReviewCount(db);

    return (
        <TourProvider>
            <NativeTabs labelStyle={LABEL_STYLE} tintColor={tint}>
                <NativeTabs.Trigger name="(transactions)">
                    <NativeTabs.Trigger.Icon xcasset={{ default: "nano.log", selected: "nano.log-selected" }} />
                    <NativeTabs.Trigger.Label>{t("nav.tab.log")}</NativeTabs.Trigger.Label>
                    {toReview > 0 ? <NativeTabs.Trigger.Badge>{String(toReview)}</NativeTabs.Trigger.Badge> : null}
                </NativeTabs.Trigger>
                <NativeTabs.Trigger name="insights">
                    <NativeTabs.Trigger.Icon
                        xcasset={{ default: "nano.insights", selected: "nano.insights-selected" }}
                    />
                    <NativeTabs.Trigger.Label>{t("nav.tab.insights")}</NativeTabs.Trigger.Label>
                </NativeTabs.Trigger>
                <NativeTabs.Trigger name="balances">
                    <NativeTabs.Trigger.Icon xcasset={{ default: "nano.budgets", selected: "nano.budgets-selected" }} />
                    <NativeTabs.Trigger.Label>{t("nav.tab.balances")}</NativeTabs.Trigger.Label>

                    {overBudget > 0 ? <NativeTabs.Trigger.Badge>{String(overBudget)}</NativeTabs.Trigger.Badge> : null}
                </NativeTabs.Trigger>
                <NativeTabs.Trigger name="settings">
                    <NativeTabs.Trigger.Icon
                        xcasset={{ default: "nano.settings", selected: "nano.settings-selected" }}
                    />
                    <NativeTabs.Trigger.Label>{t("nav.tab.settings")}</NativeTabs.Trigger.Label>
                </NativeTabs.Trigger>
            </NativeTabs>
        </TourProvider>
    );
}
