import { Stack } from "expo-router";

import type { TranslateFn } from "@/i18n/context";

import type { PayoffPlanControls } from "./use-payoff-plan";

/** Elements, not a component: the toolbar menu keeps only children that are menu actions themselves. */
export function payoffMenuActions(plan: PayoffPlanControls, setLabel: string, t: TranslateFn) {
    if (plan.live) {
        return [
            <Stack.Toolbar.MenuAction icon="calendar" key="change" onPress={plan.open}>
                {t("debts.plan.change")}
            </Stack.Toolbar.MenuAction>,
            <Stack.Toolbar.MenuAction icon="calendar.badge.minus" key="remove" onPress={plan.remove}>
                {t("debts.plan.remove")}
            </Stack.Toolbar.MenuAction>,
        ];
    }
    return plan.canSet
        ? [
              <Stack.Toolbar.MenuAction icon="calendar.badge.plus" key="set" onPress={plan.open}>
                  {setLabel}
              </Stack.Toolbar.MenuAction>,
          ]
        : [];
}
