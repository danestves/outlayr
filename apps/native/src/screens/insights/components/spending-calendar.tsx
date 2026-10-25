import { addDays, startOfDay } from "@outlayr/money/calendar";
import { buildHeatmapCalendar, HeatmapChart } from "panelui-native/components/heatmap-chart";
import type { HeatmapCell } from "panelui-native/components/heatmap-chart";
import { View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { useSettingBool } from "@/contexts/display-settings-context";
import { spendingCalendarStart } from "@/data/spending-calendar";
import { useNow } from "@/data/use-now";
import { formatChargeDate, monthAbbrevTitle, weekdayInitial } from "@/domain/dates";
import { formatAmount } from "@/domain/money";
import type { SpendingCalendarEntry } from "@/domain/spending-calendar";
import { useLanguage, useTranslation } from "@/i18n/context";
import { CHART_DRAW } from "@/theme/chart";
import { useColors } from "@/theme/use-colors";

interface SpendingCalendarProps {
    currency: string;
    entries: readonly SpendingCalendarEntry[];
    /** Stored as 1 = Sunday through 7 = Saturday. */
    firstWeekday: number;
    now?: Date;
    showCents: boolean;
}

interface CalendarDay {
    date: Date;
    exact: boolean;
    hasEntry: boolean;
    value: number;
}

interface AccessibilityCell {
    day: CalendarDay | null;
    key: string;
}

interface AccessibilityColumn {
    cells: AccessibilityCell[];
    key: string;
}

const ACCESSIBILITY_GRID_STYLE = {
    bottom: 0,
    flexDirection: "row" as const,
    left: 0,
    position: "absolute" as const,
    right: 0,
    top: 0,
};

function dateFromKey(key: string): Date {
    return new Date(`${key}T12:00:00`);
}

function localDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function calendarDays(entries: readonly SpendingCalendarEntry[], start: Date, end: Date): CalendarDay[] {
    const entryByDate = new Map(entries.map((entry) => [entry.date, entry]));
    const days: CalendarDay[] = [];
    for (let date = start; date <= end; date = addDays(date, 1)) {
        const entry = entryByDate.get(localDateKey(date));
        days.push({ date, exact: entry?.exact ?? true, hasEntry: entry !== undefined, value: entry?.value ?? 0 });
    }
    return days;
}

function accessibilityColumns(days: readonly CalendarDay[], weekStartDay: number): AccessibilityColumn[] {
    const [first] = days;
    if (!first) {
        return [];
    }
    const leading = (first.date.getDay() - weekStartDay + 7) % 7;
    const gridStart = addDays(first.date, -leading);
    const cellCount = Math.ceil((leading + days.length) / 7) * 7;
    const cells = Array.from({ length: cellCount }, (_unused, index): AccessibilityCell => {
        const dayIndex = index - leading;
        const day = dayIndex >= 0 && dayIndex < days.length ? (days[dayIndex] ?? null) : null;
        return {
            day: day?.hasEntry ? day : null,
            key: localDateKey(addDays(gridStart, index)),
        };
    });
    const columns: AccessibilityColumn[] = [];
    for (let index = 0; index < cells.length; index += 7) {
        const columnCells = cells.slice(index, index + 7);
        columns.push({ cells: columnCells, key: columnCells[0]?.key ?? "" });
    }
    return columns;
}

export function SpendingCalendar({ entries, currency, firstWeekday, showCents, now }: SpendingCalendarProps) {
    const colors = useColors();
    const t = useTranslation();
    const { language } = useLanguage();
    const reduceMotion = useReducedMotion();
    const animated = useSettingBool("animatedCharts") && !reduceMotion;
    const weekStartDay = firstWeekday - 1;
    const clock = useNow();
    const at = now ?? new Date(clock);
    const end = startOfDay(at);
    const start = spendingCalendarStart(at);

    const chartEntries = entries.map((entry) => ({ count: entry.value, date: dateFromKey(entry.date) }));
    const data = buildHeatmapCalendar(chartEntries, { end, start, weekStartDay });
    const days = calendarDays(entries, start, end);
    const dayColumns = accessibilityColumns(days, weekStartDay);
    const weekdayLabels = Array.from({ length: 7 }, (_unused, offset) =>
        weekdayInitial(addDays(new Date(2026, 0, 4), weekStartDay + offset), language)
    );

    const entryByDate = new Map(entries.map((entry) => [entry.date, entry]));
    const dayLabel = (date: Date, value: number, exact = true): string =>
        t(exact ? "insights.calendar.day" : "insights.calendar.dayApproximate", {
            amount: formatAmount(value, currency, showCents, language),
            date: formatChargeDate(date, at, language),
        });
    const tooltipLabel = (cell: HeatmapCell): string => {
        if (!cell.date) {
            return t("insights.calendar.empty");
        }
        return dayLabel(cell.date, cell.count, entryByDate.get(localDateKey(cell.date))?.exact ?? true);
    };

    return (
        <View className="gap-2">
            <View>
                <MonoLabel>
                    {entries.length === 0
                        ? t("insights.calendar.title")
                        : `${t("insights.calendar.title")} · ${t("insights.calendar.range")}`}
                </MonoLabel>
                {entries.length === 0 ? (
                    <Text className="text-footnote text-muted">{t("insights.calendar.empty")}</Text>
                ) : null}
            </View>

            <View>
                <View
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    testID="spending-calendar-panel-chart"
                >
                    <HeatmapChart
                        animationDuration={animated ? CHART_DRAW.durationMs : 0}
                        color={colors.tint}
                        data={data}
                        emptyColor={colors.railTrack}
                        layout="fill"
                        weekStartDay={weekStartDay}
                    >
                        <HeatmapChart.XAxis formatLabel={(date) => monthAbbrevTitle(date, language)} />
                        <HeatmapChart.YAxis labelFormat="initial" labels={weekdayLabels} />
                        <HeatmapChart.Cells />
                        <HeatmapChart.Tooltip formatLabel={tooltipLabel} />
                        <HeatmapChart.Legend
                            lessLabel={t("insights.calendar.less")}
                            moreLabel={t("insights.calendar.more")}
                        />
                    </HeatmapChart>
                </View>

                <View
                    collapsable={false}
                    pointerEvents="none"
                    style={ACCESSIBILITY_GRID_STYLE}
                    testID="spending-calendar-accessibility-grid"
                >
                    {dayColumns.map((column) => (
                        <View key={column.key} style={{ flex: 1 }}>
                            {column.cells.map((cell) =>
                                cell.day ? (
                                    <View
                                        accessibilityLabel={dayLabel(cell.day.date, cell.day.value, cell.day.exact)}
                                        accessible
                                        key={cell.key}
                                        style={{ flex: 1 }}
                                    />
                                ) : (
                                    <View key={cell.key} style={{ flex: 1 }} />
                                )
                            )}
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );
}
