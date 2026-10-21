import type { Stack } from "expo-router";
import type { ComponentProps } from "react";

import type { ToolbarIconName } from "@/components/toolbar-icons";

import type { TransactionFormCtaProps } from "./cta";

export interface TransactionFormCtaAction {
    accessibilityLabel: string;
    disabled: boolean;
    icon: ToolbarIconName;
    key: "delete" | "lookup" | "save";
    onPress: () => void;
    tintColor?: string;
    variant?: ComponentProps<typeof Stack.Toolbar.Button>["variant"];
}

// Its own module so `cta.tsx` and `cta.android.tsx` export the same names; only the iOS bar draws from it.
export function transactionFormCtaActions({
    deleteLabel,
    deleteTint,
    onDelete,
    lookupBusy,
    lookupLabel,
    onLookup,
    save,
}: TransactionFormCtaProps): TransactionFormCtaAction[] {
    const actions: TransactionFormCtaAction[] = [];
    if (onLookup) {
        actions.push({
            accessibilityLabel: lookupLabel ?? "",
            disabled: lookupBusy === true,
            icon: "search",
            key: "lookup",
            onPress: onLookup,
        });
    }
    if (onDelete) {
        actions.push({
            accessibilityLabel: deleteLabel ?? "",
            disabled: false,
            icon: "delete",
            key: "delete",
            onPress: onDelete,
            tintColor: deleteTint,
        });
    }
    if (save) {
        actions.push({
            accessibilityLabel: save.label,
            disabled: save.busy,
            icon: "done",
            key: "save",
            onPress: save.onPress,
            tintColor: save.ready ? undefined : save.blockedTint,
            variant: save.ready ? "done" : undefined,
        });
    }
    return actions;
}
