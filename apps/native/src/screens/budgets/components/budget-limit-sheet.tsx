import { BottomSheetModal, BottomSheetView } from "@expo/ui/community/bottom-sheet";
import type { ExpenseContribution } from "@outlayr/money/budget-spent";
import { useState } from "react";
import type { Ref } from "react";

import { SheetGestureRoot } from "@/components/sheet-gesture-root";
import { useSheetSurface } from "@/hooks/use-sheet-surface";

import { BudgetLimitBody } from "./budget-limit-body";
import type { LimitCommit, LimitTarget } from "./budget-limit-body";

interface BudgetLimitSheetProps {
    calendar: { firstDayOfMonth: number; firstWeekday: number };
    contributions: readonly ExpenseContribution[];
    currency: string;
    nowMs: number;
    onCommit: (commit: LimitCommit) => void;
    ref?: Ref<BottomSheetModal>;
    target: LimitTarget | null;
}

export function BudgetLimitSheet({
    target,
    contributions,
    currency,
    nowMs,
    calendar,
    onCommit,
    ref,
}: BudgetLimitSheetProps) {
    const sheetSurface = useSheetSurface();
    const [presentation, setPresentation] = useState(0);

    return (
        <BottomSheetModal
            backgroundStyle={{ backgroundColor: sheetSurface }}
            enableDynamicSizing
            enablePanDownToClose
            onDismiss={() => setPresentation((count) => count + 1)}
            ref={ref}
        >
            {/* Sized to its content: a root that doesn't flex (chrome contract 1b). */}
            <SheetGestureRoot style={{}}>
                <BottomSheetView style={{ paddingBottom: 28, paddingTop: 14 }}>
                    {target ? (
                        <BudgetLimitBody
                            calendar={calendar}
                            contributions={contributions}
                            currency={currency}
                            // Limit is in the key because the editor behind can change it, and a foreign-currency
                            // limit moves with the anchor (valued at the window's opening-day rate).
                            key={`${target.categoryId ?? "everything"}:${target.type}:${target.limit}:${presentation}`}
                            nowMs={nowMs}
                            onCommit={onCommit}
                            target={target}
                        />
                    ) : null}
                </BottomSheetView>
            </SheetGestureRoot>
        </BottomSheetModal>
    );
}
