import { startOfDay } from "./calendar";
import { currencyTotals } from "./currency-totals";
import type { CurrencyBucket, CurrencyEntry } from "./currency-totals";
import { RECURRING_TYPE } from "./recurrence";
import type { RateTable } from "./valuation";

export interface ScheduleCostEntry extends CurrencyEntry {
    recurringCoefficient: number;
    recurringEndDate?: Date | null;
    recurringType: number;
}

// A year of 365 days and 52 weeks disagree by a day, the price of a figure that does not drift with the month.
export function monthlyChargeCount(recurringType: number, recurringCoefficient: number): number {
    // Normalized exactly as `nextDate` does, so the count matches the dates the back-fill writes.
    const every = Math.max(1, Math.round(recurringCoefficient));
    switch (recurringType) {
        case RECURRING_TYPE.daily: {
            return 365 / 12 / every;
        }
        case RECURRING_TYPE.weekly: {
            return 52 / 12 / every;
        }
        case RECURRING_TYPE.monthly: {
            return 1 / every;
        }
        case RECURRING_TYPE.yearly: {
            return 1 / (12 * every);
        }
        default: {
            return 0;
        }
    }
}

// Retired and ended schedules are dropped, not added as zero, which would open a bucket for a currency nothing
// recurs in.
export function monthlySubscriptionCost(
    schedules: readonly ScheduleCostEntry[],
    globalCurrency: string,
    rates?: RateTable,
    now: Date = new Date()
): CurrencyBucket[] {
    const perMonth: CurrencyEntry[] = [];
    for (const schedule of schedules) {
        const charges = monthlyChargeCount(schedule.recurringType, schedule.recurringCoefficient);
        if (charges === 0 || schedule.income) {
            continue;
        }
        const endsAt = schedule.recurringEndDate;
        if (endsAt != null && startOfDay(endsAt).getTime() < startOfDay(now).getTime()) {
            continue;
        }
        perMonth.push({
            amount: schedule.amount * charges,
            // Scaled with the face amount, or a converted bucket would mix a month and a single charge.
            amountUsd: schedule.amountUsd == null ? null : schedule.amountUsd * charges,
            currency: schedule.currency,
            // Today's rate: the schedule's own date is its first save, which can predate every rate held.
            date: now,
            income: schedule.income,
        });
    }
    return currencyTotals(perMonth, globalCurrency, rates);
}
