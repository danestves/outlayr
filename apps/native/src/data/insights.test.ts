import { beforeAll, describe, expect, it } from "@jest/globals";
import { buildRateTable } from "@outlayr/money/valuation";
import BetterSqlite3 from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import { categories, transactions } from "@/db/schema";
import * as schema from "@/db/schema";

import {
    bucketDateLabel,
    bucketRanges,
    bucketSeries,
    categoryBreakdown,
    elapsedSlots,
    loadContributions,
    monthPeriodStart,
    offsetForDate,
    periodTotal,
    subcategoryBreakdown,
    windowLabel,
    windowShortLabel,
    windowStart,
    windowTotals,
} from "./insights";
import type { CategoryMeta, InsightsContribution } from "./insights";

type TestDb = ReturnType<typeof makeDb>;

const at = (y: number, m: number, d: number, h = 0, min = 0): Date => new Date(y, m - 1, d, h, min, 0, 0);

// Tuesday, Jul 15 2025 at noon. Windows are calendar-anchored, so with the
// default Sunday-first week: week = Jul 13–19; month = Jul 1–31; year = 2025.
const NOW = at(2025, 7, 15, 12, 0);

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

async function seed(db: TestDb): Promise<void> {
    const now = new Date();
    await db.insert(categories).values([
        {
            color: "#EC7A58",
            icon: "Restaurant02",
            id: "food",
            income: false,
            name: "Food",
            sortOrder: 0,
            updatedAt: now,
        },
        {
            color: "#F3BF56",
            icon: "ShoppingBasket03",
            id: "groc",
            income: false,
            name: "Groceries",
            parentId: "food",
            sortOrder: 1,
            updatedAt: now,
        },
        {
            color: "#279AF4",
            emoji: "🏠",
            id: "rent",
            income: false,
            name: "Rent",
            sortOrder: 2,
            updatedAt: now,
        },
        {
            color: "#03CD86",
            icon: "Wallet03",
            id: "sal",
            income: true,
            name: "Salary",
            sortOrder: 0,
            updatedAt: now,
        },
    ]);
    const tx = (
        id: string,
        date: Date,
        amount: number,
        income: boolean,
        categoryId: string,
        deletedAt: Date | null = null
    ) => ({
        amount,
        categoryId,
        date,
        day: date,
        deletedAt,
        id,
        income,
        month: date,
        note: "",
        onceRecurring: false,
        recurringCoefficient: 1,
        recurringType: 0,
        updatedAt: now,
    });
    await db.insert(transactions).values([
        tx("e1", at(2025, 7, 1), 10, false, "food"),
        tx("e2", at(2025, 7, 5), 20, false, "groc"),
        tx("e3", at(2025, 7, 10), 100, false, "rent"),
        tx("e4", at(2025, 7, 12), 5, false, "food"),
        tx("e5", at(2025, 7, 15, 9, 0), 30, false, "rent"),
        tx("e6", at(2025, 3, 3), 50, false, "food"),
        tx("e7", at(2024, 9, 20), 7, false, "rent"),
        tx("b1", at(2025, 6, 1), 8, false, "food"),
        tx("i1", at(2025, 7, 3), 500, true, "sal"),
        tx("i2", at(2025, 7, 15, 10, 0), 40, true, "sal"),
        // Soft-deleted: never counted.
        tx("d1", at(2025, 7, 8), 999, false, "food", now),
        // Future relative to NOW (same day, later time): never counted.
        tx("f2", at(2025, 7, 15, 18, 0), 88, false, "food"),
    ]);
}

let contributions: InsightsContribution[];
let categoriesById: Map<string, CategoryMeta>;

beforeAll(async () => {
    const db = makeDb();
    await seed(db);
    contributions = await loadContributions(db, NOW);
    const rows = await db.select().from(categories);
    categoriesById = new Map(
        rows.map((c) => [
            c.id,
            {
                color: c.color,
                emoji: c.emoji,
                icon: c.icon,
                id: c.id,
                income: c.income,
                name: c.name,
                parentId: c.parentId,
            },
        ])
    );
});

describe("loadContributions", () => {
    it("excludes soft-deleted and future rows", () => {
        const ids = new Set(contributions.map((c) => `${c.amount}:${c.date.getTime()}`));
        // 12 seeded − d1 (deleted) − f2 (future) = 10 contributions.
        expect(contributions).toHaveLength(10);
        expect(!ids.has(`999:${at(2025, 7, 8).getTime()}`)).toBeTruthy();
        expect(!ids.has(`88:${at(2025, 7, 15, 18, 0).getTime()}`)).toBeTruthy();
    });

    it("carries the category's parentId for roll-up", () => {
        const groc = contributions.find((c) => c.categoryId === "groc");
        expect(groc?.parentId).toBe("food");
        const rent = contributions.find((c) => c.categoryId === "rent");
        expect(rent?.parentId).toBeNull();
    });

    it("excludes a pending custom contribution from a foreign-currency insight total", async () => {
        const db = makeDb();
        await seed(db);
        const pendingDate = at(2025, 7, 14, 8);
        await db.insert(transactions).values({
            amount: 40,
            amountUsd: null,
            categoryId: "food",
            currency: "VES",
            date: pendingDate,
            day: pendingDate,
            exchangeRate: null,
            exchangeRateType: "custom",
            id: "pending-custom",
            income: false,
            month: pendingDate,
            updatedAt: NOW,
        });

        const rows = await loadContributions(db, NOW, {
            displayCurrency: "EUR",
            rates: buildRateTable([]),
        });

        expect(rows.find((row) => row.date.getTime() === pendingDate.getTime())?.amount).toBe(0);
        expect(periodTotal(bucketSeries(rows, "month", "spent", NOW))).toBe(165);
    });
});

