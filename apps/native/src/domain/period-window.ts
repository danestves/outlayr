import { addDays, addMonths } from "@outlayr/money/calendar";

import type { LogPeriod } from "@/data/log-totals";

type ComparedPeriod = Exclude<LogPeriod, "all">;

export interface PeriodWindow {
    end: Date;
    start: Date;
}

// `addMonths` overflows: 31 March minus a month is 3 March, so a short month ends on its last day instead.
function monthsBack(date: Date, months: number): Date {
    const shifted = addMonths(date, -months);
    if (shifted.getDate() !== date.getDate()) {
        shifted.setDate(0);
    }
    return shifted;
}

function stepBack(period: ComparedPeriod, date: Date): Date {
    switch (period) {
        case "day": {
            return addDays(date, -1);
        }
        case "week": {
            return addDays(date, -7);
        }
        case "month": {
            return monthsBack(date, 1);
        }
        case "year": {
            return monthsBack(date, 12);
        }
        default: {
            return period satisfies never;
        }
    }
}

/** The previous period cut as far in as this one has run, so a Wednesday compares with last Wednesday. */
export function previousPeriodWindow(period: ComparedPeriod, start: Date, now: Date): PeriodWindow {
    // Calendar steps, not elapsed time, so a DST change keeps the clock time.
    return { end: stepBack(period, now), start: stepBack(period, start) };
}
