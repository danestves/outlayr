import { addDays, startOfDay } from "@outlayr/money/calendar";
import type { CurrencyEntry } from "@outlayr/money/currency-totals";
import { anchorDayOf, landingDate, nextDate } from "@outlayr/money/recurrence";

export const WEEK_AHEAD_DAYS = 7;

export interface MonthGroup<T> {
    month: Date;
    rows: T[];
}

export function groupByMonth<T>(rows: readonly T[], dateOf: (row: T) => Date): MonthGroup<T>[] {
    const groups: MonthGroup<T>[] = [];
    for (const row of rows) {
        const date = dateOf(row);
        const last = groups.at(-1);
        if (last?.month.getFullYear() === date.getFullYear() && last.month.getMonth() === date.getMonth()) {
            last.rows.push(row);
        } else {
            groups.push({ month: new Date(date.getFullYear(), date.getMonth(), 1), rows: [row] });
        }
    }
    return groups;
}

interface ScheduleRow extends CurrencyEntry {
    date: Date;
    recurringAnchorDay: number | null;
    recurringCoefficient: number | null;
    recurringEndDate?: Date | null;
    recurringType: number;
}

export function chargesBetween<T extends ScheduleRow>(rows: readonly T[], now: Date, from: Date, to: Date): T[] {
    return occurrencesBetween(
        rows.filter((row) => !row.income),
        now,
        from,
        to
    );
}

/** Income and expenses alike, each occurrence dated where it lands in `[from, to)`. */
export function occurrencesBetween<T extends ScheduleRow>(rows: readonly T[], now: Date, from: Date, to: Date): T[] {
    const start = from.getTime();
    const end = to.getTime();
    const charges: T[] = [];
    for (const row of rows) {
        const stop =
            row.recurringEndDate == null ? end : Math.min(end, addDays(startOfDay(row.recurringEndDate), 1).getTime());
        let at: Date | null = landingDate(row, now);
        while (at !== null && at.getTime() < stop) {
            if (at.getTime() >= start) {
                charges.push({ ...row, date: at });
            }
            const next: Date | null = nextDate(at, row.recurringType, row.recurringCoefficient ?? 1, anchorDayOf(row));
            at = next !== null && next.getTime() > at.getTime() ? next : null;
        }
    }
    return charges;
}

export function chargesInWeekAhead<T extends ScheduleRow>(rows: readonly T[], now: Date): T[] {
    return chargesBetween(rows, now, startOfDay(now), addDays(startOfDay(now), WEEK_AHEAD_DAYS));
}
