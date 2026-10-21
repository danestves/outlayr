import { currencyTotals } from "@outlayr/money/currency-totals";
import type { CurrencyBucket } from "@outlayr/money/currency-totals";
import { utcDateString } from "@outlayr/money/dates";
import { isExact, valueRowsIn } from "@outlayr/money/valuation";
import type { RateTable } from "@outlayr/money/valuation";

import { growing } from "@/lib/growing";

import { DEFAULT_CURRENCY } from "./money";

export interface DayGroupable {
    amount: number;
    amountUsd?: number | null;
    /** Null: the entry stated no currency, and today's ledger currency cannot be assumed to match. */
    currency?: string | null;
    /** Converts at this instant's rate; `day` is a local midnight, the wrong UTC day for half the world. */
    date?: Date;
    day: Date;
    /** On a Log transfer: money moved between the user's own accounts is neither income nor spending. */
    excludedFromTotals?: boolean;
    feeForId?: string | null;
    id?: string;
    income: boolean;
    transferId?: string | null;
    valued?: number | null;
}

export interface DaySection<T> {
    data: T[];
    day: Date;
    key: string;
    /** Adds currencies together, so only meaningful on a one-currency day; prefer {@link DaySection.totals}. */
    total: number;
    totals: CurrencyBucket[];
}

export type WithFee<T> = T & { fee?: T };

export type Valued<T> = T & Pick<DayGroupable, "valued">;

const instant = (row: DayGroupable): number => (row.date ?? row.day).getTime();

const localDay = (row: DayGroupable): number => new Date(instant(row)).setHours(0, 0, 0, 0);

function feeParent(row: DayGroupable): string | null {
    const parent = row.feeForId ?? row.transferId ?? null;
    return parent === row.id ? null : parent;
}

export function foldFees<T extends DayGroupable>(rows: readonly T[]): WithFee<T>[] {
    const ids = new Set(rows.map((row) => row.id));
    const fees = new Map<string, T>();
    for (const row of rows) {
        const parent = feeParent(row);
        if (parent !== null && ids.has(parent)) {
            fees.set(parent, row);
        }
    }
    return rows.flatMap((row) => {
        const parent = feeParent(row);
        if (parent !== null && fees.get(parent) === row) {
            return [];
        }
        const fee = row.id === undefined ? undefined : fees.get(row.id);
        return fee === undefined ? [row] : [{ ...row, fee }];
    });
}

/** Values rows from the header's own `(currency, UTC day, direction)` cells, so they add up to it to the cent. */
export function valueRows<T extends DayGroupable>(
    rows: readonly T[],
    currency: string,
    rates: RateTable | undefined
): readonly Valued<T>[] {
    if (!rates) {
        return rows;
    }
    const counted = rows.filter((row) => !row.excludedFromTotals);
    const valuables = counted.map((row) => ({
        amount: row.amount,
        amountUsd: row.amountUsd ?? null,
        currency: row.currency ?? null,
        // The key `toCells` files the row under, so it lands in its header's cell.
        dateKey: row.date ? utcDateString(row.date.getTime()) : "",
        income: row.income,
    }));
    const values = valueRowsIn(valuables, currency, rates);
    const valued = new Map(
        counted.map((row, index): [T, number | null] => [
            row,
            isExact(valuables[index], currency, rates) ? values[index] : null,
        ])
    );
    return rows.map((row) => ({ ...row, valued: valued.get(row) ?? null }));
}

/**
 * Newest first, keyed on the local day of the row's instant: the stored `day` is midnight in the zone it was
 * saved in, so keying on it splits one day in two after a zone change.
 */
export function groupByDay<T extends DayGroupable>(
    rows: readonly T[],
    globalCurrency: string = DEFAULT_CURRENCY,
    rates?: RateTable
): DaySection<WithFee<Valued<T>>>[] {
    const sections: DaySection<T>[] = [];
    const byDay = new Map<number, DaySection<T>>();
    for (const row of rows) {
        const key = localDay(row);
        let section = byDay.get(key);
        if (!section) {
            section = { data: [], day: new Date(key), key: String(key), total: 0, totals: [] };
            byDay.set(key, section);
            sections.push(section);
        }
        section.data.push(row);
    }
    sections.sort((a, b) => b.day.getTime() - a.day.getTime());
    for (const section of sections) {
        section.data.sort((a, b) => instant(b) - instant(a));
        section.totals = currencyTotals(
            section.data.filter((row) => !row.excludedFromTotals),
            globalCurrency,
            rates
        );
        // From the buckets, not re-summed rows, so a one-currency total matches the header to the cent.
        let total = 0;
        for (const bucket of section.totals) {
            total += bucket.amount;
        }
        section.total = total;
    }
    return sections.map((section) => ({
        ...section,
        data: foldFees(valueRows(section.data, globalCurrency, rates)),
    }));
}

/** A zone change can push the stored `day` across a local day, so halves that meet or cross regroup whole. */
export function joinDaySections<T>(
    newer: DaySection<T>[],
    older: DaySection<T>[],
    regroup: () => DaySection<T>[]
): DaySection<T>[] {
    const oldestNewer = newer.at(-1);
    const [newestOlder] = older;
    if (!oldestNewer || !newestOlder) {
        return oldestNewer ? newer : older;
    }
    return newestOlder.day.getTime() < oldestNewer.day.getTime() ? [...newer, ...older] : regroup();
}

/** For rows that grow by older ones (the Log paging): groups only the added rows and joins them on. One per list. */
export function groupByDayAsItGrows<T extends DayGroupable>(globalCurrency: string, rates?: RateTable) {
    return growing(
        (rows: readonly T[]) => groupByDay(rows, globalCurrency, rates),
        (held, added, rows) => joinDaySections(held, added, () => groupByDay(rows, globalCurrency, rates))
    );
}

/** Runs the first `cap` rows on to the end of the last one's day, so no header totals part of a day. */
export function capAtDayEnd(rows: readonly DayGroupable[], cap: number): number {
    const last = rows[cap - 1];
    if (rows.length <= cap || !last) {
        return rows.length;
    }
    const lastDay = localDay(last);
    const next = rows.findIndex((row, index) => index >= cap && localDay(row) !== lastDay);
    return next === -1 ? rows.length : next;
}
