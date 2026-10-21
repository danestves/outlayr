import { decimalsFor } from "@outlayr/money/currency";

import type { TranslateFn } from "@/i18n/context";

import { addLocalDays, addLocalMonths, startOfLocalDay } from "./local-day";

export type MonthDay = number | "last";

export type InstallmentInterval =
    | { kind: "days"; every: number }
    | { kind: "months"; every: number }
    | { kind: "semimonthly"; days: readonly [MonthDay, MonthDay] };

export type InstallmentAmount = { each: number } | { total: number };

/** Not stored: once generated, the rows are the truth and are edited one by one. */
export interface ScheduleTemplate {
    /** Upfront excluded. */
    amount: InstallmentAmount;
    count: number;
    currency: string;
    firstDue?: Date;
    interval: InstallmentInterval;
    purchaseDay: Date;
    upfront?: number;
}

export interface ScheduledInstallment {
    amount: number;
    dueDate: Date;
    /** 0 is the upfront, 1..N the installments. */
    sequence: number;
}

function assertTemplate(template: ScheduleTemplate): void {
    if (!(Number.isInteger(template.count) && template.count >= 1)) {
        throw new Error("An order needs at least one installment");
    }
    const { interval } = template;
    if (interval.kind === "semimonthly") {
        if (!interval.days.every((day) => day === "last" || (Number.isInteger(day) && day >= 1 && day <= 31))) {
            throw new Error("A semimonthly day is 1 to 31 or the last day");
        }
    } else if (!(Number.isInteger(interval.every) && interval.every >= 1)) {
        throw new Error("An interval is a whole number of at least one");
    }
    const amount = "each" in template.amount ? template.amount.each : template.amount.total;
    if (!(amount > 0)) {
        throw new Error("Installments must be positive");
    }
    if ((template.upfront ?? 0) < 0) {
        throw new Error("The upfront payment cannot be negative");
    }
}

function clampedDay(year: number, month: number, day: MonthDay): Date {
    const lastDay = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, day === "last" ? lastDay : Math.min(day, lastDay));
}

function semimonthlySlots(year: number, month: number, days: readonly MonthDay[]): Date[] {
    const slots = days.map((day) => clampedDay(year, month, day)).sort((a, b) => a.getTime() - b.getTime());
    return slots.filter((slot, index) => index === 0 || slot.getTime() !== slots[index - 1]?.getTime());
}

function nextSemimonthly(afterMs: number, days: readonly MonthDay[]): Date {
    const after = new Date(afterMs);
    for (let offset = 0; ; offset += 1) {
        const slot = semimonthlySlots(after.getFullYear(), after.getMonth() + offset, days).find(
            (candidate) => candidate.getTime() > afterMs
        );
        if (slot) {
            return slot;
        }
    }
}

// Monthly dates are measured from their anchor, not the previous date, so a month clamped to the 28th drags no others.
function dueDates(
    purchaseMs: number,
    firstDue: Date | undefined,
    count: number,
    interval: InstallmentInterval
): Date[] {
    const indexes = Array.from({ length: count }, (_, index) => index);
    switch (interval.kind) {
        case "days": {
            const firstMs = firstDue?.getTime() ?? addLocalDays(purchaseMs, interval.every);
            return indexes.map((index) => new Date(addLocalDays(firstMs, index * interval.every)));
        }
        case "months": {
            return firstDue === undefined
                ? indexes.map((index) => addLocalMonths(purchaseMs, (index + 1) * interval.every))
                : indexes.map((index) => addLocalMonths(firstDue.getTime(), index * interval.every));
        }
        case "semimonthly": {
            let due = firstDue ?? nextSemimonthly(purchaseMs, interval.days);
            const dates = [due];
            while (dates.length < count) {
                due = nextSemimonthly(due.getTime(), interval.days);
                dates.push(due);
            }
            return dates;
        }
        default: {
            throw new Error("Unknown installment interval");
        }
    }
}

// Every figure here is summed and compared in whole minor units, so 3 x 13.33 + 13.34 never drifts by a float.
function toMinor(amount: number, currency: string): number {
    return Math.round(amount * 10 ** decimalsFor(currency));
}

function fromMinor(minor: number, currency: string): number {
    return minor / 10 ** decimalsFor(currency);
}

