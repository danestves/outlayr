import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import BetterSqlite3 from "better-sqlite3";

import type { Database } from "@/db/client";
import { categories, exchangeRates, transactions } from "@/db/schema";
import { testDatabase } from "@/db/test-database";
import { parseCsv } from "@/domain/csv";
import { resolveImportMapping } from "@/domain/import-mapping";
import { CSV_HEADER, parseCsvDate } from "@/domain/transaction-csv";

import { candidateLogoIds } from "./logo-backfill-state";
import { transactionsRepo } from "./transactions-core";
import {
    applyImport,
    buildImportPlan,
    exportFileName,
    exportTransactionsCsv,
    guessMapping,
    parseImportFile,
    splitHeaderAndRows,
    uniqueCategoryValues,
} from "./transfer-core";

/** `withRealTransactions` adds a BEGIN/COMMIT/ROLLBACK `withTransactionAsync`; without it tasks run bare. */
function makeDb(options?: { withRealTransactions?: boolean }): Database {
    const sqlite = new BetterSqlite3(":memory:");
    if (options?.withRealTransactions) {
        const client = sqlite as BetterSqlite3.Database & {
            withTransactionAsync?: (task: () => Promise<void>) => Promise<void>;
        };
        client.withTransactionAsync = async (task) => {
            sqlite.exec("BEGIN");
            try {
                await task();
                sqlite.exec("COMMIT");
            } catch (error) {
                sqlite.exec("ROLLBACK");
                throw error;
            }
        };
    }
    sqlite.exec(`
		CREATE TABLE appMeta (key text PRIMARY KEY NOT NULL, value text);
		CREATE TABLE exchangeRates (
			quote text NOT NULL, rateType text NOT NULL, date text NOT NULL,
			rate real NOT NULL, source text NOT NULL, fetchedAt integer NOT NULL,
			PRIMARY KEY (quote, rateType, date)
		);
		CREATE TABLE categories (
			id text PRIMARY KEY NOT NULL, name text, color text DEFAULT '#FFFFFF',
			icon text, emoji text, income integer NOT NULL DEFAULT 0,
			sortOrder integer NOT NULL DEFAULT 0, dateCreated integer, parentId text,
			updatedAt integer NOT NULL, deletedAt integer
		);
		CREATE TABLE transactions (
			id text PRIMARY KEY NOT NULL, amount real NOT NULL, income integer NOT NULL,
			currency text, note text NOT NULL DEFAULT '', details text,
			date integer NOT NULL, day integer NOT NULL, month integer NOT NULL,
			icon text, emoji text, customColor text, imageColor text, imageUri text, imageKey text,
			onceRecurring integer NOT NULL DEFAULT 0, recurringType integer NOT NULL DEFAULT 0,
			recurringCoefficient integer NOT NULL DEFAULT 1, recurringEndDate integer,
			recurringAnchorDay integer, reminderLeadDays integer,
			categoryId text, accountId text, amountUsd real, exchangeRate real, exchangeRateType text,
			transferId text,
			feeForId text,
			feeRate real,
			paidVia text,
			installmentId text,
			restoredAt integer,
			updatedAt integer NOT NULL, deletedAt integer
		);
	`);
    return testDatabase(sqlite);
}

const NOW = new Date(2026, 6, 29, 12);

async function seed(db: Database) {
    await db.insert(categories).values([
        {
            id: "cat-food",
            income: false,
            name: "Groceries",
            sortOrder: 0,
            updatedAt: NOW,
        },
        {
            id: "cat-pay",
            income: true,
            name: "Paycheck",
            sortOrder: 1,
            updatedAt: NOW,
        },
        {
            deletedAt: NOW,
            id: "cat-gone",
            income: false,
            name: "Retired",
            sortOrder: 2,
            updatedAt: NOW,
        },
    ]);
}

