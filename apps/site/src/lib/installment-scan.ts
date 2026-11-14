import type { InstallmentPlanDraft } from "@outlayr/backend/confect/installmentScan.spec";
import { MAX_IMAGE_BYTES } from "@outlayr/backend/confect/lib/captureArgs";
import { addLocalDays, addLocalMonths } from "@outlayr/money/calendar";
import { decimalsFor } from "@outlayr/money/currency";
import { draftSchedule, EVERY_OPTIONS, EVERY_ORDER } from "@outlayr/money/installment-draft";
import type { EveryOption, InstallmentDraft } from "@outlayr/money/installment-draft";
import { generateSchedule } from "@outlayr/money/installments";
import { roundMoney } from "@outlayr/money/round";

export type ScannedPlan = typeof InstallmentPlanDraft.Type;

export interface PurchaseSeed {
    accountId: string;
    count: number;
    edits: InstallmentDraft["edits"];
    every: EveryOption;
    fees: readonly { amount: number; sequence: number }[];
    firstDue: Date;
    paidBefore: number;
    price: number;
    purchaseDay: Date;
    upfront: number;
}

interface ScannedRow {
    amount: number;
    dueDate: Date;
    fee: number;
    paid: boolean;
    sequence: number;
}

const localDay = (key: string) =>
    new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10)));

function missedDates(rows: readonly ScannedRow[], every: EveryOption, purchaseDay: Date, firstDue?: Date) {
    return generateSchedule({
        amount: { each: 1 },
        count: rows.length,
        currency: "USD",
        firstDue,
        interval: EVERY_OPTIONS[every],
        purchaseDay,
    }).filter((row, index) => row.dueDate.getTime() !== rows[index]?.dueDate.getTime()).length;
}

function inferEvery(rows: readonly ScannedRow[], firstDue: Date, upfrontDay: Date | undefined): EveryOption {
    const ranked = EVERY_ORDER.map((every) => ({
        anchored: upfrontDay === undefined ? 0 : missedDates(rows, every, upfrontDay),
        every,
        missed: missedDates(rows, every, firstDue, firstDue),
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

export function scannedSeed(plan: ScannedPlan, account: { currency: string; id: string }): PurchaseSeed | null {
    const decimals = decimalsFor(account.currency);
    const rows: ScannedRow[] = plan.rows.map((row) => ({
        amount: roundMoney(row.amount, decimals),
        dueDate: localDay(row.dueDate),
        fee: roundMoney(row.fee, decimals),
        paid: row.paid,
        sequence: row.sequence,
    }));
    const upfront = rows.find((row) => row.sequence === 0);
    const installments = rows.filter((row) => row.sequence > 0);
    const [first] = installments;
    if (first === undefined) {
        return null;
    }
    const every = inferEvery(installments, first.dueDate, upfront?.dueDate);
    const purchaseDay = upfront?.dueDate ?? intervalBefore(first.dueDate, every);
    const price = roundMoney(
        rows.reduce((sum, row) => sum + row.amount, 0),
        decimals
    );
    const unpaid = installments.findIndex((row) => !row.paid);
    const paidBefore = unpaid === -1 ? installments.length : unpaid;
    const generic: InstallmentDraft = {
        count: installments.length,
        each: null,
        edits: {},
        every,
        firstDue: first.dueDate,
        paidBefore,
        upfront: { amount: upfront?.amount ?? 0 },
        upfrontAccountId: null,
    };
    const schedule = draftSchedule(generic, price, purchaseDay, account.currency);
    if (schedule === null) {
        return null;
    }
    const edits: Record<number, { amount?: number; dueDate?: Date }> = {};
    for (const row of schedule) {
        const scanned = installments.find((each) => each.sequence === row.sequence);
        if (scanned !== undefined && scanned.amount !== row.amount) {
            edits[row.sequence] = { ...edits[row.sequence], amount: scanned.amount };
        }
        if (scanned !== undefined && scanned.dueDate.getTime() !== row.dueDate.getTime()) {
            edits[row.sequence] = { ...edits[row.sequence], dueDate: scanned.dueDate };
        }
    }
    return {
        accountId: account.id,
        count: installments.length,
        edits,
        every,
        fees: rows.filter((row) => row.fee > 0).map((row) => ({ amount: row.fee, sequence: row.sequence })),
        firstDue: first.dueDate,
        paidBefore,
        price,
        purchaseDay,
        upfront: upfront?.amount ?? 0,
    };
}

const LONG_SIDE = [2000, 1600, 1280, 1024] as const;
const QUALITY = [0.85, 0.72, 0.6] as const;

export async function scanImage(file: Blob): Promise<ArrayBuffer | null> {
    const bitmap = await createImageBitmap(file).catch(() => null);
    if (bitmap === null) {
        return null;
    }
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (context === null) {
        return null;
    }
    for (const side of LONG_SIDE) {
        const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        context.fillStyle = "#fff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        for (const quality of QUALITY) {
            // oxlint-disable-next-line no-await-in-loop -- each try depends on the size of the last.
            const blob = await new Promise<Blob | null>((resolve) => {
                canvas.toBlob(resolve, "image/jpeg", quality);
            });
            if (blob !== null && blob.size <= MAX_IMAGE_BYTES) {
                bitmap.close();
                return blob.arrayBuffer();
            }
        }
    }
    bitmap.close();
    return null;
}
