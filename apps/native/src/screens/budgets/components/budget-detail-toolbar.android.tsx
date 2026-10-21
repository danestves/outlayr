import { Stack } from "expo-router";

import { toolbarDrawable } from "@/components/toolbar-icon-sources";
import { toolbarIcon } from "@/components/toolbar-icons";
import { useTranslation } from "@/i18n/context";

import type { BudgetDetailToolbarProps } from "./budget-detail-toolbar";

export type { BudgetDetailToolbarProps } from "./budget-detail-toolbar";

/**
 * Android drops SF Symbol names, so the delete glyph is an image. No `tintColor` or `backgroundColor` on the
 * toolbar: on Android they stop the menu items' icons and checkmarks from drawing.
 */
export function BudgetDetailToolbar({ onDelete }: BudgetDetailToolbarProps) {
    const t = useTranslation();
    return (
        <Stack.Toolbar placement="right">
            <Stack.Toolbar.Menu accessibilityLabel={t("budgets.action.moreA11y")}>
                <Stack.Toolbar.Icon {...toolbarIcon("more")} />
                <Stack.Toolbar.MenuAction
                    destructive
                    icon={toolbarDrawable("delete")}
                    iconRenderingMode="template"
                    onPress={onDelete}
                >
                    {t("common.delete")}
                </Stack.Toolbar.MenuAction>
            </Stack.Toolbar.Menu>
        </Stack.Toolbar>
    );
}
