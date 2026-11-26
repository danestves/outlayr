import { BUDGET_TYPE, periodEnd, startOfPeriod } from "@outlayr/money/budget-window";

const MS_PER_DAY = 86_400_000;

export function daysInMonthPeriod(now: Date, firstDayOfMonth: number): number {
    const start = startOfPeriod(now, BUDGET_TYPE.month, { firstDayOfMonth, firstWeekday: 1 });
    return Math.round((periodEnd(start, BUDGET_TYPE.month).getTime() - start.getTime()) / MS_PER_DAY);
}
