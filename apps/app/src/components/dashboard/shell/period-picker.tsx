import ArrowLeft01Icon from "@hugeicons/core-free-icons/ArrowLeft01Icon";
import ArrowRight01Icon from "@hugeicons/core-free-icons/ArrowRight01Icon";
import { HugeiconsIcon } from "@hugeicons/react";
import { wallNoon } from "@outlayr/money/ledger-zone";
import { Button } from "panelui-web/button";
import { Input } from "panelui-web/input";
import { Menu } from "panelui-web/menu";
import { useState } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { titled, useDateFormat, usePeriodTitle, useWeekLetters } from "@/components/dashboard/home/format";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import type { FilterPatch } from "@/components/dashboard/shell/filters";
import { customKeyOf, isCustomKey, periodOf, shiftPeriodKey } from "@/lib/dashboard-series-period";
import type { RangeChoice } from "@/lib/dashboard-series-period";
import { addDays, daysBetween } from "@/lib/ledger";

const WEEK = 7;
const ITEM = "data-checked:bg-app-fill";

type Preset = "today" | "week" | "current" | "previous" | "30d" | "year" | "all" | "custom";

type End = "from" | "to";

interface Draft {
    end: End;
    from: string;
    to: string;
}

function presetOf(choice: RangeChoice | null, periodKey: string, currentKey: string): Preset | "" {
    if (choice === null) {
        if (periodKey === currentKey) {
            return "current";
        }
        return periodKey === shiftPeriodKey(currentKey, -1) ? "previous" : "";
    }
    if (choice === "quarter") {
        return "";
    }
    if (choice === "year") {
        return periodKey === currentKey ? "year" : "";
    }
    return isCustomKey(choice) ? "custom" : choice;
}

function monthGrid(month: string, firstWeekday: number) {
    const first = `${month}-01`;
    const count = daysBetween(first, `${shiftPeriodKey(month, 1)}-01`);
    const lead = (new Date(wallNoon(first)).getUTCDay() - firstWeekday + WEEK + 1) % WEEK;
    return {
        days: Array.from({ length: count }, (_, index) => addDays(first, index)),
        lead: Array.from({ length: lead }, (_, index) => addDays(first, index - lead)),
    };
}

const isWeekend = (column: number, firstWeekday: number) => {
    const weekday = (firstWeekday - 1 + column) % WEEK;
    return weekday === 0 || weekday === WEEK - 1;
};

function bandOf(day: string, { from, to }: Draft) {
    if (from === to || day < from || day > to) {
        return "";
    }
    if (day === from) {
        return "bg-linear-to-r from-transparent from-50% to-app-count to-50%";
    }
    return day === to ? "bg-linear-to-l from-transparent from-50% to-app-count to-50%" : "bg-app-count";
}

interface MonthProps {
    draft: Draft;
    month: string;
    onPick: (day: string) => void;
}

function Month({ draft, month, onPick }: MonthProps) {
    const { ledger } = useDashboard();
    const date = useDateFormat();
    const letters = useWeekLetters(ledger.firstWeekday);
    const { days, lead } = monthGrid(month, ledger.firstWeekday);
    const weekend = (index: number) => (isWeekend(index % WEEK, ledger.firstWeekday) ? "bg-app-hover" : "");
    return (
        <div className="dash-figure text-app-label grid grid-cols-7">
            {letters.map((letter, index) => (
                <span
                    aria-hidden
                    className={`text-muted-foreground text-app-micro flex h-8 items-center justify-center ${weekend(index)}`}
                    key={`${letter}-${index}`}
                >
                    {letter}
                </span>
            ))}
            {lead.map((day, index) => (
                <span
                    aria-hidden
                    className={`text-muted-foreground/50 flex h-8 items-center justify-center ${weekend(index)}`}
                    key={day}
                >
                    {Number(day.slice(8))}
                </span>
            ))}
            {days.map((day, index) => {
                const edge = day === draft.from || day === draft.to;
                const band = bandOf(day, draft);
                return (
                    <span
                        className={`flex h-8 items-center justify-center ${band || weekend(lead.length + index)}`}
                        key={day}
                    >
                        <button
                            aria-label={date.full(day)}
                            aria-pressed={edge}
                            className={`disabled:text-muted-foreground/40 size-8 rounded-full ${edge ? "bg-app-tint text-app-on-tint" : "enabled:hover:bg-app-hover"}`}
                            disabled={day > ledger.today}
                            onClick={() => onPick(day)}
                            type="button"
                        >
                            {Number(day.slice(8))}
                        </button>
                    </span>
                );
            })}
        </div>
    );
}

