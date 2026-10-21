import { decimalsFor } from "@outlayr/money/currency";
import { roundMoney } from "@outlayr/money/round";

import type { InstallmentPlanDraft } from "@/lib/convex";

import { draftSchedule, EVERY_OPTIONS, EVERY_ORDER } from "./installment-draft";
import type { EveryOption, InstallmentDraft } from "./installment-draft";
import { generateSchedule } from "./installments";
import { addLocalDays, addLocalMonths } from "./local-day";

export interface ScannedOrder {
    draft: InstallmentDraft;
    fees: { amount: number; sequence: number }[];
    price: number;
    purchaseDay: Date;
}

interface ScannedRow {
    amount: number;
    dueDate: Date;
    fee: number;
    paid: boolean;
    sequence: number;
}

function localDay(key: string): Date {
    return new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10)));
}

function missedDates(
    cuotas: readonly ScannedRow[],
    every: EveryOption,
    purchaseDay: Date,
    firstDue: Date | undefined
): number {
    return generateSchedule({
        amount: { each: 1 },
        count: cuotas.length,
        currency: "USD",
        firstDue,
        interval: EVERY_OPTIONS[every],
        purchaseDay,
    }).filter((row, index) => row.dueDate.getTime() !== cuotas[index]?.dueDate.getTime()).length;
}

function inferEvery(cuotas: readonly ScannedRow[], firstDue: Date, upfrontDay: Date | undefined): EveryOption {
    const ranked = EVERY_ORDER.map((every) => ({
        anchored: upfrontDay === undefined ? 0 : missedDates(cuotas, every, upfrontDay, undefined),
        every,
        missed: missedDates(cuotas, every, firstDue, firstDue),
    }));
    return ranked.reduce((best, next) =>
        next.missed < best.missed || (next.missed === best.missed && next.anchored < best.anchored) ? next : best
    ).every;
}

function intervalBefore(day: Date, every: EveryOption): Date {
    const interval = EVERY_OPTIONS[every];
    if (interval.kind === "months") {
        return addLocalMonths(day.getTime(), -interval.every);
    }
    const days = interval.kind === "days" ? interval.every : EVERY_OPTIONS.days15.every;
    return new Date(addLocalDays(day.getTime(), -days));
}

export function scannedOrder(plan: InstallmentPlanDraft, currency: string): ScannedOrder | null {
    const decimals = decimalsFor(currency);
    const rows: ScannedRow[] = plan.rows.map((row) => ({
        amount: roundMoney(row.amount, decimals),
        dueDate: localDay(row.dueDate),
        fee: roundMoney(row.fee, decimals),
        paid: row.paid,
        sequence: row.sequence,
    }));
    const upfront = rows.find((row) => row.sequence === 0);
    const cuotas = rows.filter((row) => row.sequence > 0);
    const [first] = cuotas;
    if (first === undefined) {
        return null;
    }
    const every = inferEvery(cuotas, first.dueDate, upfront?.dueDate);
    const purchaseDay = upfront?.dueDate ?? intervalBefore(first.dueDate, every);
    const price = roundMoney(
        rows.reduce((sum, row) => sum + row.amount, 0),
        decimals
    );
    const unpaid = cuotas.findIndex((row) => !row.paid);
    const generic: InstallmentDraft = {
        count: cuotas.length,
        each: null,
        edits: {},
        every,
        firstDue: first.dueDate,
        paidBefore: unpaid === -1 ? cuotas.length : unpaid,
        upfront: { amount: upfront?.amount ?? 0 },
        upfrontAccountId: null,
    };
    const schedule = draftSchedule(generic, price, purchaseDay, currency);
    if (schedule === null) {
        return null;
    }
    const edits: Record<number, { amount?: number; dueDate?: Date }> = {};
    for (const row of schedule) {
        const scanned = cuotas.find((cuota) => cuota.sequence === row.sequence);
        if (scanned === undefined) {
            continue;
        }
        if (scanned.amount !== row.amount) {
            edits[row.sequence] = { ...edits[row.sequence], amount: scanned.amount };
        }
        if (scanned.dueDate.getTime() !== row.dueDate.getTime()) {
            edits[row.sequence] = { ...edits[row.sequence], dueDate: scanned.dueDate };
        }
    }
    return {
        draft: { ...generic, edits },
        fees: rows.filter((row) => row.fee > 0).map((row) => ({ amount: row.fee, sequence: row.sequence })),
        price,
        purchaseDay,
    };
}
