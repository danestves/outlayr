import type { BudgetWindow } from "@outlayr/money/budget-window";
import { addDays } from "@outlayr/money/calendar";

import type { InsightsPeriod } from "@/data/insights";
import { formatSentenceDate, monthAbbrev, weekdayInitial } from "@/domain/dates";
import { daysBetween } from "@/domain/local-day";
import type { Language } from "@/i18n/languages";

import type { PaceTick } from "./components/answers-pace-chart";

const MONTH_TICK_DAYS = [0, 9, 19] as const;
const QUARTER_STARTS = [0, 3, 6, 9] as const;

export function paceTicks(period: InsightsPeriod, window: BudgetWindow, days: number, language: Language): PaceTick[] {
    const dateOf = (day: number) => addDays(window.start, day);
    if (period === "week") {
        return Array.from({ length: days }, (_, day) => ({ day, label: weekdayInitial(dateOf(day), language) }));
    }
    if (period === "year") {
        return QUARTER_STARTS.map((month) => {
            const date = new Date(window.start.getFullYear(), month, 1);
            return { day: daysBetween(window.start.getTime(), date.getTime()), label: monthAbbrev(date, language) };
        });
    }
    return [...MONTH_TICK_DAYS, days - 1].map((day) => ({
        day,
        label: day === 0 ? formatSentenceDate(dateOf(day), language) : String(dateOf(day).getDate()),
    }));
}
