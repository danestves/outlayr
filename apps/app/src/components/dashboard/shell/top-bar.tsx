import Add01Icon from "@hugeicons/core-free-icons/Add01Icon";
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon";
import Calendar03Icon from "@hugeicons/core-free-icons/Calendar03Icon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "panelui-web/button";
import { Chip } from "panelui-web/chip";
import { Menu } from "panelui-web/menu";
import { Sheet } from "panelui-web/sheet";
import { Tabs } from "panelui-web/tabs";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { useAccountFlows } from "@/components/dashboard/accounts/flows";
import { useDateFormat, usePeriodTitle } from "@/components/dashboard/home/format";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { usePeriodKeys } from "@/components/dashboard/shell/period-keys";
import { MenuContent } from "@/components/ui/menu-content";
import { rowsBetween, total } from "@/lib/dashboard-series-ledger";
import { periodOf, rangeKindOf } from "@/lib/dashboard-series-period";
import type { RangeKind } from "@/lib/dashboard-series-period";
import { useDisplayFormat } from "@/lib/ledger-settings";

const SHEET_ROW = "hover:bg-app-hover flex h-app-row w-full shrink-0 items-center gap-2 rounded-app-md px-2";

export const CHIP =
    "relative gap-1.5 not-data-pressed:[&>[data-slot=chip-check]]:-me-1.5 max-lg:text-app-label max-lg:after:absolute max-lg:after:-inset-x-0.5 max-lg:after:-inset-y-1.5";

type RangeTab = RangeKind | "month";

const isRangeTab = (value: unknown): value is RangeTab => value === "month" || value === "quarter" || value === "year";

function useRangeTab() {
    const { filters, setFilters } = useDashboard();
    const tab: RangeTab = rangeKindOf(filters.range.key) ?? "month";
    const pick = (value: RangeTab) => {
        if (value !== tab) {
            setFilters({ range: value === "month" ? null : value });
        }
    };
    return { pick, tab };
}

function PeriodControl() {
    const dashboard = useDashboard();
    const { filters, ledger, setFilters } = dashboard;
    const { filters: copy } = useIntlayer("dashboard");
    const date = useDateFormat();
    const title = usePeriodTitle(ledger.firstDayOfMonth, filters.currentKey);
    const keys = usePeriodKeys(dashboard);
    const { pick, tab } = useRangeTab();
    return (
        <div className="ml-auto flex items-center gap-3 max-lg:hidden">
            {tab === "month" ? null : (
                <span className="dash-figure text-muted-foreground text-app-label whitespace-nowrap">
                    {copy.rangeLabel({ from: date.day(filters.range.from), to: date.day(filters.range.to) })}
                </span>
            )}
            <Tabs onValueChange={(value) => isRangeTab(value) && pick(value)} value={tab}>
                <Tabs.List>
                    <Menu>
                        <Menu.Trigger render={<Tabs.Trigger value="month" />}>{title(filters.period)}</Menu.Trigger>
                        <MenuContent className="max-h-80 overflow-y-auto" sideOffset={8}>
                            <Menu.RadioGroup
                                onValueChange={(key: string) =>
                                    setFilters({ period: key === filters.currentKey ? null : key })
                                }
                                value={filters.period.key}
                            >
                                {keys.map((key) => (
                                    <Menu.RadioItem closeOnClick key={key} value={key}>
                                        {title(periodOf(key, ledger.firstDayOfMonth))}
                                    </Menu.RadioItem>
                                ))}
                            </Menu.RadioGroup>
                        </MenuContent>
                    </Menu>
                    <Tabs.Trigger value="quarter">{copy.quarter}</Tabs.Trigger>
                    <Tabs.Trigger value="year">{copy.year}</Tabs.Trigger>
                </Tabs.List>
            </Tabs>
        </div>
    );
}

