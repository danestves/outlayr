import { describe, expect, it, jest } from "@jest/globals";
import { buildRateTable } from "@outlayr/money/valuation";
import { renderHook } from "@testing-library/react-native";
import BetterSqlite3 from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import { transactions } from "@/db/schema";
import * as schema from "@/db/schema";

import { spendingCalendarQuery, useSpendingCalendar } from "./spending-calendar";
import { useValuation } from "./use-valuation";

jest.mock("./live-query", () => ({
    useLiveQuery: (_table: unknown, build: () => { all: () => unknown[] }) => build().all(),
}));
jest.mock("./use-valuation", () => ({ useValuation: jest.fn() }));

type TestDb = ReturnType<typeof makeDb>;

const at = (year: number, month: number, day: number, hour = 0, minute = 0, second = 0): Date =>
    new Date(year, month - 1, day, hour, minute, second);

const NOW = at(2026, 8, 10, 12);
const EARLIEST = at(2026, 2, 10);

function makeDb() {
    const sqlite = new BetterSqlite3(":memory:");
    sqlite.exec(`
		CREATE TABLE transactions (
			id text PRIMARY KEY NOT NULL,
			accountId text,
			amount real NOT NULL,
			amountUsd real,
			categoryId text,
			currency text,
			customColor text,
			income integer NOT NULL,
			details text,
			date integer NOT NULL,
			day integer NOT NULL,
			emoji text,
			exchangeRate real,
			exchangeRateType text,
			icon text,
			imageColor text,
			imageKey text,
			imageUri text,
			month integer NOT NULL,
			note text NOT NULL DEFAULT '',
			onceRecurring integer NOT NULL DEFAULT 0,
			recurringAnchorDay integer,
			recurringCoefficient integer NOT NULL DEFAULT 1,
			recurringEndDate integer,
			recurringType integer NOT NULL DEFAULT 0,
			reminderLeadDays integer,
			transferId text,
			feeForId text,
			feeRate real,
			paidVia text,
			installmentId text,
			restoredAt integer,
			updatedAt integer NOT NULL,
			deletedAt integer
		);
	`);
    return drizzle(sqlite, { schema });
}

async function insert(
    db: TestDb,
    id: string,
    date: Date,
    overrides: Partial<typeof transactions.$inferInsert> = {}
): Promise<void> {
    await db.insert(transactions).values({
        amount: 1,
        currency: "USD",
        date,
        day: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        id,
        income: false,
        month: new Date(date.getFullYear(), date.getMonth(), 1),
        updatedAt: NOW,
        ...overrides,
    });
}

describe("spendingCalendarQuery", () => {
    it("returns grouped expense cells bounded to exactly 182 local calendar days", async () => {
        const db = makeDb();
        await insert(db, "earliest", EARLIEST, { amount: 10, amountUsd: 10 });
        await insert(db, "same-day", at(2026, 2, 10, 18), { amount: 5, amountUsd: 5 });
        await insert(db, "before", at(2026, 2, 9, 23, 59, 59), { amount: 99, amountUsd: 99 });
        await insert(db, "income", at(2026, 8, 9, 12), {
            amount: 100,
            amountUsd: 100,
            income: true,
        });
        await insert(db, "deleted", at(2026, 8, 9, 12), {
            amount: 200,
            amountUsd: 200,
            deletedAt: NOW,
        });
        await insert(db, "future", at(2026, 8, 10, 12, 0, 1), { amount: 300, amountUsd: 300 });

        const rows = await spendingCalendarQuery(db, NOW);

        expect(rows.every((candidate) => candidate.plotKey === "2026-02-10")).toBe(true);
        expect(rows.every((candidate) => candidate.currency === "USD" && !candidate.income)).toBe(true);
        expect(rows.reduce((total, candidate) => total + Number(candidate.amount), 0)).toBe(15);
        expect(rows.reduce((total, candidate) => total + Number(candidate.amountUsd), 0)).toBe(15);
    });

    it("plots a row on the local day of its instant, not the day the writing device stored", async () => {
        const db = makeDb();
        // A row saved in a zone ahead: `day` is that device's midnight, a square before the instant's.
        await insert(db, "travelled", at(2026, 8, 9, 12), {
            amount: 5,
            amountUsd: 5,
            day: at(2026, 8, 8),
        });

        const rows = await spendingCalendarQuery(db, NOW);

        expect(rows.map((candidate) => candidate.plotKey)).toStrictEqual(["2026-08-09"]);
    });

    it("keeps UTC valuation days, currencies, and missing canonical values in separate groups", async () => {
        const db = makeDb();
        const localDay = at(2026, 8, 9);
        const firstUtcDay = new Date(Date.UTC(2026, 7, 8, 23, 30));
        const secondUtcDay = new Date(Date.UTC(2026, 7, 9, 0, 30));

        await insert(db, "usd-first-day", firstUtcDay, { amount: 10, amountUsd: 10, day: localDay });
        await insert(db, "usd-second-day", secondUtcDay, { amount: 5, amountUsd: 5, day: localDay });
        await insert(db, "eur-second-day", secondUtcDay, {
            amount: 8,
            amountUsd: 10,
            currency: "EUR",
        });
        await insert(db, "usd-offline", secondUtcDay, { amount: 3, amountUsd: null, day: localDay });

        const rows = await spendingCalendarQuery(db, NOW);
        const groups = rows
            .map((candidate) => ({
                amount: Number(candidate.amount),
                amountUsd: candidate.amountUsd === null ? null : Number(candidate.amountUsd),
                currency: candidate.currency,
                dateKey: candidate.dateKey,
            }))
            .sort((left, right) =>
                `${left.dateKey}|${left.currency}|${left.amountUsd}`.localeCompare(
                    `${right.dateKey}|${right.currency}|${right.amountUsd}`
                )
            );

        expect(groups).toStrictEqual([
            { amount: 10, amountUsd: 10, currency: "USD", dateKey: "2026-08-08" },
            { amount: 8, amountUsd: 10, currency: "EUR", dateKey: "2026-08-09" },
            { amount: 5, amountUsd: 5, currency: "USD", dateKey: "2026-08-09" },
            { amount: 3, amountUsd: null, currency: "USD", dateKey: "2026-08-09" },
        ]);
    });
});

describe("useSpendingCalendar", () => {
    it("preserves exact and fallback non-USD groups through the adapter", async () => {
        const db = makeDb();
        const valuationInstant = at(2026, 8, 9, 12);
        await insert(db, "eur-exact", valuationInstant, {
            amount: 8,
            amountUsd: 10,
            currency: "EUR",
        });
        await insert(db, "eur-fallback", valuationInstant, {
            amount: 7,
            amountUsd: null,
            currency: "EUR",
        });
        await insert(db, "ves-pending-custom", valuationInstant, {
            amount: 40,
            amountUsd: null,
            currency: "VES",
            exchangeRate: null,
            exchangeRateType: "custom",
        });
        jest.mocked(useValuation).mockReturnValue({
            displayCurrency: "CAD",
            rates: buildRateTable([{ date: "2026-08-09", quote: "CAD", rate: 3 }]),
        });

        const { result } = await renderHook(() =>
            useSpendingCalendar(db as unknown as Parameters<typeof useSpendingCalendar>[0], NOW.getTime())
        );

        expect(result.current).toStrictEqual([{ date: "2026-08-09", exact: false, value: 37 }]);
    });
});
