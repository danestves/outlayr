import { Stack } from "expo-router";

import { toolbarIcon } from "@/components/toolbar-icons";
import type { LogMenuFilter } from "@/domain/log-filter";
import { LOG_FILTER_ORDER } from "@/domain/log-filter";
import { useTranslation } from "@/i18n/context";

import { FILTER_ICON, FILTER_LABEL_KEY } from "../labels";

export interface LogToolbarProps {
    filter: LogMenuFilter;
    onFilter: (filter: LogMenuFilter) => void;
    onSearch: () => void;
}

/** Rendered from the screen: the filter menu reads and writes screen state. */
export function LogToolbar({ filter, onFilter, onSearch }: LogToolbarProps) {
    const t = useTranslation();
    return (
        <>
            <Stack.Toolbar placement="left">
                <Stack.Toolbar.Button accessibilityLabel={t("log.toolbar.search")} onPress={onSearch}>
                    <Stack.Toolbar.Icon {...toolbarIcon("search")} />
                </Stack.Toolbar.Button>
            </Stack.Toolbar>
            <Stack.Toolbar placement="right">
                <Stack.Toolbar.Menu accessibilityLabel={t("log.toolbar.filter")}>
                    <Stack.Toolbar.Icon {...toolbarIcon(filter === "all" ? "filter" : "filterActive")} />
                    <Stack.Toolbar.Menu inline title={t("log.toolbar.show")}>
                        {LOG_FILTER_ORDER.map((option) => (
                            <Stack.Toolbar.MenuAction
                                key={option}
                                isOn={option === filter}
                                onPress={() => onFilter(option)}
                            >
                                <Stack.Toolbar.Icon {...toolbarIcon(FILTER_ICON[option])} />
                                {t(FILTER_LABEL_KEY[option])}
                            </Stack.Toolbar.MenuAction>
                        ))}
                    </Stack.Toolbar.Menu>
                </Stack.Toolbar.Menu>
            </Stack.Toolbar>
        </>
    );
}
