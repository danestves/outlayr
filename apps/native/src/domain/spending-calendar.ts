import { utcDateString } from "@outlayr/money/dates";
import { valueDatedRowsIn, valueExactIn } from "@outlayr/money/valuation";
import type { RateTable } from "@outlayr/money/valuation";

import { localDayKey } from "./local-day";

interface SpendingCalendarValuation {
    displayCurrency: string;
    rates: RateTable;
}

export interface SpendingCalendarRow {
    amount: number;
    amountUsd: number | null;
    currency: string | null;
    exchangeRate?: number | null;
    exchangeRateType?: string | null;
    income: boolean;
    plotKey: string;
    valuationDate: Date;
}

export interface SpendingCalendarEntry {
    date: string;
    exact: boolean;
    value: number;
}

function compareStrings(left: string, right: string): number {
    if (left < right) {
        return -1;
    }
    if (left > right) {
        return 1;
    }
    return 0;
}

function compareRows(left: SpendingCalendarRow, right: SpendingCalendarRow): number {
    const localDateComparison = compareStrings(left.plotKey, right.plotKey);
    if (localDateComparison !== 0) {
        return localDateComparison;
    }
    const valuationDateComparison = left.valuationDate.getTime() - right.valuationDate.getTime();
    if (valuationDateComparison !== 0) {
        return valuationDateComparison;
    }
    return compareStrings(left.currency ?? "", right.currency ?? "");
}

export function spendingCalendarEntries(
    rows: readonly SpendingCalendarRow[],
    valuation: SpendingCalendarValuation,
    now: Date
): SpendingCalendarEntry[] {
    const today = localDayKey(now.getTime());
    const expenses = rows.filter((row) => !row.income && row.plotKey <= today).sort(compareRows);
    const values = valueDatedRowsIn(
        expenses.map((row) => ({ ...row, date: row.valuationDate })),
        valuation.displayCurrency,
        valuation.rates
    );
    const totals = new Map<string, Omit<SpendingCalendarEntry, "date">>();

    for (let index = 0; index < expenses.length; index += 1) {
        const row = expenses[index];
        const date = row.plotKey;
        const total = totals.get(date) ?? { exact: true, value: 0 };
        total.exact &&=
            valueExactIn(
                {
                    amount: row.amount,
                    amountUsd: row.amountUsd,
                    currency: row.currency,
                    dateKey: utcDateString(row.valuationDate.getTime()),
                    exchangeRate: row.exchangeRate,
                    exchangeRateType: row.exchangeRateType,
                },
                valuation.displayCurrency,
                valuation.rates
            ) !== null;
        total.value += values[index] ?? 0;
        totals.set(date, total);
    }

    return [...totals.entries()]
        .map(([date, { exact, value }]) => ({ date, exact, value }))
        .sort((left, right) => left.date.localeCompare(right.date));
}