describe("bucketRanges boundaries", () => {
    it("week is the calendar week containing today", () => {
        const ranges = bucketRanges("week", NOW);
        expect(ranges).toHaveLength(7);
        expect(ranges[0].start).toStrictEqual(at(2025, 7, 13)); // Sunday
        expect(ranges[6].start).toStrictEqual(at(2025, 7, 19));
        expect(ranges[6].end).toStrictEqual(at(2025, 7, 20));
    });

    it("week honours a Monday-first calendar", () => {
        const ranges = bucketRanges("week", NOW, 0, {
            firstDayOfMonth: 1,
            firstWeekday: 2,
        });
        expect(ranges[0].start).toStrictEqual(at(2025, 7, 14));
        expect(ranges[6].start).toStrictEqual(at(2025, 7, 20));
    });

    it("month is every day of the calendar month, future included", () => {
        const ranges = bucketRanges("month", NOW);
        expect(ranges).toHaveLength(31);
        expect(ranges[0].start).toStrictEqual(at(2025, 7, 1));
        expect(ranges[30].start).toStrictEqual(at(2025, 7, 31));
    });

    it("month honours a mid-month anchor", () => {
        const ranges = bucketRanges("month", NOW, 0, {
            firstDayOfMonth: 25,
            firstWeekday: 1,
        });
        // Jul 15 has not reached the 25th, so the period is the one that opened
        // on Jun 25 and runs to Jul 24.
        expect(ranges[0].start).toStrictEqual(at(2025, 6, 25));
        expect(ranges).toHaveLength(30);
        expect(ranges[29].start).toStrictEqual(at(2025, 7, 24));
    });

    it("year is the twelve months of the calendar year", () => {
        const ranges = bucketRanges("year", NOW);
        expect(ranges).toHaveLength(12);
        expect(ranges[0].start).toStrictEqual(at(2025, 1, 1));
        expect(ranges[11].start).toStrictEqual(at(2025, 12, 1));
    });
});

describe("monthPeriodStart", () => {
    it("rolls back when the anchor has not been reached", () => {
        expect(monthPeriodStart(at(2025, 7, 24), 25)).toStrictEqual(at(2025, 6, 25));
        expect(monthPeriodStart(at(2025, 7, 25), 25)).toStrictEqual(at(2025, 7, 25));
    });
});

describe("elapsedSlots", () => {
    it("counts only slots that have started in the current window", () => {
        expect(elapsedSlots("week", NOW)).toBe(3); // Jul 13, 14, 15
        expect(elapsedSlots("month", NOW)).toBe(15);
        expect(elapsedSlots("year", NOW)).toBe(7); // Jan–Jul
    });

    it("counts every slot of a window already past", () => {
        expect(elapsedSlots("week", NOW, -1)).toBe(7);
        expect(elapsedSlots("month", NOW, -1)).toBe(30); // June
        expect(elapsedSlots("year", NOW, -1)).toBe(12);
    });
});

describe("bucketSeries — spent", () => {
    it("buckets the month, excluding income, soft-deleted, and future", () => {
        const buckets = bucketSeries(contributions, "month", "spent", NOW);
        expect(periodTotal(buckets)).toBe(165);
        expect(buckets[0].value).toBe(10); // Jul 1
        expect(buckets[7].value).toBe(0); // Jul 8 was soft-deleted
        expect(buckets[14].value).toBe(30); // Jul 15: e5 only, f2 is future
        expect(buckets[30].value).toBe(0); // Jul 31 is charted but empty
    });
});

describe("bucketSeries — income and net", () => {
    it("income counts only inflows", () => {
        const buckets = bucketSeries(contributions, "month", "income", NOW);
        expect(periodTotal(buckets)).toBe(540);
        expect(buckets[2].value).toBe(500); // Jul 3
        expect(buckets[14].value).toBe(40); // Jul 15
    });

    it("net signs each flow (income − expense)", () => {
        const buckets = bucketSeries(contributions, "month", "net", NOW);
        expect(periodTotal(buckets)).toBe(375); // 540 − 165
        expect(buckets[0].value).toBe(-10); // Jul 1 expense
        expect(buckets[2].value).toBe(500); // Jul 3 income
        expect(buckets[14].value).toBe(10); // Jul 15: +40 − 30
    });
});