function PeriodRows({ onPick }: { onPick: (key: string) => void }) {
    const dashboard = useDashboard();
    const { filters, ledger } = dashboard;
    const { money } = useDisplayFormat();
    const title = usePeriodTitle(ledger.firstDayOfMonth, "");
    const keys = usePeriodKeys(dashboard);
    const periods = useMemo(
        () =>
            keys.map((key) => {
                const period = periodOf(key, ledger.firstDayOfMonth);
                const spent = total(ledger, rowsBetween(ledger, filters, period.from, period.to, false));
                return { period, spent };
            }),
        [filters, keys, ledger]
    );
    return periods.map(({ period, spent }) => {
        const on = period.key === filters.period.key;
        return (
            <button
                aria-pressed={on}
                className={`${SHEET_ROW} text-left`}
                key={period.key}
                onClick={() => onPick(period.key)}
                type="button"
            >
                <span className={on ? "font-medium" : ""}>{title(period)}</span>
                <span className="dash-figure text-muted-foreground text-app-label ml-auto">
                    {money(spent, ledger.currency)}
                </span>
                <HugeiconsIcon
                    className={on ? "text-app-tint" : "invisible"}
                    icon={Tick02Icon}
                    size={18}
                    strokeWidth={2}
                />
            </button>
        );
    });
}

function PeriodSheet() {
    const { filters, ledger, setFilters } = useDashboard();
    const { filters: copy } = useIntlayer("dashboard");
    const { spent } = useIntlayer("dashboard-home").kpi;
    const title = usePeriodTitle(ledger.firstDayOfMonth, filters.currentKey);
    const { pick, tab } = useRangeTab();
    const [open, setOpen] = useState(false);
    return (
        <Sheet onOpenChange={setOpen} open={open}>
            <Sheet.Trigger render={<Chip className={`${CHIP} lg:hidden`} pressed={false} size="lg" />}>
                <HugeiconsIcon className="text-muted-foreground" icon={Calendar03Icon} strokeWidth={2} />
                {title(filters.period)}
                <HugeiconsIcon className="text-muted-foreground" icon={ArrowDown01Icon} strokeWidth={2} />
            </Sheet.Trigger>
            <Sheet.Content className="app-shell ph-no-capture max-h-3/5">
                <Sheet.Header title={copy.period} />
                <Tabs className="mx-4 mb-2" onValueChange={(value) => isRangeTab(value) && pick(value)} value={tab}>
                    <Tabs.List className="w-full">
                        <Tabs.Trigger className="flex-1" value="month">
                            {copy.month}
                        </Tabs.Trigger>
                        <Tabs.Trigger className="flex-1" value="quarter">
                            {copy.quarter}
                        </Tabs.Trigger>
                        <Tabs.Trigger className="flex-1" value="year">
                            {copy.year}
                        </Tabs.Trigger>
                    </Tabs.List>
                </Tabs>
                <div className="text-muted-foreground text-app-caption flex justify-between ps-4 pe-11 pb-1">
                    <span>{copy.month}</span>
                    <span>{spent}</span>
                </div>
                <Sheet.Body className="px-2">
                    <PeriodRows
                        onPick={(key) => {
                            setFilters({ period: key === filters.currentKey ? null : key });
                            setOpen(false);
                        }}
                    />
                </Sheet.Body>
            </Sheet.Content>
        </Sheet>
    );
}

export function TopBar({ children }: { children?: ReactNode }) {
    const { add } = useIntlayer("dashboard");
    const { open } = useAccountFlows();
    return (
        <div className="max-lg:app-chip-row min-h-app-bar flex flex-wrap items-center gap-2 py-3 max-lg:-mx-4 max-lg:flex-nowrap max-lg:overflow-x-auto max-lg:px-4 max-sm:min-h-0">
            <PeriodSheet />
            {children}
            <PeriodControl />
            <Button className="ml-1 max-lg:hidden" onClick={() => open({ kind: "entry" })}>
                <HugeiconsIcon icon={Add01Icon} strokeWidth={1.5} />
                {add.entry}
            </Button>
        </div>
    );
}