async function seedTransactions(db: Database) {
    await db.insert(transactions).values([
        {
            amount: 12.5,
            categoryId: "cat-food",
            currency: "EUR",
            date: new Date(2026, 6, 28, 9, 30),
            day: new Date(2026, 6, 28),
            id: "t-1",
            income: false,
            month: new Date(2026, 6, 1),
            note: "Bakery, twice",
            updatedAt: NOW,
        },
        {
            amount: 2400,
            categoryId: "cat-pay",
            currency: null,
            date: new Date(2026, 6, 27, 8, 0),
            day: new Date(2026, 6, 27),
            id: "t-2",
            income: true,
            month: new Date(2026, 6, 1),
            note: "Salary",
            updatedAt: NOW,
        },
        {
            amount: 99,
            categoryId: "cat-food",
            currency: "USD",
            date: new Date(2026, 6, 26, 8, 0),
            day: new Date(2026, 6, 26),
            deletedAt: NOW,
            id: "t-dead",
            income: false,
            month: new Date(2026, 6, 1),
            note: "Deleted",
            updatedAt: NOW,
        },
    ]);
}

describe("exportTransactionsCsv", () => {
    let db: Database;
    beforeEach(async () => {
        db = makeDb();
        await seed(db);
        await seedTransactions(db);
    });

    it("writes one row per live transaction under the header", async () => {
        const rows = parseCsv(await exportTransactionsCsv(db));
        expect(rows).toHaveLength(3);
    });

    it("orders newest first", async () => {
        const rows = parseCsv(await exportTransactionsCsv(db));
        const first = parseCsvDate(rows[1]?.[0] ?? "", "ISO");
        const second = parseCsvDate(rows[2]?.[0] ?? "", "ISO");
        expect(first && second && first > second).toBeTruthy();
    });

    it("substitutes the ledger currency for a row that stated none", async () => {
        const rows = parseCsv(await exportTransactionsCsv(db));
        expect(rows[2]?.[3]).toBe("USD");
    });
});

describe("exportFileName", () => {
    it("stamps the local day", () => {
        expect(exportFileName(new Date(2026, 6, 5, 23))).toBe("outlayr-2026-07-05.csv");
    });
});

describe("uniqueCategoryValues", () => {
    it("trims and folds case so one category is not asked for twice", () => {
        const rows = [["Food"], ["food "], ["FOOD"]];
        expect(uniqueCategoryValues(rows, 0)).toStrictEqual(["Food"]);
    });

    it("skips rows with no cell at that index", () => {
        const rows = [["Food"], [], ["Rent"]];
        expect(uniqueCategoryValues(rows, 0)).toStrictEqual(["Food", "Rent"]);
    });

    it("skips blank values", () => {
        const rows = [["Food"], ["  "], ["Rent"]];
        expect(uniqueCategoryValues(rows, 0)).toStrictEqual(["Food", "Rent"]);
    });
});

const MAPPING = {
    amount: 3,
    category: 0,
    currency: null,
    date: 2,
    exchangeRate: null,
    exchangeRateType: null,
    note: 1,
    type: null,
};

describe("parseImportFile", () => {
    it("reports the widest row so a ragged file still maps", () => {
        expect(parseImportFile("a,b,c\n1,2,3,4")?.width).toBe(4);
    });

    it("rejects a file with too few columns to build a row", () => {
        expect(parseImportFile("2026-07-28,12.50")).toBeNull();
    });

    it("rejects an empty file", () => {
        expect(parseImportFile("")).toBeNull();
    });

    it("rejects a file that is nothing but a header", () => {
        expect(parseImportFile("Date,Note,Amount\n")).toBeNull();
    });
});

describe("splitHeaderAndRows", () => {
    it("splits off a digit-free first line as the header", () => {
        expect(
            splitHeaderAndRows([
                ["Date", "Note", "Amount"],
                ["2026-07-28", "Bakery", "12.50"],
            ])
        ).toStrictEqual({
            header: ["Date", "Note", "Amount"],
            rows: [["2026-07-28", "Bakery", "12.50"]],
        });
    });

    it("keeps a first line that already carries data", () => {
        expect(splitHeaderAndRows([["2026-07-28", "Bakery", "12.50"]])).toStrictEqual({
            header: null,
            rows: [["2026-07-28", "Bakery", "12.50"]],
        });
    });
});

