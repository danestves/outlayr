import type { ActionMenuItem } from "@/components/action-menu";
import type { TranslateFn } from "@/i18n/context";

interface BudgetActionsOptions {
    onChangeLimit: () => void;
    onDelete: () => void;
    t: TranslateFn;
}

/** Delete takes no confirmation: it routes through the undo window. */
export function budgetMenuItems({ onChangeLimit, onDelete, t }: BudgetActionsOptions): ActionMenuItem[] {
    return [
        { icon: "pencil", id: "limit", label: t("budgets.action.changeLimit"), onPress: onChangeLimit },
        {
            destructive: true,
            icon: "trash",
            id: "delete",
            label: t("common.delete"),
            onPress: onDelete,
        },
    ];
}
