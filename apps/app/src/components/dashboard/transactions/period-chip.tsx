import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon";
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Chip } from "panelui-web/chip";
import { Menu } from "panelui-web/menu";
import { useMemo, useState } from "react";
import { useIntlayer } from "react-intlayer";

import { DashboardContext, useDashboard } from "@/components/dashboard/shell/dashboard";
import type { Dashboard } from "@/components/dashboard/shell/dashboard";
import type { FilterPatch } from "@/components/dashboard/shell/filters";
import { PeriodPicker } from "@/components/dashboard/shell/period-picker";
import { CHIP } from "@/components/dashboard/shell/top-bar";
import { MenuContent } from "@/components/ui/menu-content";
import { customKeyOf, isCustomKey, periodOf, presetKeyOf } from "@/lib/dashboard-series-period";
import type { RangeChoice } from "@/lib/dashboard-series-period";

import { usePeriodTitle, useRangeTitle } from "../home/format";
import { rangeOf } from "./model";
import type { PageQuery, SearchPatch } from "./search";

const DAY_PRESETS = ["today", "week", "30d"] as const;

function choiceOf(query: PageQuery, range: { from: string; to: string } | null, dashboard: Dashboard) {
    if (query.span !== undefined) {
        return query.span;
    }
    if (range === null) {
        return null;
    }
    const key = customKeyOf(range.from, range.to);
    const { ledger } = dashboard;
    return DAY_PRESETS.find((preset) => presetKeyOf(preset, ledger, ledger.today) === key) ?? key;
}

function patchOf({ period, range }: FilterPatch, dashboard: Dashboard): SearchPatch {
    const { ledger } = dashboard;
    const cleared = { from: null, period: null, span: null, to: null } satisfies SearchPatch;
    if (range === undefined || range === null) {
        return { ...cleared, period: period ?? null };
    }
    if (range === "all" || range === "quarter" || range === "year") {
        return { ...cleared, span: range };
    }
    const key = isCustomKey(range) ? range : presetKeyOf(range, ledger, ledger.today);
    const days = periodOf(key, ledger.firstDayOfMonth);
    return { ...cleared, from: days.from, to: days.to };
}

interface PeriodChipProps {
    query: PageQuery;
    setSearch: (patch: SearchPatch) => void;
}

/** The page's period as the chip names it, with the range and preset behind the name. */
export function usePeriodChoice(query: PageQuery) {
    const dashboard = useDashboard();
    const { filters, ledger } = dashboard;
    const { filters: copy } = useIntlayer("dashboard");
    const { filters: words } = useIntlayer("dashboard-ledger");
    const monthTitle = usePeriodTitle(ledger.firstDayOfMonth, filters.currentKey);
    const rangeTitle = useRangeTitle();
    const range = useMemo(
        () => rangeOf({ custom: query.custom, key: filters.period.key, span: query.span }, ledger.firstDayOfMonth),
        [filters.period.key, ledger.firstDayOfMonth, query.custom, query.span]
    );
    const custom = query.custom.from !== undefined || query.custom.to !== undefined;
    const choice: RangeChoice | null = choiceOf(query, custom ? range : null, dashboard);
    const label = () => {
        switch (choice) {
            case null: {
                return monthTitle(filters.period);
            }
            case "all": {
                return words.allTime.value;
            }
            case "today": {
                return copy.range.today.value;
            }
            case "week": {
                return copy.range.thisWeek.value;
            }
            case "30d": {
                return copy.range.last30.value;
            }
            default: {
                return range === null ? words.allTime.value : rangeTitle(range);
            }
        }
    };
    return { choice, label: label(), range };
}

export function PeriodChip({ query, setSearch }: PeriodChipProps) {
    const dashboard = useDashboard();
    const { filters, ledger } = dashboard;
    const { choice, label, range } = usePeriodChoice(query);
    const [open, setOpen] = useState(false);
    const scoped = useMemo<Dashboard>(() => {
        const days = range ?? { from: ledger.today, to: ledger.today };
        return {
            ...dashboard,
            filters: {
                ...filters,
                choice,
                range: periodOf(customKeyOf(days.from, days.to), ledger.firstDayOfMonth),
            },
            setFilters: (patch) => setSearch(patchOf(patch, dashboard)),
        };
    }, [choice, dashboard, filters, ledger.firstDayOfMonth, ledger.today, range, setSearch]);
    return (
        <Menu onOpenChange={setOpen} open={open}>
            <Menu.Trigger render={<Chip className={`${CHIP} shrink-0`} data-pressed="" pressed size="lg" />}>
                <HugeiconsIcon icon={Calendar03Icon} strokeWidth={1.5} />
                {label}
                <HugeiconsIcon className="-me-1" icon={ArrowDown01Icon} strokeWidth={2} />
            </Menu.Trigger>
            <MenuContent align="start" sideOffset={8}>
                <DashboardContext value={scoped}>
                    <PeriodPicker onDone={() => setOpen(false)} />
                </DashboardContext>
            </MenuContent>
        </Menu>
    );
}