describe("guessMapping", () => {
    it("maps a file this app exported without asking", () => {
        expect(guessMapping([...CSV_HEADER])).toStrictEqual({
            amount: 2,
            category: 4,
            currency: 3,
            date: 0,
            exchangeRate: 7,
            exchangeRateType: 6,
            note: 1,
            type: 5,
        });
    });

    it("ignores case and padding", () => {
        expect(guessMapping([" DATE "]).date).toBe(0);
    });

    it("leaves a field it cannot place unassigned", () => {
        expect(guessMapping(["col1", "col2"]).amount).toBeNull();
    });
});

describe("buildImportPlan", () => {
    const rows = [
        ["Food", "Bakery", "2026-07-28", "12.50"],
        ["Pay", "Salary", "2026-07-27", "2400"],
    ];
    const links = new Map([
        ["food", "cat-food"],
        ["pay", "cat-pay"],
    ]);
    const income = new Map([
        ["cat-food", false],
        ["cat-pay", true],
    ]);

    it("takes direction from the matched category", () => {
        const plan = buildImportPlan(rows, MAPPING, "yyyy-MM-dd", ".", links, income);
        expect(plan.entries[0]?.income).toBe(false);
        expect(plan.entries[1]?.income).toBe(true);
    });

    it("prefers an explicit type column over the category's direction", () => {
        const typed = rows.map((row) => [...row, "Income"]);
        const plan = buildImportPlan(typed, { ...MAPPING, type: 4 }, "yyyy-MM-dd", ".", links, income);
        expect(plan.entries[0]?.income).toBe(true);
    });

    it("stores the magnitude, never a signed amount", () => {
        const negative = [["Food", "Refund", "2026-07-28", "-12.50"]];
        const plan = buildImportPlan(negative, MAPPING, "yyyy-MM-dd", ".", links, income);
        expect(plan.entries[0]?.amount).toBe(12.5);
    });

    it("reads a mapped currency column", () => {
        const withCurrency = rows.map((row) => [...row, "eur"]);
        const plan = buildImportPlan(withCurrency, { ...MAPPING, currency: 4 }, "yyyy-MM-dd", ".", links, income);
        expect(plan.entries[0]?.currency).toBe("EUR");
    });

    it("leaves currency null when no column is mapped, so the ledger's code applies", () => {
        const plan = buildImportPlan(rows, MAPPING, "yyyy-MM-dd", ".", links, income);
        expect(plan.entries[0]?.currency).toBeNull();
    });

    it("buildImportPlan preserves a valid custom rate", () => {
        const plan = buildImportPlan(
            [["Food", "Bakery", "2026-07-28", "100", "custom", "55,5"]],
            { ...MAPPING, exchangeRate: 5, exchangeRateType: 4 },
            "yyyy-MM-dd",
            ",",
            links,
            income
        );
        expect(plan.entries[0]).toMatchObject({ exchangeRate: 55.5, exchangeRateType: "custom" });
    });

    it("buildImportPlan preserves pending custom metadata", () => {
        const plan = buildImportPlan(
            [["Food", "Bakery", "2026-07-28", "100", "custom", ""]],
            { ...MAPPING, exchangeRate: 5, exchangeRateType: 4 },
            "yyyy-MM-dd",
            ".",
            links,
            income
        );
        expect(plan.entries[0]).toMatchObject({ exchangeRate: null, exchangeRateType: "custom" });
    });

    it("buildImportPlan defaults a legacy six-column row to official behavior", () => {
        const plan = buildImportPlan(rows, MAPPING, "yyyy-MM-dd", ".", links, income);
        expect(plan.entries[0]).toMatchObject({ exchangeRate: null, exchangeRateType: null });
    });

    it("buildImportPlan skips malformed explicit rate metadata instead of silently changing valuation", () => {
        const malformed = [
            ["Food", "Missing type", "2026-07-28", "100", "", "55.5"],
            ["Food", "Unknown type", "2026-07-28", "100", "market", "55.5"],
            ["Food", "Zero rate", "2026-07-28", "100", "custom", "0"],
        ];
        const plan = buildImportPlan(
            malformed,
            { ...MAPPING, exchangeRate: 5, exchangeRateType: 4 },
            "yyyy-MM-dd",
            ".",
            links,
            income
        );
        expect(plan.entries).toHaveLength(0);
        expect(plan.skipped).toStrictEqual([
            { reason: "rate", row: 1 },
            { reason: "rate", row: 2 },
            { reason: "rate", row: 3 },
        ]);
    });

    it.each([
        ["USD with a supplied official rate", ["Food", "USD official", "2026-07-28", "100", "USD", "official", "1"]],
        [
            "a non-VES EUR-reference rate",
            ["Food", "Invalid EUR reference", "2026-07-28", "100", "EUR", "eur_reference", "50"],
        ],
    ])("skips %s as inconsistent rate metadata", (_case, row) => {
        const plan = buildImportPlan(
            [row],
            { ...MAPPING, currency: 4, exchangeRate: 6, exchangeRateType: 5 },
            "yyyy-MM-dd",
            ".",
            links,
            income
        );
        expect(plan.entries).toHaveLength(0);
        expect(plan.skipped).toStrictEqual([{ reason: "rate", row: 1 }]);
    });

    it("rejects a currency cell that is not a three-letter code", () => {
        const bad = [["Food", "Bakery", "2026-07-28", "12.50", "dollars"]];
        const plan = buildImportPlan(bad, { ...MAPPING, currency: 4 }, "yyyy-MM-dd", ".", links, income);
        expect(plan.entries[0]?.currency).toBeNull();
    });

    it("skips a row whose date does not parse and names the reason", () => {
        const bad = [...rows, ["Food", "Mystery", "last tuesday", "5"]];
        const plan = buildImportPlan(bad, MAPPING, "yyyy-MM-dd", ".", links, income);
        expect(plan.entries).toHaveLength(2);
        expect(plan.skipped).toStrictEqual([{ reason: "date", row: 3 }]);
    });

    it("skips a row whose amount does not parse", () => {
        const bad = [["Food", "Mystery", "2026-07-28", "n/a"]];
        const plan = buildImportPlan(bad, MAPPING, "yyyy-MM-dd", ".", links, income);
        expect(plan.skipped).toStrictEqual([{ reason: "amount", row: 1 }]);
    });

    it("skips a row whose category value was never linked", () => {
        const bad = [["Travel", "Flight", "2026-07-28", "300"]];
        const plan = buildImportPlan(bad, MAPPING, "yyyy-MM-dd", ".", links, income);
        expect(plan.skipped).toStrictEqual([{ reason: "category", row: 1 }]);
    });

    it("skips a ragged row missing the mapped column entirely", () => {
        const bad = [["Food", "Bakery"]];
        const plan = buildImportPlan(bad, MAPPING, "yyyy-MM-dd", ".", links, income);
        expect(plan.entries).toHaveLength(0);
        expect(plan.skipped).toHaveLength(1);
    });

    it("reports the date span of what it will write", () => {
        const plan = buildImportPlan(rows, MAPPING, "yyyy-MM-dd", ".", links, income);
        expect(plan.earliest).toStrictEqual(new Date(2026, 6, 27));
        expect(plan.latest).toStrictEqual(new Date(2026, 6, 28));
    });

    it("reports no span when nothing is importable", () => {
        const plan = buildImportPlan([], MAPPING, "yyyy-MM-dd", ".", links, income);
        expect(plan.earliest).toBeNull();
        expect(plan.latest).toBeNull();
    });
});