// The remainder goes in the LAST part: the one rule a provider documents (Afterpay Pay Monthly).
export function splitTotal(total: number, count: number, currency: string): number[] {
    const totalMinor = toMinor(total, currency);
    const base = Math.floor(totalMinor / count);
    return Array.from({ length: count }, (_, index) =>
        fromMinor(index === count - 1 ? totalMinor - base * (count - 1) : base, currency)
    );
}

export function generateSchedule(template: ScheduleTemplate): ScheduledInstallment[] {
    assertTemplate(template);
    const { amount, count, currency, interval } = template;
    const purchaseMs = startOfLocalDay(template.purchaseDay.getTime());
    const firstDue =
        template.firstDue === undefined ? undefined : new Date(startOfLocalDay(template.firstDue.getTime()));
    const amounts =
        "each" in amount
            ? Array.from({ length: count }, () => fromMinor(toMinor(amount.each, currency), currency))
            : splitTotal(amount.total, count, currency);

    const upfront = fromMinor(toMinor(template.upfront ?? 0, currency), currency);
    const rows = dueDates(purchaseMs, firstDue, count, interval).map((dueDate, index) => ({
        amount: amounts[index] ?? 0,
        dueDate,
        sequence: index + 1,
    }));
    return upfront > 0 ? [{ amount: upfront, dueDate: new Date(purchaseMs), sequence: 0 }, ...rows] : rows;
}

export interface InstallmentLike {
    amount: number;
    dueDate: Date;
    fee?: number;
    sequence: number;
}

export interface InstallmentStanding<Row extends InstallmentLike> {
    covered: number;
    overdue: boolean;
    owed: number;
    remaining: number;
    row: Row;
    status: "paid" | "partial" | "unpaid";
}

export interface PlanStanding<Row extends InstallmentLike> {
    finished: boolean;
    installmentsPaid: number;
    installmentsTotal: number;
    next: InstallmentStanding<Row> | null;
    overpaid: number;
    paid: number;
    remaining: number;
    rows: InstallmentStanding<Row>[];
    scheduled: number;
}

// Nothing is marked paid per row: the plan's total paid is allocated oldest first.
export function planStanding<Row extends InstallmentLike>(
    rows: readonly Row[],
    paid: number,
    today: Date,
    currency: string
): PlanStanding<Row> {
    const todayMs = startOfLocalDay(today.getTime());
    const ordered = [...rows].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime() || a.sequence - b.sequence);
    const paidMinor = toMinor(paid, currency);
    let left = paidMinor;
    let scheduledMinor = 0;

    const standings = ordered.map((row): InstallmentStanding<Row> => {
        const owedMinor = toMinor(row.amount, currency) + toMinor(row.fee ?? 0, currency);
        scheduledMinor += owedMinor;
        const coveredMinor = Math.min(Math.max(left, 0), owedMinor);
        left -= coveredMinor;
        const remainingMinor = owedMinor - coveredMinor;
        let status: InstallmentStanding<Row>["status"] = "partial";
        if (remainingMinor === 0) {
            status = "paid";
        } else if (coveredMinor === 0) {
            status = "unpaid";
        }
        return {
            covered: fromMinor(coveredMinor, currency),
            overdue: remainingMinor > 0 && row.dueDate.getTime() < todayMs,
            owed: fromMinor(owedMinor, currency),
            remaining: fromMinor(remainingMinor, currency),
            row,
            status,
        };
    });

    const installments = standings.filter((standing) => standing.row.sequence > 0);
    return {
        finished: standings.every((standing) => standing.status === "paid"),
        installmentsPaid: installments.filter((standing) => standing.status === "paid").length,
        installmentsTotal: installments.length,
        next: standings.find((standing) => standing.status !== "paid") ?? null,
        overpaid: fromMinor(Math.max(paidMinor - scheduledMinor, 0), currency),
        paid: fromMinor(paidMinor, currency),
        remaining: fromMinor(Math.max(scheduledMinor - paidMinor, 0), currency),
        rows: standings,
        scheduled: fromMinor(scheduledMinor, currency),
    };
}

export function orderName(t: TranslateFn, purchase: { note: string } | null): string {
    return purchase?.note.trim() || t("installments.order");
}
