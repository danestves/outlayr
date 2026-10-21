import { addDays, startOfDay } from "./calendar";

// Mirrors the Swift `RecurringCadence` raw values, so a persisted `recurringType` reads the same in both apps.
export const RECURRING_TYPE = {
    daily: 1,
    monthly: 3,
    none: 0,
    weekly: 2,
    yearly: 4,
} as const;

export type RecurringType = (typeof RECURRING_TYPE)[keyof typeof RECURRING_TYPE];

/** In the order the picker renders them. */
export const SELECTABLE_RECURRING_TYPES: readonly RecurringType[] = [
    RECURRING_TYPE.daily,
    RECURRING_TYPE.weekly,
    RECURRING_TYPE.monthly,
    RECURRING_TYPE.yearly,
];

// Only fills `none`, so re-entering subscription mode keeps a cadence the user already chose.
export function ensureRecurringType(type: number): number {
    return type === RECURRING_TYPE.none ? RECURRING_TYPE.monthly : type;
}

export function addMonths(date: Date, n: number, anchorDay: number): Date {
    const d = new Date(date);
    d.setDate(1);
    d.setMonth(d.getMonth() + n);
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(anchorDay, lastDay));
    return d;
}

// A carrier clamped from 31 Jan to 28 Feb keeps advancing from 31, so every projection of a chain asks this
// rather than reading the day off the row it is standing on.
export function anchorDayOf(source: { date: Date; recurringAnchorDay: number | null }): number {
    return source.recurringAnchorDay ?? source.date.getDate();
}

function normalizeAnchor(anchorDay: number | null | undefined, from: Date) {
    if (anchorDay == null) {
        return from.getDate();
    }
    return Math.min(31, Math.max(1, Math.round(anchorDay)));
}

// `anchorDay` lets the 31st come back in March after February clamped it; omitted, it anchors to `from`'s own day.
export function nextDate(from: Date, type: number, coefficient: number, anchorDay?: number | null): Date | null {
    const n = Math.max(1, Math.round(coefficient));
    const anchor = normalizeAnchor(anchorDay, from);
    switch (type) {
        case RECURRING_TYPE.daily: {
            return addDays(from, n);
        }
        case RECURRING_TYPE.weekly: {
            return addDays(from, 7 * n);
        }
        case RECURRING_TYPE.monthly: {
            return addMonths(from, n, anchor);
        }
        case RECURRING_TYPE.yearly: {
            return addMonths(from, 12 * n, anchor);
        }
        default: {
            return null;
        }
    }
}

export interface ScheduledCharge {
    clamped: boolean;
    date: Date;
}

// Walked exactly as the back-fill walks, so what the form promises is what the ledger later writes.
export function schedulePreview(
    firstPayment: Date,
    type: number,
    coefficient: number,
    count: number
): ScheduledCharge[] {
    const anchorDay = firstPayment.getDate();
    const charges: ScheduledCharge[] = [];
    let holding = firstPayment;

    for (let i = 0; i < count; i += 1) {
        const advanced = nextDate(holding, type, coefficient, anchorDay);
        if (advanced == null) {
            break;
        }
        charges.push({
            clamped:
                (type === RECURRING_TYPE.monthly || type === RECURRING_TYPE.yearly) && advanced.getDate() !== anchorDay,
            date: advanced,
        });
        holding = advanced;
    }

    return charges;
}

export const MAX_INTERVAL = 30;

// `from` is a member of its own schedule, so a charge still ahead of today is the landing. Walked, not projected,
// so month clamping matches every occurrence the back-fill writes.
export function nextLanding(
    from: Date,
    type: number,
    coefficient: number,
    endDate: Date | null,
    now: Date,
    anchorDay?: number | null
): Date | null {
    const today = startOfDay(now);
    const endLimit = endDate == null ? null : startOfDay(endDate);
    const anchor = normalizeAnchor(anchorDay, from);
    const advance = (at: Date): Date | null => nextDate(at, type, coefficient, anchor);
    const pastEndLimit = (at: Date): boolean => endLimit != null && startOfDay(at).getTime() > endLimit.getTime();

    // Checked first, so a future-dated one-off is never mistaken for a pending subscription charge.
    if (advance(from) == null) {
        return null;
    }

    // Strictly after: `scheduleSuccessor` passes a carrier dated today or earlier, and a same-day `from` would
    // succeed itself and stall the chain forever.
    if (startOfDay(from).getTime() > today.getTime()) {
        return pastEndLimit(from) ? null : from;
    }

    let holding = from;
    let advanced = advance(holding);
    while (advanced != null && startOfDay(advanced).getTime() > startOfDay(holding).getTime()) {
        if (pastEndLimit(advanced)) {
            return null;
        }
        if (startOfDay(advanced).getTime() > today.getTime()) {
            return advanced;
        }
        holding = advanced;
        advanced = advance(holding);
    }
    return null;
}

export function landingDate(
    row: { date: Date; recurringAnchorDay: number | null; recurringCoefficient: number | null; recurringType: number },
    now: Date
): Date {
    if (row.date.getTime() > now.getTime()) {
        return row.date;
    }
    // Not the stored `day`: that is midnight in the writing device's zone and can read as the day before here.
    return (
        nextDate(startOfDay(row.date), row.recurringType, row.recurringCoefficient ?? 1, anchorDayOf(row)) ?? row.date
    );
}
