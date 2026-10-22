import { decimalsFor } from "@outlayr/money/currency";
import { roundMoney } from "@outlayr/money/round";
import { z } from "zod";

import type { InstallmentPlanDraft } from "@/lib/convex";

import { draftSchedule, EVERY_OPTIONS, EVERY_ORDER, MAX_INSTALLMENT_COUNT } from "./installment-draft";
import type { EveryOption, InstallmentDraft } from "./installment-draft";
import { generateSchedule } from "./installments";
import { addLocalDays, addLocalMonths } from "./local-day";
import { AMOUNT_CEILING } from "./numpad";

export interface InstallmentSeed {
    draft: InstallmentDraft;
    fees: { amount: number; sequence: number }[];
}

export interface ScannedOrder extends InstallmentSeed {
    price: number;
    purchaseDay: Date;
}

const seedMoney = z.number().positive().lt(AMOUNT_CEILING);
const seedDate = z.iso.datetime().transform((iso) => new Date(iso));

const seedSchema = z
    .object({
        count: z.int().min(1).max(MAX_INSTALLMENT_COUNT),
        each: seedMoney.nullable(),
        edits: z.record(
            z.string().regex(/^[1-9]\d*$/),
            z.object({ amount: seedMoney.optional(), dueDate: seedDate.optional() })
        ),
        every: z.enum(EVERY_ORDER),
        fees: z.array(z.object({ amount: seedMoney, sequence: z.int().min(0) })),
        firstDue: seedDate.nullable(),
        paidBefore: z.int().min(0).nullable(),
        upfront: z.union([
            z.object({ amount: z.number().min(0).lt(AMOUNT_CEILING) }),
            z.object({ share: z.number().gt(0).lt(1) }),
        ]),
    })
    .refine(
        ({ count, edits, fees, paidBefore }) =>
            (paidBefore ?? 0) <= count &&
            fees.every((fee) => fee.sequence <= count) &&
            Object.keys(edits).every((sequence) => Number(sequence) <= count)
    );

export function encodeInstallmentSeed({ draft, fees }: InstallmentSeed): string {
    return JSON.stringify({ ...draft, fees });
}

export function parseInstallmentSeed(param: string | undefined): InstallmentSeed | undefined {
    if (param === undefined) {
        return undefined;
    }
    let json: unknown;
    try {
        json = JSON.parse(param);
    } catch {
        return undefined;
    }
    const parsed = seedSchema.safeParse(json);
    if (!parsed.success) {
        return undefined;
    }
    const { fees, ...draft } = parsed.data;
    return { draft: { ...draft, upfrontAccountId: null }, fees };
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