describe("categoryBreakdown", () => {
    it("rolls subcategories into their parent and sorts desc", () => {
        const rows = categoryBreakdown(contributions, categoriesById, "month", "spent", NOW);
        expect(rows).toHaveLength(2);
        expect(rows[0].id).toBe("rent");
        expect(rows[0].amount).toBe(130);
        expect(rows[1].id).toBe("food");
        expect(rows[1].amount).toBe(35); // 10 (food) + 20 (groc child) + 5 (food)
        expect(Math.abs(rows[0].fraction - 130 / 165) < 1e-9).toBeTruthy();
        expect(Math.abs(rows[1].fraction - 35 / 165) < 1e-9).toBeTruthy();
    });

    it("carries an emoji identity, not only an icon one", () => {
        const rows = categoryBreakdown(contributions, categoriesById, "month", "spent", NOW);
        const rent = rows.find((row) => row.id === "rent");
        expect(rent?.emoji).toBe("🏠");
        expect(rent?.icon).toBeNull();
        const food = rows.find((row) => row.id === "food");
        expect(food?.emoji).toBeNull();
        expect(food?.icon).toBe("Restaurant02");
    });

    it("income reads only inflow categories", () => {
        const rows = categoryBreakdown(contributions, categoriesById, "month", "income", NOW);
        expect(rows).toHaveLength(1);
        expect(rows[0].id).toBe("sal");
        expect(rows[0].amount).toBe(540);
        expect(rows[0].fraction).toBe(1);
    });

    it("net mirrors the outflow composition", () => {
        const spent = categoryBreakdown(contributions, categoriesById, "month", "spent", NOW);
        const net = categoryBreakdown(contributions, categoriesById, "month", "net", NOW);
        expect(net.map((r) => [r.id, r.amount])).toStrictEqual(spent.map((r) => [r.id, r.amount]));
    });
});

describe("bucketRanges — window offset", () => {
    it("windowStart agrees with the first slot", () => {
        expect(windowStart("month", NOW, -2)).toStrictEqual(at(2025, 5, 1));
        expect(windowStart("week", NOW, -2)).toStrictEqual(at(2025, 6, 29));
        expect(windowStart("year", NOW, -3)).toStrictEqual(at(2022, 1, 1));
    });
});

describe("windowTotals", () => {
    it("tracks the offset window", () => {
        expect(windowTotals(contributions, "month", NOW, -1)).toStrictEqual({
            income: 0,
            spent: 8,
        });
        expect(windowTotals(contributions, "week", NOW, 0)).toStrictEqual({
            income: 40,
            spent: 30,
        });
        expect(windowTotals(contributions, "week", NOW, -1)).toStrictEqual({
            income: 0,
            spent: 105,
        });
    });
});

describe("offsetForDate", () => {
    it("maps a date to the offset window containing it", () => {
        expect(offsetForDate("month", at(2025, 7, 15), NOW)).toBe(0);
        expect(offsetForDate("month", at(2025, 6, 1), NOW)).toBe(-1);
        expect(offsetForDate("month", at(2025, 3, 3), NOW)).toBe(-4);
        expect(offsetForDate("week", at(2025, 7, 15), NOW)).toBe(0);
        expect(offsetForDate("week", at(2025, 7, 13), NOW)).toBe(0);
        expect(offsetForDate("week", at(2025, 7, 8), NOW)).toBe(-1);
        expect(offsetForDate("week", at(2025, 7, 1), NOW)).toBe(-2);
        expect(offsetForDate("year", at(2025, 3, 3), NOW)).toBe(0);
        expect(offsetForDate("year", at(2024, 9, 20), NOW)).toBe(-1);
    });
});

describe("subcategoryBreakdown", () => {
    it("splits a parent into Direct plus children, sorted desc", () => {
        const subs = subcategoryBreakdown(contributions, categoriesById, "food", "month", "spent", NOW);
        expect(subs).toHaveLength(2);
        expect(subs[0].id).toBe("groc");
        expect(subs[0].amount).toBe(20);
        expect(subs[1].name).toBe("Direct"); // e1 (10) + e4 (5)
        expect(subs[1].amount).toBe(15);
        expect(Math.abs(subs[0].fraction - 20 / 35) < 1e-9).toBeTruthy();
    });
});

describe("window labels", () => {
    it("formats the headline window label", () => {
        expect(windowLabel("month", 0, NOW)).toBe("Jul 2025");
        expect(windowLabel("month", -1, NOW)).toBe("Jun 2025");
        expect(windowLabel("year", 0, NOW)).toBe("2025");
        expect(windowLabel("week", 0, NOW)).toBe("13 - 19 Jul");
        expect(windowLabel("week", -2, NOW)).toBe("29 Jun - 5 Jul");
    });

    it("formats the compact swipe and bucket labels", () => {
        expect(windowShortLabel("week", -1, NOW)).toBe("6 Jul");
        expect(windowShortLabel("month", -1, NOW)).toBe("Jun 25");
        expect(windowShortLabel("year", -1, NOW)).toBe("2024");
        expect(bucketDateLabel("month", at(2025, 7, 12))).toBe("12 Jul 2025");
        expect(bucketDateLabel("year", at(2025, 7, 1))).toBe("Jul 2025");
    });
});
