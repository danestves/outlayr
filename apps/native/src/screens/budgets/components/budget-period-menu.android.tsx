import { Stack } from "expo-router";

import { toolbarIcon } from "@/components/toolbar-icons";
import { useTranslation } from "@/i18n/context";

import type { BudgetPeriodMenuProps } from "./budget-period-menu";

const VIEWS = [
    { labelKey: "budgets.periodName.month", view: "month" },
    { labelKey: "budgets.periodName.year", view: "year" },
] as const;

/** Android drops a label-only root menu, so the calendar icon carries it. */
export function useBudgetPeriodMenu({ onSelect, view }: BudgetPeriodMenuProps) {
    const t = useTranslation();
    return (
        <Stack.Toolbar.Menu accessibilityLabel={t("budgets.periodMenu")}>
            <Stack.Toolbar.Icon {...toolbarIcon("period")} />
            <Stack.Toolbar.Menu inline title={t("budgets.periodMenu")}>
                {VIEWS.map((option) => (
                    <Stack.Toolbar.MenuAction
                        isOn={option.view === view}
                        key={option.view}
                        onPress={() => onSelect(option.view)}
                    >
                        {t(option.labelKey)}
                    </Stack.Toolbar.MenuAction>
                ))}
            </Stack.Toolbar.Menu>
        </Stack.Toolbar.Menu>
    );
}
