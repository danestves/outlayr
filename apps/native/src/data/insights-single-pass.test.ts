import { beforeAll, describe, expect, it } from "@jest/globals";
import { buildRateTable } from "@outlayr/money/valuation";
import BetterSqlite3 from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "@/db/schema";
import { categories, transactions } from "@/db/schema";
import type { Language } from "@/i18n/languages";

import {
    aggregateInsightsWindows,
    bucketSeries,
    categoryBreakdown,
    DEFAULT_INSIGHTS_CALENDAR,
    loadContributions,
    windowTotals,
    withCategoryDeltas,
    categoryMovers,
} from "./insights";
import type {
    CategoryMeta,
    InsightsCalendar,
    InsightsContribution,
    InsightsMeasure,
    InsightsPeriod,
    InsightsWindowsAggregate,
} from "./insights";

const at = (y: number, m: number, d: number, h = 0, min = 0): Date => new Date(y, m - 1, d, h, min, 0, 0);

// Tuesday, Jul 15 2025 at noon, matching insights.test.ts: week = Jul 13-19, month = Jul, year = 2025.
const NOW = at(2025, 7, 15, 12, 0);
const LANGUAGE: Language = "en";
const CALENDAR: InsightsCalendar = DEFAULT_INSIGHTS_CALENDAR;

const PERIODS: InsightsPeriod[] = ["week", "month", "year"];
const MEASURES: InsightsMeasure[] = ["spent", "income", "net"];
const OFFSETS = [0, -1, -2];

function contribution(
    date: Date,
    amount: number,
    income: boolean,
    categoryId: string | null,
    parentId: string | null = null
): InsightsContribution {
    return { amount, categoryId, date, income, parentId };
}

const afterMs = (date: Date, ms: number): Date => new Date(date.getTime() + ms);

/**
 * The hook's pipeline before the single pass, verbatim (`useInsights` lines 148-161 as of the base commit).
 * Comparison oracle only. Removable: once `aggregateInsightsWindows` has soaked in production, delete this
 * with the `expectParity` driver and its fixtures.
 */
function formerPipeline(
    rows: readonly InsightsContribution[],
    categoriesById: ReadonlyMap<string, CategoryMeta>,
    period: InsightsPeriod,
    measure: InsightsMeasure,
    now: Date,
    offset: number,
    calendar: InsightsCalendar = CALENDAR,
    language: Language = LANGUAGE
): InsightsWindowsAggregate {
    const buckets = bucketSeries(rows, period, measure, now, offset, calendar, language);
    const { income, spent } = windowTotals(rows, period, now, offset, calendar);
    const prior = windowTotals(rows, period, now, offset - 1, calendar);
    const composition = categoryBreakdown(rows, categoriesById, period, measure, now, offset, calendar);
    const priorComposition = categoryBreakdown(rows, categoriesById, period, measure, now, offset - 1, calendar);
    return {
        buckets,
        categories: composition,
        income,
        priorCategories: priorComposition,
        priorIncome: prior.income,
        priorSpent: prior.spent,
        spent,
    };
}

/** Bytes-equal check of every aggregate field plus the hook's downstream derivations of them. */
function expectParity(rows: readonly InsightsContribution[], categoriesById: ReadonlyMap<string, CategoryMeta>): void {
    for (const period of PERIODS) {
        for (const measure of MEASURES) {
            for (const offset of OFFSETS) {
                const fresh = aggregateInsightsWindows(
                    rows,
                    categoriesById,
                    period,
                    measure,
                    NOW,
                    offset,
                    CALENDAR,
                    LANGUAGE
                );
                const former = formerPipeline(rows, categoriesById, period, measure, NOW, offset, CALENDAR, LANGUAGE);
                // Whole-shape match: dates, -0 vs 0, NaN and prototype are all strict-equal checked.
                expect(fresh).toStrictEqual(former);
                expect(withCategoryDeltas(fresh.categories, fresh.priorCategories)).toStrictEqual(
                    withCategoryDeltas(former.categories, former.priorCategories)
                );
                expect(categoryMovers(fresh.categories, fresh.priorCategories, compositionTotal(fresh))).toStrictEqual(
                    categoryMovers(former.categories, former.priorCategories, compositionTotal(former))
                );
            }
        }
    }
}

// Mirrors the hook: a plain walk over the breakdown in array order.
function compositionTotal(aggregate: InsightsWindowsAggregate): number {
    let total = 0;
    for (const item of aggregate.categories) {
        total += item.amount;
    }
    return total;
}

function metasById(...metas: CategoryMeta[]): Map<string, CategoryMeta> {
    return new Map(metas.map((meta) => [meta.id, meta]));
}

