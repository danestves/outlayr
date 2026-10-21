import { NativeTabs } from "expo-router/native-tabs";

import { useDatabase } from "@/contexts/local-data-context";
import { useOverBudgetCount } from "@/data/budgets";
import { useNow } from "@/data/use-now";
import { useTranslation } from "@/i18n/context";
import { useColors } from "@/theme/use-colors";

const LABEL_STYLE = {
    default: { fontWeight: "400" },
    selected: { fontWeight: "600" },
} as const;

export default function TabLayout() {
    const { tint } = useColors();
    const t = useTranslation();
    const db = useDatabase();
    const nowMs = useNow();
    const overBudget = useOverBudgetCount(db, nowMs);

    return (
        <NativeTabs labelStyle={LABEL_STYLE} tintColor={tint}>
            <NativeTabs.Trigger name="(transactions)">
                <NativeTabs.Trigger.Icon xcasset={{ default: "nano.log", selected: "nano.log-selected" }} />
                <NativeTabs.Trigger.Label>{t("nav.tab.log")}</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="insights">
                <NativeTabs.Trigger.Icon xcasset={{ default: "nano.insights", selected: "nano.insights-selected" }} />
                <NativeTabs.Trigger.Label>{t("nav.tab.insights")}</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="budgets">
                <NativeTabs.Trigger.Icon xcasset={{ default: "nano.budgets", selected: "nano.budgets-selected" }} />
                <NativeTabs.Trigger.Label>{t("nav.tab.budgets")}</NativeTabs.Trigger.Label>

                {overBudget > 0 ? <NativeTabs.Trigger.Badge>{String(overBudget)}</NativeTabs.Trigger.Badge> : null}
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="settings">
                <NativeTabs.Trigger.Icon xcasset={{ default: "nano.settings", selected: "nano.settings-selected" }} />
                <NativeTabs.Trigger.Label>{t("nav.tab.settings")}</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
        </NativeTabs>
    );
}