describe("applyImport", () => {
    let db: Database;
    beforeEach(async () => {
        db = makeDb();
        await seed(db);
    });

    const rows = [
        ["Food", "Bakery", "2026-07-28", "12.50"],
        ["Pay", "Salary", "2026-07-27", "2400"],
    ];
    const links = new Map([
        ["food", "cat-food"],
        ["pay", "cat-pay"],
    ]);
    const income = new Map([
        ["cat-food", false],
        ["cat-pay", true],
    ]);

    it("writes every planned entry", async () => {
        const plan = buildImportPlan(rows, MAPPING, "yyyy-MM-dd", ".", links, income);
        const written = await applyImport(db, plan);
        expect(written).toBe(2);
        await expect(db.select().from(transactions)).resolves.toHaveLength(2);
    });

    it("never hands an imported row to the background logo lookup", async () => {
        const plan = buildImportPlan(rows, MAPPING, "yyyy-MM-dd", ".", links, income);
        await applyImport(db, plan);
        await expect(candidateLogoIds(db)).resolves.toStrictEqual(new Map());
    });

    it("buckets each row into its own day and month", async () => {
        const plan = buildImportPlan(rows, MAPPING, "yyyy-MM-dd", ".", links, income);
        await applyImport(db, plan);
        const rowsOut = await db.select().from(transactions);
        const first = rowsOut.find((row) => row.note === "Bakery");
        expect(first?.day).toStrictEqual(new Date(2026, 6, 28));
        expect(first?.month).toStrictEqual(new Date(2026, 6, 1));
    });

    it("rolls back every entry when the write fails partway through", async () => {
        const transactionalDb = makeDb({ withRealTransactions: true });
        await seed(transactionalDb);
        const plan = buildImportPlan(rows, MAPPING, "yyyy-MM-dd", ".", links, income);
        const originalCreate = transactionsRepo.create;
        let calls = 0;
        const spy = jest.spyOn(transactionsRepo, "create").mockImplementation(async (targetDb, input) => {
            calls += 1;
            if (calls === 2) {
                throw new Error("disk full");
            }
            return originalCreate(targetDb, input);
        });

        await expect(applyImport(transactionalDb, plan)).rejects.toThrow("disk full");
        await expect(transactionalDb.select().from(transactions)).resolves.toHaveLength(0);

        spy.mockRestore();
    });

    it("names a blank-note row after its category", async () => {
        const blank = [["Food", "  ", "2026-07-28", "12.50"]];
        const plan = buildImportPlan(blank, MAPPING, "yyyy-MM-dd", ".", links, income);
        await applyImport(db, plan);
        const rowsOut = await db.select().from(transactions);
        expect(rowsOut[0]?.note).toBe("Groceries");
    });

    it("stamps the ledger currency on rows that named none", async () => {
        const plan = buildImportPlan(rows, MAPPING, "yyyy-MM-dd", ".", links, income);
        await applyImport(db, plan);
        const rowsOut = await db.select().from(transactions);
        expect(rowsOut.every((row) => row.currency === "USD")).toBeTruthy();
    });

    it("resolves a supplied EUR (BCV) rate per dollar with no EUR rate on hand", async () => {
        const plan = buildImportPlan(
            [["Food", "EUR-reference offline", "2026-07-28", "100", "VES", "eur_reference", "50"]],
            { ...MAPPING, currency: 4, exchangeRate: 6, exchangeRateType: 5 },
            "yyyy-MM-dd",
            ".",
            links,
            income
        );
        await applyImport(db, plan);

        expect((await db.select().from(transactions))[0]).toMatchObject({
            amountUsd: 2,
            exchangeRate: 50,
            exchangeRateType: "eur_reference",
        });
    });

    it("round-trips an export back to the same figures", async () => {
        await seedTransactions(db);
        const csv = await exportTransactionsCsv(db);
        const parsed = parseCsv(csv).slice(1);
        const plan = buildImportPlan(
            parsed,
            {
                amount: 2,
                category: 4,
                currency: 3,
                date: 0,
                exchangeRate: 7,
                exchangeRateType: 6,
                note: 1,
                type: 5,
            },
            "ISO",
            ".",
            new Map([
                ["groceries", "cat-food"],
                ["paycheck", "cat-pay"],
            ]),
            income
        );
        expect(plan.skipped).toHaveLength(0);
        expect(plan.entries).toHaveLength(2);

        const bakery = plan.entries.find((entry) => entry.note === "Bakery, twice");
        expect(bakery?.amount).toBe(12.5);
        expect(bakery?.currency).toBe("EUR");
        expect(bakery?.income).toBe(false);
        expect(bakery?.date.getTime()).toBe(new Date(2026, 6, 28, 9, 30).getTime());

        const salary = plan.entries.find((entry) => entry.note === "Salary");
        expect(salary?.amount).toBe(2400);
        expect(salary?.income).toBe(true);
    });

    it("round-trips resolved custom, official, and EUR-reference metadata through export, plan, and apply", async () => {
        const source = makeDb();
        await seed(source);
        await source.insert(transactions).values([
            {
                amount: 111,
                amountUsd: 2,
                categoryId: "cat-food",
                currency: "EUR",
                date: new Date(2026, 6, 28, 9),
                day: new Date(2026, 6, 28),
                exchangeRate: 55.5,
                exchangeRateType: "custom",
                id: "custom-source",
                income: false,
                month: new Date(2026, 6, 1),
                note: "Custom source",
                updatedAt: NOW,
            },
            {
                amount: 84,
                amountUsd: 2,
                categoryId: "cat-food",
                currency: "VES",
                date: new Date(2026, 6, 28, 10),
                day: new Date(2026, 6, 28),
                exchangeRate: 42,
                exchangeRateType: "official",
                id: "official-source",
                income: false,
                month: new Date(2026, 6, 1),
                note: "Official source",
                updatedAt: NOW,
            },
            {
                amount: 100,
                amountUsd: 2,
                categoryId: "cat-food",
                currency: "VES",
                date: new Date(2026, 6, 28, 11),
                day: new Date(2026, 6, 28),
                exchangeRate: 50,
                exchangeRateType: "eur_reference",
                id: "eur-reference-source",
                income: false,
                month: new Date(2026, 6, 1),
                note: "EUR reference source",
                updatedAt: NOW,
            },
        ]);
        await db.insert(exchangeRates).values({
            date: "2026-07-28",
            fetchedAt: 1,
            quote: "EUR",
            rate: 0.8,
            rateType: "official",
            source: "provider",
        });

        const parsed = parseCsv(await exportTransactionsCsv(source));
        const mapping = resolveImportMapping(guessMapping(parsed[0] ?? []));
        expect(mapping.ok).toBe(true);
        if (!mapping.ok) {
            throw new Error("Expected the exported header to resolve to an import mapping");
        }
        const plan = buildImportPlan(
            parsed.slice(1),
            mapping.value.mapping,
            "ISO",
            ".",
            new Map([["groceries", "cat-food"]]),
            income
        );
        await applyImport(db, plan);

        const imported = await db.select().from(transactions);
        expect(imported.find((row) => row.note === "Custom source")).toMatchObject({
            amountUsd: 2,
            exchangeRate: 55.5,
            exchangeRateType: "custom",
        });
        expect(imported.find((row) => row.note === "Official source")).toMatchObject({
            amountUsd: 2,
            exchangeRate: 42,
            exchangeRateType: "official",
        });
        expect(imported.find((row) => row.note === "EUR reference source")).toMatchObject({
            amountUsd: 2,
            exchangeRate: 50,
            exchangeRateType: "eur_reference",
        });
    });
});
