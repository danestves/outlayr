import { addDays, addMonths } from "@outlayr/money/calendar";

import type { LogPeriod } from "@/data/log-totals";

type ComparedPeriod = Exclude<LogPeriod, "all">;

export interface PeriodWindow {
    end: Date;
    start: Date;
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
            return addMonths(date, -1);
        }
        case "year": {
            return addMonths(date, -12);
        }
        default: {
            return period satisfies never;
        }
    }
}

/** The previous period cut as far in as this one has run, so a Wednesday compares with last Wednesday. */
export function previousPeriodWindow(period: ComparedPeriod, start: Date, now: Date): PeriodWindow {
    // Calendar steps keep the clock time across a DST change; the cap stops 31 March overflowing February.
    const end = Math.min(stepBack(period, now).getTime(), start.getTime() - 1);
    return { end: new Date(end), start: stepBack(period, start) };
}
