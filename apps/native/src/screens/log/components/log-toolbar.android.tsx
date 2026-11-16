import { Stack } from "expo-router";

import { toolbarDrawable } from "@/components/toolbar-icon-sources";
import { toolbarIcon } from "@/components/toolbar-icons";
import { LOG_FILTER_ORDER } from "@/domain/log-filter";
import { useTranslation } from "@/i18n/context";

import { FILTER_ICON, FILTER_LABEL_KEY } from "../labels";
import type { LogToolbarProps } from "./log-toolbar";

/** No `tintColor` or `backgroundColor`: on device they hide the menu icons and checkmarks. */
export function LogToolbar({ filter, onFilter, onSearch }: LogToolbarProps) {
    const t = useTranslation();
    return (
        <Stack.Toolbar placement="right">
            <Stack.Toolbar.Button accessibilityLabel={t("log.toolbar.search")} onPress={onSearch}>
                <Stack.Toolbar.Icon {...toolbarIcon("search")} />
            </Stack.Toolbar.Button>
            <Stack.Toolbar.Menu accessibilityLabel={t("log.toolbar.filter")}>
                <Stack.Toolbar.Icon {...toolbarIcon(filter === "all" ? "filter" : "filterActive")} />
                <Stack.Toolbar.Menu inline title={t("log.toolbar.show")}>
                    {LOG_FILTER_ORDER.map((option) => (
                        <Stack.Toolbar.MenuAction
                            icon={toolbarDrawable(FILTER_ICON[option])}
                            iconRenderingMode="template"
                            isOn={option === filter}
                            key={option}
                            onPress={() => onFilter(option)}
                        >
                            {t(FILTER_LABEL_KEY[option])}
                        </Stack.Toolbar.MenuAction>
                    ))}
                </Stack.Toolbar.Menu>
            </Stack.Toolbar.Menu>
        </Stack.Toolbar>
    );
}
