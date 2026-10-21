import { describe, expect, it } from "@jest/globals";
import { act, renderHook } from "@testing-library/react-native";

import type { Database } from "@/db/client";
import { exchangeRates, transfers } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";

import { bumpRatesRevision } from "./rates-revision";
import { pairRateSource, usePriorCustomRate, useTransferRates } from "./transfer-rates";

const OFFICIAL = ["official"] as const;
const ENTRY_DAY = new Date(2026, 8, 29, 12);

async function seedRow(db: Database, quote: string, date: string, fetchedAt: number): Promise<void> {
    await db.insert(exchangeRates).values({ date, fetchedAt, quote, rate: 40, rateType: "official", source: "test" });
}

async function seedTransfer(
    db: Database,
    values: {
        date: Date;
        exchangeRate: number;
        exchangeRateType: string;
        fromCurrency?: string;
        id: string;
        toCurrency: string;
    }
): Promise<void> {
    await db.insert(transfers).values({
        dateCreated: values.date,
        day: values.date,
        fromAccountId: "from",
        fromAmount: 1,
        fromCurrency: "USD",
        month: values.date,
        toAccountId: "to",
        toAmount: values.exchangeRate,
        updatedAt: values.date,
        ...values,
    });
}

async function seedRate(db: Database, rate: number): Promise<void> {
    await db.insert(exchangeRates).values({
        date: "2026-09-15",
        fetchedAt: Date.now(),
        quote: "VES",
        rate,
        rateType: "official",
        source: "test",
    });
}

describe("useTransferRates", () => {
    // A refresh's unqualified DELETE skips the update hook `useLiveQuery` listens on (SQLite's truncate
    // optimization), so only `rates-revision` announces it.
    it("picks up a refresh that announced itself only through the revision counter", async () => {
        const db = migratedDatabase({ foreignKeys: false });
        const { result } = await renderHook(() => useTransferRates(db, ["USD", "VES"], OFFICIAL));
        expect(result.current.official?.get("VES", "2026-09-15")).toBeNull();

        await seedRate(db, 40);
        expect(result.current.official?.get("VES", "2026-09-15")).toBeNull();

        await act(async () => {
            bumpRatesRevision();
        });

        expect(result.current.official?.get("VES", "2026-09-15")).not.toBeNull();
    });

    it("names the row a quote came from, and the older of the two behind a cross pair", async () => {
        const db = migratedDatabase({ foreignKeys: false });
        await seedRow(db, "VES", "2026-09-19", 1);
        await seedRow(db, "VES", "2026-09-10", 2);
        await seedRow(db, "VES", "2026-09-30", 3);
        await seedRow(db, "EUR", "2026-09-28", 4);

        const { result } = await renderHook(() => useTransferRates(db, ["EUR", "VES"], OFFICIAL));
        const table = result.current.official;

        expect(pairRateSource("USD", "VES", ENTRY_DAY, table)).toStrictEqual({ date: "2026-09-19", fetchedAt: 1 });
        expect(pairRateSource("USD", "EUR", ENTRY_DAY, table)).toStrictEqual({ date: "2026-09-28", fetchedAt: 4 });
        expect(pairRateSource("EUR", "VES", ENTRY_DAY, table)).toStrictEqual({ date: "2026-09-19", fetchedAt: 1 });
        expect(pairRateSource("USD", "COP", ENTRY_DAY, table)).toBeNull();
    });
});

describe("usePriorCustomRate", () => {
    it("finds the newest typed rate for the pair on or before the entry's day", async () => {
        const db = migratedDatabase({ foreignKeys: false });
        const typed = { exchangeRateType: "custom", toCurrency: "VES" };
        await seedTransfer(db, { ...typed, date: new Date(2026, 8, 20), exchangeRate: 990, id: "older" });
        await seedTransfer(db, { ...typed, date: new Date(2026, 8, 29, 18), exchangeRate: 1020, id: "same-day" });
        await seedTransfer(db, { ...typed, date: new Date(2026, 8, 30), exchangeRate: 1100, id: "later" });
        await seedTransfer(db, {
            date: new Date(2026, 8, 29, 20),
            exchangeRate: 850,
            exchangeRateType: "official",
            id: "quoted",
            toCurrency: "VES",
        });
        await seedTransfer(db, {
            ...typed,
            date: new Date(2026, 8, 29, 21),
            exchangeRate: 1.1,
            id: "other",
            toCurrency: "EUR",
        });

        const { result } = await renderHook(() => usePriorCustomRate(db, "USD", "VES", ENTRY_DAY));

        expect(result.current).toStrictEqual({ date: new Date(2026, 8, 29, 18), rate: 1020 });
    });

    it("reads a rate typed for the pair in the other direction, turned to this one", async () => {
        const db = migratedDatabase({ foreignKeys: false });
        await seedTransfer(db, {
            date: new Date(2026, 8, 27),
            exchangeRate: 1 / 1020,
            exchangeRateType: "custom",
            fromCurrency: "VES",
            id: "reverse",
            toCurrency: "USD",
        });

        const { result } = await renderHook(() => usePriorCustomRate(db, "USD", "VES", ENTRY_DAY));

        expect(result.current?.date).toStrictEqual(new Date(2026, 8, 27));
        expect(result.current?.rate).toBeCloseTo(1020);
    });
});
