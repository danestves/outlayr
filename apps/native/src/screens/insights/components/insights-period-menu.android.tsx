import { Stack } from "expo-router";

import { toolbarIcon } from "@/components/toolbar-icons";
import { useTranslation } from "@/i18n/context";

import { PERIODS } from "../periods";
import type { InsightsPeriodMenuProps } from "./insights-period-menu";

/** Android drops a label-only root menu; toolbar colours would hide the check. */
export function InsightsPeriodMenu({ period, onSelect }: InsightsPeriodMenuProps) {
    const t = useTranslation();
    return (
        <Stack.Toolbar placement="right">
            <Stack.Toolbar.Menu accessibilityLabel={t("insights.period.change")}>
                <Stack.Toolbar.Icon {...toolbarIcon("period")} />
                {PERIODS.map((option) => (
                    <Stack.Toolbar.MenuAction
                        isOn={option.period === period}
                        key={option.value}
                        onPress={() => onSelect(option.value)}
                    >
                        {t(option.labelKey)}
                    </Stack.Toolbar.MenuAction>
                ))}
            </Stack.Toolbar.Menu>
        </Stack.Toolbar>
    );
}