// Deliberately not date-sorted: parity must not depend on any assumed ordering.
const syntheticRows: InsightsContribution[] = [
    // Prior-month rows, one at its exact closing instant.
    contribution(at(2025, 6, 30, 23, 59), 10.1, false, "food"),
    contribution(at(2025, 6, 30, 23), 0.2, false, "groc", "food"),
    contribution(at(2025, 6, 20), 900, true, "sal"),
    contribution(at(2025, 6, 12), 250.25, false, "food"),
    contribution(at(2025, 6, 1), 1.25, false, null),
    // Midnight seam: the current window's first and last buckets, an edge tick apart.
    contribution(at(2025, 7, 1), 0.1, false, "food"),
    contribution(afterMs(at(2025, 7, 1), 1), 0.3, false, "food"),
    contribution(afterMs(at(2025, 7, 1), 2), 0.1, false, "food"),
    contribution(at(2025, 7, 8), 0.1, false, "rent"),
    // Week window: the day before it opens and its exact first bucket.
    contribution(at(2025, 7, 12), 0.1, true, "sal"),
    contribution(at(2025, 7, 13), 0.1, false, "food"),
    contribution(at(2025, 7, 19, 6), 5.5, false, "rent"),
    // Ties probe stable-sort parity; "vanished" id has no meta and falls back.
    contribution(at(2025, 7, 14), 5.5, false, "food"),
    contribution(at(2025, 7, 7), 5.5, false, "groc", "food"),
    contribution(at(2025, 7, 5), 5.5, false, "vanished"),
    // Zero and negative zero: totals still add them, buckets still skip them.
    contribution(at(2025, 7, 6), 0, false, "rent"),
    contribution(at(2025, 7, 6), -0, false, "rent"),
    // Uncategorized rows: counted in totals, absent from every breakdown.
    contribution(at(2025, 7, 11), 40.5, false, null),
    contribution(at(2025, 7, 2), 2, true, null),
    // Current window's last instant, then one tick into "future" binding all passes skip.
    contribution(afterMs(NOW, -1), 1.75, false, "food"),
    contribution(afterMs(NOW, 0), 1.1, true, "sal"),
    contribution(afterMs(NOW, 1), 88, false, "food"),
    // Year mode: previous year window and its exact closing/beginning instants.
    contribution(at(2024, 12, 31, 23, 59), 0.05, false, "food"),
    contribution(afterMs(at(2025, 1, 1), 0), 3.5, true, "sal"),
    contribution(at(2024, 3, 3), 7, false, "rent"),
    contribution(afterMs(at(2024, 12, 31, 23, 59), 999), 0.5, false, "food"),
];

const meta = (
    id: string,
    emoji: string | null,
    income: boolean,
    name: string,
    parentId: string | null = null
): CategoryMeta => ({
    color: null,
    emoji,
    icon: null,
    id,
    income,
    name,
    parentId,
});

const syntheticCategories = metasById(
    meta("food", null, false, "Food"),
    meta("groc", "🛒", false, "Groceries", "food"),
    meta("rent", "🏠", false, "Rent"),
    meta("sal", null, true, "Salary")
);

