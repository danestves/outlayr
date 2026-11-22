import { useIsFocused } from "expo-router";
import { useState } from "react";

import { useSentenceShake } from "@/components/sentence/use-sentence-shake";
import { useMirror } from "@/lib/lifecycle";
import { overBudgetMomentKey } from "@/lib/over-budget-moment";
import { useHaptics } from "@/lib/use-haptics";
import { SILENT } from "@/state/atom-command";
import { appAtomRegistry } from "@/state/atom-registry";
import { claimOverBudgetMomentCommand } from "@/state/surfaces-commands";
import { fireAtomCommand } from "@/state/use-atom-action";

export function useOverBudgetMoment(budgetId: string, overBudget: boolean, windowStart: Date) {
    const haptics = useHaptics();
    const focused = useIsFocused();
    const [crossed, setCrossed] = useState(false);
    const key = overBudget ? overBudgetMomentKey(budgetId, windowStart) : null;

    useMirror([focused, haptics, key], () => {
        if (key === null || !focused) {
            return;
        }
        let alive = true;
        fireAtomCommand(
            appAtomRegistry,
            claimOverBudgetMomentCommand,
            key,
            {
                onSuccess: (first) => {
                    if (first && alive) {
                        setCrossed(true);
                        haptics("warning");
                    }
                },
            },
            SILENT
        );
        return () => {
            alive = false;
        };
    });

    return useSentenceShake(crossed);
}
