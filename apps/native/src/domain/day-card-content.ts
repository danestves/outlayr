import type { CurrencyBucket } from "@outlayr/money/currency-totals";

import { formatDayHeader, formatTime } from "./dates";
import type { DayCardInput } from "./day-card";
import { amountDigits, amountParts, withCurrencySymbol } from "./money";

interface CardableTransaction {
    amount: number;
    categoryName: string | null;
    currency: string | null;
    date: Date;
    fee?: CardableTransaction;
    income: boolean;
    note: string;
}

export interface CardableSection {
    data: readonly CardableTransaction[];
    day: Date;
    totals: readonly CurrencyBucket[];
}

export interface DayCardOptions {
    currency: string;
    showCents: boolean;
    swapTimeLabel: boolean;
    use24Hour: boolean;
}

function figure(amount: number, code: string, showCents: boolean): string {
    const parts = amountParts(amount, code, showCents);
    return withCurrencySymbol(parts, amountDigits(parts));
}

function signed(amount: number, code: string, showCents: boolean): string {
    return `${amount < 0 ? "-" : "+"}${figure(amount, code, showCents)}`;
}

/** Honours the Log's display settings: someone who turned cents off must not get them back in a shared card. */
export function dayCardContent(
    section: CardableSection,
    options: DayCardOptions,
    now: Date = new Date()
): DayCardInput {
    return {
        dayLabel: formatDayHeader(section.day, now),
        rows: section.data
            .flatMap((row) => (row.fee ? [row, row.fee] : [row]))
            .map((row) => {
                const code = row.currency ?? options.currency;
                const magnitude = figure(row.amount, code, options.showCents);
                return {
                    amount: `${row.income ? "+" : "-"}${magnitude}`,
                    meta: options.swapTimeLabel ? (row.categoryName ?? "") : formatTime(row.date, options.use24Hour),
                    note: row.note,
                };
            }),
        // Side by side, never summed, matching the day header's refusal to invent a rate.
        total: section.totals
            .map((bucket) => signed(bucket.amount, bucket.currencyCode, options.showCents))
            .join(" / "),
    };
}

export function dayCardFileName(day: Date): string {
    const year = day.getFullYear();
    const month = `${day.getMonth() + 1}`.padStart(2, "0");
    const date = `${day.getDate()}`.padStart(2, "0");
    return `outlayr-${year}-${month}-${date}.png`;
}
