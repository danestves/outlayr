import { NativeTabs } from "expo-router/native-tabs";
import { useMemo } from "react";

import { useDatabase } from "@/contexts/local-data-context";
import { useOverBudgetCount } from "@/data/budgets";
import { useNow } from "@/data/use-now";
import { useTranslation } from "@/i18n/context";
import { NAV_LABEL_FONT, NAV_LABEL_SIZE } from "@/navigation/material-chrome";
import { withAlpha } from "@/theme/shade";
import { useMaterialColors } from "@/theme/use-material-colors";

const PRESSED_ALPHA = 0.1;

export default function TabLayout() {
    const m3 = useMaterialColors();
    const t = useTranslation();
    const db = useDatabase();
    const nowMs = useNow();
    const overBudget = useOverBudgetCount(db, nowMs);

    // The family carries the weight: Android can't pick one out of a named face.
    const labelStyle = useMemo(
        () => ({
            default: { color: m3.onSurfaceVariant, fontFamily: NAV_LABEL_FONT, fontSize: NAV_LABEL_SIZE },
            selected: { color: m3.onSurface },
        }),
        [m3]
    );
    const iconColor = useMemo(() => ({ default: m3.onSurfaceVariant, selected: m3.onSecondaryContainer }), [m3]);

    return (
        <NativeTabs
            backBehavior="initialRoute"
            backgroundColor={m3.surfaceContainer}
            badgeBackgroundColor={m3.error}
            badgeTextColor={m3.onError}
            iconColor={iconColor}
            indicatorColor={m3.secondaryContainer}
            labelStyle={labelStyle}
            labelVisibilityMode="labeled"
            rippleColor={withAlpha(m3.onSurface, PRESSED_ALPHA)}
        >
            <NativeTabs.Trigger name="(transactions)">
                <NativeTabs.Trigger.Icon drawable={{ default: "nano_log", selected: "nano_log_selected" }} />
                <NativeTabs.Trigger.Label>{t("nav.tab.log")}</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="insights">
                <NativeTabs.Trigger.Icon drawable={{ default: "nano_insights", selected: "nano_insights_selected" }} />
                <NativeTabs.Trigger.Label>{t("nav.tab.insights")}</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="budgets">
                <NativeTabs.Trigger.Icon drawable={{ default: "nano_budgets", selected: "nano_budgets_selected" }} />
                <NativeTabs.Trigger.Label>{t("nav.tab.budgets")}</NativeTabs.Trigger.Label>

                {overBudget > 0 ? <NativeTabs.Trigger.Badge>{String(overBudget)}</NativeTabs.Trigger.Badge> : null}
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="settings">
                <NativeTabs.Trigger.Icon drawable={{ default: "nano_settings", selected: "nano_settings_selected" }} />
                <NativeTabs.Trigger.Label>{t("nav.tab.settings")}</NativeTabs.Trigger.Label>
            </NativeTabs.Trigger>
        </NativeTabs>
    );
}