function makeDb() {
    const sqlite = new BetterSqlite3(":memory:");
    sqlite.exec(`
		CREATE TABLE categories (
			id text PRIMARY KEY NOT NULL,
			name text,
			color text DEFAULT '#FFFFFF',
			icon text,
			emoji text,
			income integer NOT NULL DEFAULT 0,
			sortOrder integer NOT NULL DEFAULT 0,
			dateCreated integer,
			parentId text,
			updatedAt integer NOT NULL,
			deletedAt integer
		);
		CREATE TABLE transactions (
			id text PRIMARY KEY NOT NULL,
			amount real NOT NULL,
			income integer NOT NULL,
			currency text,
			note text NOT NULL DEFAULT '',
			details text,
			date integer NOT NULL,
			day integer NOT NULL,
			month integer NOT NULL,
			icon text,
			emoji text,
			customColor text,
			imageColor text,
			imageUri text,
			imageKey text,
			onceRecurring integer NOT NULL DEFAULT 0,
			recurringType integer NOT NULL DEFAULT 0,
			recurringCoefficient integer NOT NULL DEFAULT 1,
			recurringEndDate integer,
			recurringAnchorDay integer,
			reminderLeadDays integer,
			categoryId text,
			accountId text,
			amountUsd real,
			exchangeRate real,
			exchangeRateType text,
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

/**
 * Row mix the hook sees: multi-currency with frozen USD, a transfer pair, a pending custom (unvalued) row, a
 * soft-deleted row and rows across two years, valued through {@link loadContributions} the way the hook values
 * its live query.
 */
async function dbRows(): Promise<InsightsContribution[]> {
    const db = makeDb();
    const stamp = NOW;
    await db.insert(categories).values([
        { color: "#EC7A58", icon: "Restaurant02", id: "food", income: false, name: "Food", updatedAt: stamp },
        {
            color: "#F3BF56",
            icon: "ShoppingBasket03",
            id: "groc",
            income: false,
            name: "Groceries",
            parentId: "food",
            updatedAt: stamp,
        },
        { color: "#279AF4", emoji: "🏠", id: "rent", income: false, name: "Rent", updatedAt: stamp },
        { color: "#03CD86", icon: "Wallet03", id: "sal", income: true, name: "Salary", updatedAt: stamp },
    ]);
    const tx = (
        id: string,
        date: Date,
        amount: number,
        income: boolean,
        categoryId: string | null,
        extra: Partial<{
            amountUsd: number | null;
            currency: string | null;
            deletedAt: Date;
            exchangeRate: number | null;
            exchangeRateType: string;
            transferId: string;
        }> = {}
    ) => ({
        amount,
        categoryId,
        date,
        day: date,
        deletedAt: null,
        id,
        income,
        month: date,
        updatedAt: stamp,
        ...extra,
    });
    await db.insert(transactions).values([
        // Ledger currency passes through unconverted.
        tx("eur1", at(2025, 7, 2), 100.5, false, "food", { amountUsd: 33.5, currency: "EUR" }),
        // Same currency, UTC day and direction: one cell, valued as running differences of the frozen USD.
        tx("ves1", at(2025, 7, 5, 10), 360, false, "rent", { amountUsd: 10, currency: "VES" }),
        tx("ves2", at(2025, 7, 5, 14), 72, false, "food", { amountUsd: 2, currency: "VES" }),
        // Frozen USD on the display currency's ledger: converted, never through a passthrough.
        tx("usd1", at(2025, 7, 15, 9), 1.05, false, "rent", { amountUsd: 1.05, currency: "USD" }),
        // A transfer pair: both legs count as plain rows here.
        tx("t-out", at(2025, 7, 15, 8), 50, false, "food", { amountUsd: 50, currency: "EUR", transferId: "t1" }),
        tx("t-in", at(2025, 7, 15, 8), 50, true, "rent", { amountUsd: 50, currency: "EUR", transferId: "t1" }),
        // Pending custom rate: valued to 0 everywhere.
        tx("pending", at(2025, 7, 14, 8), 40, false, "food", {
            amountUsd: null,
            currency: "VES",
            exchangeRate: null,
            exchangeRateType: "custom",
        }),
        // Day-boundary row: 23:00 local, so its UTC day key is the next day for most zones.
        tx("edge", at(2025, 6, 30, 23), 12, false, "food", { amountUsd: 4, currency: "EUR" }),
        // Same instant in a foreign currency: its EUR rate is looked up on the row's UTC day, which the rate
        // table answers identically on both sides of the boundary.
        tx("edge-ves", at(2025, 6, 30, 23), 24, false, "food", { amountUsd: 3, currency: "VES" }),
        // No rate at all for the 2024 row: falls back to face value.
        tx("old-ves", at(2024, 12, 20), 200, false, "food", { amountUsd: 5, currency: "VES" }),
        tx("old-eur", at(2024, 9, 8), 63, false, "rent", { amountUsd: 21, currency: "EUR" }),
        tx("old-inc", at(2024, 11, 1), 500, true, "sal", { amountUsd: 500, currency: "EUR" }),
        tx("new-inc", at(2025, 7, 13), 80, true, "sal", { amountUsd: 40, currency: "EUR" }),
        // Soft-deleted: never reaches the rows the pipelines see.
        tx("gone", at(2025, 7, 8), 999, false, "food", { amountUsd: 333, currency: "EUR", deletedAt: stamp }),
    ]);
    const rates = buildRateTable([
        { date: "2025-06-30", quote: "EUR", rate: 3 },
        { date: "2025-07-10", quote: "EUR", rate: 2 },
        { date: "2025-07-01", quote: "VES", rate: 40 },
        { date: "2025-07-14", quote: "VES", rate: 36 },
    ]);
    const contributions = await loadContributions(db, NOW, { displayCurrency: "EUR", rates });
    expect(contributions.some((row) => row.date.getTime() === at(2025, 7, 8).getTime())).toBeFalsy();
    // One anchor: the three valued expenses (rent, non-transfer) must be the EUR cells 30 + 2.1 + 63.
    const rentExpenses = contributions.filter((row) => row.categoryId === "rent" && !row.income);
    expect(rentExpenses.map((row) => row.amount).sort((a, b) => a - b)).toStrictEqual([2.1, 30, 63]);
    return contributions;
}

const dbCategories = metasById(
    meta("food", null, false, "Food"),
    meta("groc", null, false, "Groceries", "food"),
    meta("rent", "🏠", false, "Rent"),
    meta("sal", null, true, "Salary")
);

let seededDbRows: InsightsContribution[] = [];

beforeAll(async () => {
    seededDbRows = await dbRows();
});

describe("aggregateInsightsWindows — parity with the former pipeline", () => {
    it("matches on rows spanning two years of categories, categories absent from the map and edge ticks", () => {
        expectParity(syntheticRows, syntheticCategories);
    });

    it("matches on valued multi-currency contributions with transfers and a deleted row", () => {
        expectParity(seededDbRows, dbCategories);
    });
});
