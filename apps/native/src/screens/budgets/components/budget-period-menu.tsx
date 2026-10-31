import { Stack } from "expo-router";

import { useTranslation } from "@/i18n/context";

export type BudgetsView = "month" | "year";

export interface BudgetPeriodMenuProps {
    onSelect: (view: BudgetsView) => void;
    view: BudgetsView;
}

const VIEWS = [
    { labelKey: "budgets.periodName.month", view: "month" },
    { labelKey: "budgets.periodName.year", view: "year" },
] as const;

/** Returns the element, not a component: a toolbar only accepts its own element types as children. */
export function useBudgetPeriodMenu({ onSelect, view }: BudgetPeriodMenuProps) {
    const t = useTranslation();
    return (
        <Stack.Toolbar.Menu accessibilityLabel={t("budgets.periodMenu")}>
            <Stack.Toolbar.Label>
                {t(view === "year" ? "budgets.periodName.year" : "budgets.periodName.month")}
            </Stack.Toolbar.Label>
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
