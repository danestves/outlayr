import { addDays, addMonths, firstOfMonth, startOfDay, startOfWeek } from "@outlayr/money/calendar";

export type BarPeriod = "week" | "month";

export interface PeriodBar {
    amount: number;
    day: Date;
    due: number;
}

interface DatedAmount {
    amount: number;
    date: Date;
}

export function barWindow(period: BarPeriod, now: Date, firstWeekday: number) {
    const start = period === "week" ? startOfWeek(now, firstWeekday) : firstOfMonth(now);
    return { end: period === "week" ? addDays(start, 7) : addMonths(start, 1), start };
}

export function periodBars(
    period: BarPeriod,
    now: Date,
    firstWeekday: number,
    logged: readonly DatedAmount[],
    due: readonly DatedAmount[]
): PeriodBar[] {
    const { start, end } = barWindow(period, now, firstWeekday);
    const bars: PeriodBar[] = [];
    const byDay = new Map<number, PeriodBar>();
    for (let day = start; day.getTime() < end.getTime(); day = addDays(day, 1)) {
        const bar = { amount: 0, day, due: 0 };
        bars.push(bar);
        byDay.set(day.getTime(), bar);
    }
    for (const row of logged) {
        const bar = byDay.get(startOfDay(row.date).getTime());
        if (bar) {
            bar.amount += row.amount;
        }
    }
    for (const row of due) {
        const bar = byDay.get(startOfDay(row.date).getTime());
        if (bar) {
            bar.due += row.amount;
        }
    }
    return bars;
}
