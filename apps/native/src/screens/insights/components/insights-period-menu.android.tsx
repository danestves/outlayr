import { Stack } from "expo-router";

import { toolbarIcon } from "@/components/toolbar-icons";
import { useTranslation } from "@/i18n/context";

import { MEASURE_KEY } from "../measure-label";
import { PERIODS } from "../periods";
import type { InsightsPeriodMenuProps } from "./insights-period-menu";

/** Android drops a label-only root menu; toolbar colours would hide the check. */
export function InsightsPeriodMenu({ measure, measures, onMeasure, onSelect, period }: InsightsPeriodMenuProps) {
    const t = useTranslation();
    return (
        <Stack.Toolbar placement="right">
            <Stack.Toolbar.Menu accessibilityLabel={t("insights.period.change")}>
                <Stack.Toolbar.Icon {...toolbarIcon("period")} />
                <Stack.Toolbar.Menu inline title={t("insights.menu.period")}>
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
                {measures.length > 0 ? (
                    <Stack.Toolbar.Menu inline title={t("insights.menu.show")}>
                        {measures.map((option) => (
                            <Stack.Toolbar.MenuAction
                                isOn={option === measure}
                                key={option}
                                onPress={() => onMeasure(option)}
                            >
                                {t(MEASURE_KEY[option])}
                            </Stack.Toolbar.MenuAction>
                        ))}
                    </Stack.Toolbar.Menu>
                ) : null}
            </Stack.Toolbar.Menu>
        </Stack.Toolbar>
    );
}
