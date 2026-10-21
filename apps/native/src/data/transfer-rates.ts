import { addDays, startOfDay } from "@outlayr/money/calendar";
import { utcDateString } from "@outlayr/money/dates";
import type { MarketRateType } from "@outlayr/money/rates";
import { buildRateTable } from "@outlayr/money/valuation";
import type { RateTable } from "@outlayr/money/valuation";
import { and, desc, eq, gt, inArray, isNull, lt, or } from "drizzle-orm";
import { useMemo } from "react";

import type { Database } from "@/db/client";
import { exchangeRates, transfers } from "@/db/schema";

import { useLiveQuery, useRatesRead } from "./live-query";

export interface RateSource {
    date: string;
    fetchedAt: number;
}

export interface TransferRateTable extends RateTable {
    source: (code: string, dateKey: string) => RateSource | null;
}

function isOlder(a: RateSource, b: RateSource): boolean {
    return a.date < b.date || (a.date === b.date && a.fetchedAt < b.fetchedAt);
}

export function pairRateSource(
    from: string,
    to: string,
    date: Date,
    table: TransferRateTable | undefined
): RateSource | null {
    if (table === undefined) {
        return null;
    }
    const dateKey = utcDateString(date.getTime());
    let oldest: RateSource | null = null;
    for (const code of [from, to]) {
        if (code !== "USD") {
            const source = table.source(code, dateKey);
            if (source === null) {
                return null;
            }
            oldest = oldest === null || isOlder(source, oldest) ? source : oldest;
        }
    }
    return oldest;
}

export function useTransferRates(
    db: Database,
    codes: readonly string[],
    rateTypes: readonly MarketRateType[]
): Partial<Record<MarketRateType, TransferRateTable>> {
    const quotes = useMemo(() => [...new Set(codes.filter((code) => code !== "USD"))].sort(), [codes]);
    const rows = useRatesRead(
        () =>
            db
                .select({
                    date: exchangeRates.date,
                    fetchedAt: exchangeRates.fetchedAt,
                    quote: exchangeRates.quote,
                    rate: exchangeRates.rate,
                    rateType: exchangeRates.rateType,
                })
                .from(exchangeRates)
                .where(
                    and(
                        inArray(exchangeRates.quote, quotes.length > 0 ? [...quotes] : [""]),
                        inArray(exchangeRates.rateType, rateTypes.length > 0 ? [...rateTypes] : [""])
                    )
                )
                .all(),
        [db, quotes.join(","), rateTypes.join(",")]
    );
    return useMemo(
        () =>
            Object.fromEntries(
                rateTypes.map((type) => {
                    const ofType = rows.filter((row) => row.rateType === type);
                    const source = (code: string, dateKey: string) => {
                        let newest: (typeof ofType)[number] | null = null;
                        for (const row of ofType) {
                            if (
                                row.quote === code &&
                                row.date <= dateKey &&
                                (newest === null || row.date > newest.date)
                            ) {
                                newest = row;
                            }
                        }
                        return newest === null ? null : { date: newest.date, fetchedAt: newest.fetchedAt };
                    };
                    return [type, { ...buildRateTable(ofType), source }];
                })
            ),
        [rows, rateTypes]
    );
}

export function usePriorCustomRate(
    db: Database,
    from: string,
    to: string,
    entryDate: Date
): { date: Date; rate: number } | null {
    const nextDay = addDays(startOfDay(entryDate), 1);
    const [prior] = useLiveQuery(
        transfers,
        () =>
            db
                .select({ date: transfers.date, from: transfers.fromCurrency, rate: transfers.exchangeRate })
                .from(transfers)
                .where(
                    and(
                        or(
                            and(eq(transfers.fromCurrency, from), eq(transfers.toCurrency, to)),
                            and(eq(transfers.fromCurrency, to), eq(transfers.toCurrency, from))
                        ),
                        eq(transfers.exchangeRateType, "custom"),
                        gt(transfers.exchangeRate, 0),
                        lt(transfers.date, nextDay),
                        isNull(transfers.deletedAt)
                    )
                )
                .orderBy(desc(transfers.date), desc(transfers.id))
                .limit(1),
        [db, from, to, nextDay.getTime()]
    );
    if (prior === undefined || prior.rate === null) {
        return null;
    }
    return { date: prior.date, rate: prior.from === from ? prior.rate : 1 / prior.rate };
}