function Calendar({ draft, onPick }: { draft: Draft; onPick: (day: string) => void }) {
    const { ledger } = useDashboard();
    const { locale } = useLocale();
    const date = useDateFormat();
    const copy = useIntlayer("dashboard").filters.range;
    const thisMonth = ledger.today.slice(0, 7);
    const [shown, setShown] = useState(() => draft.to.slice(0, 7));
    const months = [shiftPeriodKey(shown, -1), shown];
    return (
        <div className="grid grid-cols-2 gap-6">
            {months.map((month, index) => (
                <div key={month}>
                    <div className="relative flex h-8 items-center justify-center">
                        {index === 0 ? (
                            <Button
                                aria-label={copy.previousMonth.value}
                                className="absolute start-0"
                                onClick={() => setShown(shiftPeriodKey(shown, -1))}
                                size="icon-sm"
                                variant="ghost"
                            >
                                <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
                            </Button>
                        ) : (
                            <Button
                                aria-label={copy.nextMonth.value}
                                className="absolute end-0"
                                disabled={shown >= thisMonth}
                                onClick={() => setShown(shiftPeriodKey(shown, 1))}
                                size="icon-sm"
                                variant="ghost"
                            >
                                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
                            </Button>
                        )}
                        <span className="text-app-label font-medium">{titled(date.monthYear(month), locale)}</span>
                    </div>
                    <Month draft={draft} month={month} onPick={onPick} />
                </div>
            ))}
        </div>
    );
}

export function PeriodPicker({ onDone }: { onDone: () => void }) {
    const { filters, ledger, setFilters } = useDashboard();
    const copy = useIntlayer("dashboard").filters;
    const date = useDateFormat();
    const title = usePeriodTitle(ledger.firstDayOfMonth, filters.currentKey);
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState<Draft>(() => ({
        end: "from",
        from: filters.range.from < ledger.today ? filters.range.from : ledger.today,
        to: filters.range.to < ledger.today ? filters.range.to : ledger.today,
    }));
    const previousKey = shiftPeriodKey(filters.currentKey, -1);
    const presets: readonly { label: string; patch: FilterPatch; value: Preset }[] = [
        { label: copy.range.today.value, patch: { period: null, range: "today" }, value: "today" },
        { label: copy.range.thisWeek.value, patch: { period: null, range: "week" }, value: "week" },
        {
            label: title(periodOf(filters.currentKey, ledger.firstDayOfMonth)),
            patch: { period: null, range: null },
            value: "current",
        },
        {
            label: title(periodOf(previousKey, ledger.firstDayOfMonth)),
            patch: { period: previousKey, range: null },
            value: "previous",
        },
        { label: copy.range.last30.value, patch: { period: null, range: "30d" }, value: "30d" },
        { label: copy.range.thisYear.value, patch: { period: null, range: "year" }, value: "year" },
        { label: copy.range.allTime.value, patch: { period: null, range: "all" }, value: "all" },
    ];
    const pick = (day: string) => {
        setEditing(true);
        setDraft(({ end, from, to }) => {
            if (end === "from") {
                return { end: "to", from: day, to: day > to ? day : to };
            }
            return day < from ? { end: "to", from: day, to: from } : { end: "to", from, to: day };
        });
    };
    const apply = (patch: FilterPatch) => {
        setFilters(patch);
        onDone();
    };
    const count = daysBetween(draft.from, draft.to) + 1;
    const field = (end: End) => (
        <Input
            aria-label={end === "from" ? copy.range.firstDay.value : copy.range.lastDay.value}
            className={`dash-figure w-32 ${draft.end === end ? "border-ring ring-ring/30 ring-3" : ""}`}
            data-active={draft.end === end || undefined}
            onFocus={() => setDraft((last) => ({ ...last, end }))}
            readOnly
            size="sm"
            value={date.full(draft[end])}
        />
    );
    return (
        <div className="flex">
            <Menu.RadioGroup
                className="w-36 shrink-0 gap-0.5 border-e pe-1"
                onValueChange={(value: string) => {
                    const preset = presets.find((each) => each.value === value);
                    if (preset) {
                        apply(preset.patch);
                    } else if (value === "custom") {
                        setEditing(true);
                        setDraft((last) => ({ ...last, end: "from" }));
                    }
                }}
                value={editing ? "custom" : presetOf(filters.choice, filters.period.key, filters.currentKey)}
            >
                {presets.map((preset) => (
                    <Menu.RadioItem className={ITEM} closeOnClick key={preset.value} value={preset.value}>
                        {preset.label}
                    </Menu.RadioItem>
                ))}
                <Menu.RadioItem className={ITEM} value="custom">
                    {copy.range.custom}
                </Menu.RadioItem>
            </Menu.RadioGroup>
            <div className="flex flex-col p-2">
                <div className="px-1 pb-2">
                    <Calendar draft={draft} onPick={pick} />
                </div>
                <div className="flex items-center gap-2 border-t px-1 pt-3">
                    {field("from")}
                    <span className="text-muted-foreground text-app-label">{copy.range.to}</span>
                    {field("to")}
                    <span className="dash-figure text-muted-foreground text-app-label px-1 whitespace-nowrap">
                        {count === 1 ? copy.range.oneDay : copy.range.manyDays({ count: String(count) })}
                    </span>
                    <Button
                        className="ms-auto"
                        onClick={() => apply({ period: null, range: null })}
                        size="sm"
                        variant="ghost"
                    >
                        {copy.clear}
                    </Button>
                    <Button onClick={() => apply({ period: null, range: customKeyOf(draft.from, draft.to) })} size="sm">
                        {copy.range.apply}
                    </Button>
                </div>
            </div>
        </div>
    );
}
