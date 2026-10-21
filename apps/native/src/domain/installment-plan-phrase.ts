import type { TranslateFn } from "@/i18n/context";

import { generateSchedule } from "./installments";
import type { InstallmentInterval, InstallmentLike, MonthDay } from "./installments";
import { daysBetween, localDayKey } from "./local-day";

export interface PlanTerms {
    count: number;
    interval: InstallmentInterval | null;
    upfront: boolean;
}

const WEEK = 7;
const MONTHS_IN_YEAR = 12;
const LAST_DAY_ORDER = 32;

function lastDayOf(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function monthIndex(date: Date): number {
    return date.getFullYear() * MONTHS_IN_YEAR + date.getMonth();
}

function anchoredDay(dates: readonly Date[]): MonthDay {
    return dates.every((date) => date.getDate() === lastDayOf(date))
        ? "last"
        : Math.max(...dates.map((date) => date.getDate()));
}

function dayOrder(day: MonthDay): number {
    return day === "last" ? LAST_DAY_ORDER : day;
}

function landsOn(date: Date, day: MonthDay): boolean {
    return date.getDate() === (day === "last" ? lastDayOf(date) : Math.min(day, lastDayOf(date)));
}

function isMonthly(dates: readonly Date[]): boolean {
    const day = anchoredDay(dates);
    return dates.every(
        (date, index) =>
            landsOn(date, day) && (index === 0 || monthIndex(date) - monthIndex(dates[index - 1] ?? date) === 1)
    );
}

function dayGap(dates: readonly Date[]): number | null {
    const [first, second] = dates;
    const gap = first && second ? daysBetween(first.getTime(), second.getTime()) : 0;
    const even = dates.every(
        (date, index) => index === 0 || daysBetween((dates[index - 1] ?? date).getTime(), date.getTime()) === gap
    );
    return gap > 0 && even ? gap : null;
}

function semimonthlyDays(dates: readonly Date[]): readonly [MonthDay, MonthDay] | null {
    const [first] = dates;
    if (!first) {
        return null;
    }
    const days = [
        anchoredDay(dates.filter((_, index) => index % 2 === 0)),
        anchoredDay(dates.filter((_, index) => index % 2 === 1)),
    ].sort((a, b) => dayOrder(a) - dayOrder(b));
    const [early, late] = days;
    if (early === undefined || late === undefined || early === late) {
        return null;
    }
    const regenerated = generateSchedule({
        amount: { each: 1 },
        count: dates.length,
        currency: "USD",
        firstDue: first,
        interval: { days: [early, late], kind: "semimonthly" },
        purchaseDay: first,
    });
    const matches = regenerated.every(
        (row, index) => localDayKey(row.dueDate.getTime()) === localDayKey(dates[index]?.getTime() ?? Number.NaN)
    );
    return matches ? [early, late] : null;
}

function inferredInterval(dates: readonly Date[]): InstallmentInterval | null {
    if (isMonthly(dates)) {
        return { every: 1, kind: "months" };
    }
    const gap = dayGap(dates);
    if (gap !== null) {
        return { every: gap, kind: "days" };
    }
    const days = semimonthlyDays(dates);
    return days === null ? null : { days, kind: "semimonthly" };
}

export function planFromRows(rows: readonly InstallmentLike[]): PlanTerms | null {
    const dates = rows
        .filter((row) => row.sequence > 0)
        .sort((a, b) => a.sequence - b.sequence)
        .map((row) => row.dueDate);
    const upfront = rows.some((row) => row.sequence === 0);
    if (dates.length < 2) {
        return dates.length === 0 ? null : { count: 1, interval: null, upfront };
    }
    const interval = inferredInterval(dates);
    return interval === null ? null : { count: dates.length, interval, upfront };
}

function cadencePhrase(t: TranslateFn, interval: InstallmentInterval, cuotas: string): string {
    switch (interval.kind) {
        case "days": {
            return interval.every === WEEK
                ? t("installments.plan.weekly", { cuotas })
                : t("installments.plan.everyDays", { count: interval.every, cuotas });
        }
        case "months": {
            return t("installments.plan.everyMonths", { count: interval.every, cuotas });
        }
        case "semimonthly": {
            const [first, second] = interval.days;
            return second === "last"
                ? t("installments.plan.semimonthlyLast", { cuotas, first })
                : t("installments.plan.semimonthly", { cuotas, first, second });
        }
        default: {
            return cuotas;
        }
    }
}

export function planPhrase(t: TranslateFn, { count, interval, upfront }: PlanTerms): string {
    const cuotas = t("installments.plan.cuotas", { count });
    const plan = count > 1 && interval !== null ? cadencePhrase(t, interval, cuotas) : cuotas;
    return upfront ? t("installments.plan.upfront", { plan }) : plan;
}

export function orderPlanPhrase(t: TranslateFn, standings: readonly { row: InstallmentLike }[]): string | null {
    const terms = planFromRows(standings.map(({ row }) => row));
    return terms === null ? null : planPhrase(t, terms);
}
