import { useIsFocused } from "expo-router";
import { useEffect, useState } from "react";

import { useSentenceShake } from "@/components/sentence/use-sentence-shake";
import { overBudgetMomentKey } from "@/lib/over-budget-moment";
import { useHaptics } from "@/lib/use-haptics";
import { claimOverBudgetMomentCommand, runSurfacesCommand } from "@/state/surfaces-commands";

export function useOverBudgetMoment(budgetId: string, overBudget: boolean, windowStart: Date) {
    const haptics = useHaptics();
    const focused = useIsFocused();
    const [crossed, setCrossed] = useState(false);
    const key = overBudget ? overBudgetMomentKey(budgetId, windowStart) : null;

    // oxlint-disable-next-line outlayr/react-effect-budget -- claims the over-budget moment in the local database while the budget is on screen, then plays the warning haptic
    useEffect(() => {
        if (key === null || !focused) {
            return;
        }
        let alive = true;
        runSurfacesCommand(claimOverBudgetMomentCommand, key)
            .then((first) => {
                if (first && alive) {
                    setCrossed(true);
                    haptics("warning");
                }
            })
            .catch(() => undefined);
        return () => {
            alive = false;
        };
    }, [focused, haptics, key]);

    return useSentenceShake(crossed);
}
