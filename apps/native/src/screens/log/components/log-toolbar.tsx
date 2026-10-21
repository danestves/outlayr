import { Stack } from "expo-router";

import { toolbarIcon } from "@/components/toolbar-icons";
import type { LogPeriod } from "@/data/log-totals";
import { LOG_PERIOD_ORDER } from "@/data/log-totals";
import type { LogFilter } from "@/domain/log-filter";
import { LOG_FILTER_ORDER } from "@/domain/log-filter";
import { useTranslation } from "@/i18n/context";

import { FILTER_ICON, FILTER_LABEL_KEY, PERIOD_PHRASE_KEY } from "../labels";

export interface LogToolbarProps {
    filter: LogFilter;
    onFilter: (filter: LogFilter) => void;
    onPeriod: (period: LogPeriod) => void;
    onSearch: () => void;
    period: LogPeriod;
}

/** Rendered from the screen: both menus read and write screen state. */
export function LogToolbar({ period, onPeriod, filter, onFilter, onSearch }: LogToolbarProps) {
    const t = useTranslation();
    return (
        <>
            <Stack.Toolbar placement="left">
                <Stack.Toolbar.Button accessibilityLabel={t("log.toolbar.search")} onPress={onSearch}>
                    <Stack.Toolbar.Icon {...toolbarIcon("search")} />
                </Stack.Toolbar.Button>
            </Stack.Toolbar>
            <Stack.Toolbar placement="right">
                <Stack.Toolbar.Menu accessibilityLabel={t("log.toolbar.period")}>
                    <Stack.Toolbar.Icon {...toolbarIcon("period")} />
                    {/* Nested and inline so the options carry a section header. */}
                    <Stack.Toolbar.Menu inline title={t("log.toolbar.period")}>
                        {LOG_PERIOD_ORDER.map((option) => (
                            <Stack.Toolbar.MenuAction
                                isOn={option === period}
                                key={option}
                                onPress={() => onPeriod(option)}
                            >
                                {t(PERIOD_PHRASE_KEY[option])}
                            </Stack.Toolbar.MenuAction>
                        ))}
                    </Stack.Toolbar.Menu>
                </Stack.Toolbar.Menu>
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
