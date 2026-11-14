import { monthlyChargeCount } from "@outlayr/money/subscription-cost";

import { round, rowsBetween, rowsOf, total } from "../../../../lib/dashboard-series-ledger";
import type { Ledger, Scope } from "../../../../lib/dashboard-series-ledger";
import { daysFrom, periodKeyIn, periodKindOf, periodOf, shiftPeriodKey } from "../../../../lib/dashboard-series-period";
import type { Period } from "../../../../lib/dashboard-series-period";
import { addDays } from "../../../../lib/ledger";
import type { Overview } from "../../../ledger/overview";
import { MIN_PRIOR_PERIODS, priorWindows } from "../answers";

const MONTHS_IN_YEAR = 12;

export interface PacePoint {
    [key: string]: number | string | null;
    day: string;
    spent: number | null;
    usual: number | null;
}

export interface Pace {
    /** Where the span ends if the days left go as they usually do. */
    projected: number | null;
    points: PacePoint[];
    spent: number;
    /** The last day of the span that has happened. */
    through: string;
    usualByNow: number | null;
}

/** Spending added up day by day, beside the average of the same days in the spans before. */
export function paceOf(ledger: Ledger, span: Period, scope: Scope): Pace {
    const through = span.to < ledger.today ? span.to : ledger.today;
    const byDay = new Map<string, number>();
    for (const row of rowsOf(ledger, scope, false)) {
        byDay.set(row.day, (byDay.get(row.day) ?? 0) + row.amount);
    }
    const windows = priorWindows(ledger, span);
    const priors = windows.length < MIN_PRIOR_PERIODS ? [] : windows.map(({ prior }) => prior);
    const running = priors.map(() => 0);
    let spent = 0;
    const points = daysFrom(span.from, span.to).map((day, index): PacePoint => {
        spent += day <= through ? (byDay.get(day) ?? 0) : 0;
        for (const [at, prior] of priors.entries()) {
            const matching = addDays(prior.from, index);
            running[at] = (running[at] ?? 0) + (matching <= prior.to ? (byDay.get(matching) ?? 0) : 0);
        }
        return {
            day,
            spent: day <= through ? round(ledger, spent) : null,
            usual:
                priors.length === 0
                    ? null
                    : round(ledger, running.reduce((sum, each) => sum + each, 0) / priors.length),
        };
    });
    const usualByNow = points.find((point) => point.day === through)?.usual ?? null;
    const usualAtEnd = points.at(-1)?.usual ?? null;
    return {
        points,
        projected: usualByNow === null || usualAtEnd === null ? null : round(ledger, spent + usualAtEnd - usualByNow),
        spent: round(ledger, spent),
        through,
        usualByNow,
    };
}

export interface SpanSpend {
    key: string;
    spent: number;
}

/** What one category took in each of the last `count` spans, the open one last. */
export function categoryHistory(ledger: Ledger, span: Period, scope: Scope, categoryId: string, count: number) {
    return Array.from({ length: count }, (_, index): SpanSpend => {
        const each = periodOf(shiftPeriodKey(span.key, index + 1 - count), ledger.firstDayOfMonth);
        const to = each.to < ledger.today ? each.to : ledger.today;
        return {
            key: each.key,
            spent: total(
                ledger,
                rowsBetween(ledger, scope, each.from, to, false).filter(
                    (row) => row.topId === categoryId || row.categoryId === categoryId
                )
            ),
        };
    });
}

type Charge = Overview["upcoming"]["charges"][number];

export interface Subscriptions {
    charges: (Charge & { perMonth: number })[];
    next: Charge | null;
    perMonth: number;
    perYear: number;
}

/** Recurring charges at what each costs a month, the dearest first. A charge in another currency counts at value. */
export function subscriptionsOf(ledger: Ledger, upcoming: Overview["upcoming"]): Subscriptions {
    const schedules = new Map(ledger.books.transactions.map((row) => [row.localId, row]));
    const charges = upcoming.charges
        .flatMap((charge) => {
            const schedule = schedules.get(charge.id);
            const times = schedule ? monthlyChargeCount(schedule.recurringType, schedule.recurringCoefficient) : 0;
            const value = charge.valued ?? (charge.currency === ledger.currency ? charge.amount : null);
            return charge.kind === "expense" && times > 0 && value !== null
                ? [{ ...charge, perMonth: round(ledger, Math.abs(value) * times) }]
                : [];
        })
        .toSorted((a, b) => b.perMonth - a.perMonth);
    const perMonth = round(
        ledger,
        charges.reduce((sum, charge) => sum + charge.perMonth, 0)
    );
    return {
        charges,
        next: charges.toSorted((a, b) => a.nextCharge.localeCompare(b.nextCharge))[0] ?? null,
        perMonth,
        perYear: round(ledger, perMonth * MONTHS_IN_YEAR),
    };
}

const AXIS_ROWS = 4;
const STEPS = [1, 2, 2.5, 5, 10];

const HEADROOM = 1.1;

/**
 * A y-axis ruled on round figures. `top` ends on a rule; `roomy` adds headroom in half
 * steps, so a tag above the highest point stays inside the plot.
 */
export function axisOf(max: number) {
    if (max <= 0) {
        return { roomy: AXIS_ROWS, rows: AXIS_ROWS, step: 1, top: AXIS_ROWS };
    }
    const rough = max / AXIS_ROWS;
    const magnitude = 10 ** Math.floor(Math.log10(rough));
    const step = (STEPS.find((each) => each * magnitude >= rough) ?? 10) * magnitude;
    const rows = Math.max(Math.ceil(max / step), 1);
    const half = step / 2;
    return { roomy: Math.ceil((max * HEADROOM) / half) * half, rows, step, top: rows * step };
}

export interface HistorySlot {
    entries: number;
    span: Period;
    started: boolean;
}

/** The first spans of a ledger, the ones a usual needs before it can say anything. */
export function historySlots(ledger: Ledger, scope: Scope, span: Period): HistorySlot[] {
    const first = ledger.rows.reduce((day, row) => (row.day < day ? row.day : day), ledger.today);
    const firstKey = periodKeyIn(periodKindOf(span.key) ?? "month", first, ledger);
    return Array.from({ length: MIN_PRIOR_PERIODS }, (_, index) => {
        const each = periodOf(shiftPeriodKey(firstKey, index), ledger.firstDayOfMonth);
        return {
            entries: rowsBetween(ledger, scope, each.from, each.to, false).length,
            span: each,
            started: each.from <= ledger.today,
        };
    });
}
