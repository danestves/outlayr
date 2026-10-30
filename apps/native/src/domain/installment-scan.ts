import { decimalsFor } from "@outlayr/money/currency";
import { roundMoney } from "@outlayr/money/round";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as SchemaTransformation from "effect/SchemaTransformation";

import type { InstallmentPlanDraft } from "@/lib/cloud-ai";

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

const ISO_INSTANT =
    /^(?:(?:\d\d[2468][048]|\d\d[13579][26]|\d\d0[48]|[02468][048]00|[13579][26]00)-02-29|\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\d|30)|(?:02)-(?:0[1-9]|1\d|2[0-8])))T(?:(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z))$/;
const SEQUENCE_KEY = /^[1-9]\d*$/;

const seedMoney = Schema.Finite.check(Schema.isGreaterThan(0), Schema.isLessThan(AMOUNT_CEILING));
const seedDate = Schema.String.check(Schema.isPattern(ISO_INSTANT)).pipe(
    Schema.decodeTo(Schema.Date, SchemaTransformation.dateFromString)
);
const wholeNumber = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0));

const decodeSeed = Schema.decodeUnknownOption(
    Schema.Struct({
        count: Schema.Int.check(Schema.isBetween({ maximum: MAX_INSTALLMENT_COUNT, minimum: 1 })),
        each: Schema.NullOr(seedMoney),
        edits: Schema.Record(
            Schema.String,
            Schema.Struct({ amount: Schema.optional(seedMoney), dueDate: Schema.optional(seedDate) })
        ).check(Schema.makeFilter((edits) => Object.keys(edits).every((sequence) => SEQUENCE_KEY.test(sequence)))),
        every: Schema.Literals(EVERY_ORDER),
        fees: Schema.mutable(Schema.Array(Schema.Struct({ amount: seedMoney, sequence: wholeNumber }))),
        firstDue: Schema.NullOr(seedDate),
        paidBefore: Schema.NullOr(wholeNumber),
        upfront: Schema.Union([
            Schema.Struct({
                amount: Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0), Schema.isLessThan(AMOUNT_CEILING)),
            }),
            Schema.Struct({
                share: Schema.Finite.check(
                    Schema.isBetween({ exclusiveMaximum: true, exclusiveMinimum: true, maximum: 1, minimum: 0 })
                ),
            }),
        ]),
    }).check(
        Schema.makeFilter(
            ({ count, edits, fees, paidBefore }) =>
                (paidBefore ?? 0) <= count &&
                fees.every((fee) => fee.sequence <= count) &&
                Object.keys(edits).every((sequence) => Number(sequence) <= count)
        )
    )
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
    const parsed = decodeSeed(json);
    if (Option.isNone(parsed)) {
        return undefined;
    }
    const { fees, ...draft } = parsed.value;
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
