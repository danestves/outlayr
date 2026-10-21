import { describe, expect, it } from "@jest/globals";
import { accountBalance } from "@outlayr/money/account-balance";
import { buildRateTable } from "@outlayr/money/valuation";
import BetterSqlite3 from "better-sqlite3";

import { transactions, transfers } from "@/db/schema";
import { testSpendDb } from "@/db/test-database";

import type { SpendDb } from "./budget-spent";
import { settledAccountCellQuery, toCurrencyCells } from "./cell-query";
import {
    settledTransferInboundQuery,
    settledTransferOutboundQuery,
    settledTransfersInboundQuery,
    settledTransfersOutboundQuery,
    toTransferCell,
} from "./transfer-cells";

const DAY = new Date(Date.UTC(2026, 7, 9));

async function transferCells(db: SpendDb, accountId: string) {
    const [outbound, inbound] = await Promise.all([
        settledTransferOutboundQuery(db, accountId, DAY),
        settledTransferInboundQuery(db, accountId, DAY),
    ]);
    return [...outbound.map((row) => toTransferCell(row, false)), ...inbound.map((row) => toTransferCell(row, true))];
}

async function allTransferCells(db: SpendDb) {
    const [outbound, inbound] = await Promise.all([
        settledTransfersOutboundQuery(db, DAY),
        settledTransfersInboundQuery(db, DAY),
    ]);
    return [
        ...outbound.map(({ accountId, ...row }) => ({ accountId, ...toTransferCell(row, false) })),
        ...inbound.map(({ accountId, ...row }) => ({ accountId, ...toTransferCell(row, true) })),
    ];
}
const NO_RATES = buildRateTable([]);

function makeDb() {
    const sqlite = new BetterSqlite3(":memory:");
    sqlite.exec(`
		CREATE TABLE transactions (
			id text PRIMARY KEY NOT NULL,
			amount real NOT NULL,
			income integer NOT NULL,
			currency text,
			note text NOT NULL DEFAULT '',
			details text,
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
			date integer NOT NULL,
			day integer NOT NULL,
			month integer NOT NULL,
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
		CREATE TABLE transfers (
			id text PRIMARY KEY NOT NULL,
			fromAccountId text NOT NULL,
			toAccountId text NOT NULL,
			fromAmount real NOT NULL,
			fromCurrency text NOT NULL,
			fromAmountUsd real,
			toAmount real NOT NULL,
			toCurrency text NOT NULL,
			toAmountUsd real,
			exchangeRate real,
			exchangeRateType text,
			installmentPlanId text,
			date integer NOT NULL,
			day integer NOT NULL,
			month integer NOT NULL,
			note text DEFAULT '' NOT NULL,
			dateCreated integer NOT NULL,
			updatedAt integer NOT NULL,
			deletedAt integer
		);
	`);
    return testSpendDb(sqlite);
}

async function addTransfer(
    db: SpendDb,
    row: Partial<typeof transfers.$inferInsert> & { id: string; fromAccountId: string; toAccountId: string }
) {
    await db.insert(transfers).values({
        date: DAY,
        dateCreated: DAY,
        day: DAY,
        exchangeRate: 1,
        exchangeRateType: "official",
        fromAmount: 100,
        fromAmountUsd: 100,
        fromCurrency: "USD",
        month: DAY,
        note: "",
        toAmount: 100,
        toAmountUsd: 100,
        toCurrency: "USD",
        updatedAt: DAY,
        ...row,
    });
}

describe("transferCells projects each leg into the shape the balance engine already sums", () => {
    it("carries each leg's own currency and frozen USD value across a conversion", async () => {
        const db = makeDb();
        await addTransfer(db, {
            exchangeRate: 60,
            exchangeRateType: "custom",
            fromAccountId: "usd",
            fromAmount: 100,
            fromAmountUsd: 100,
            id: "t1",
            toAccountId: "ves",
            toAmount: 6000,
            toAmountUsd: 100,
            toCurrency: "VES",
        });

        const [out] = await transferCells(db, "usd");
        const [into] = await transferCells(db, "ves");

        expect(out).toMatchObject({ amount: 100, amountUsd: 100, currencyCode: "USD", income: false });
        expect(into).toMatchObject({ amount: 6000, amountUsd: 100, currencyCode: "VES", income: true });
    });

    it("ignores a transfer that does not touch the account", async () => {
        const db = makeDb();
        await addTransfer(db, { fromAccountId: "a", id: "t1", toAccountId: "b" });

        await expect(transferCells(db, "c")).resolves.toStrictEqual([]);
    });

    it("ignores a tombstoned transfer", async () => {
        const db = makeDb();
        await addTransfer(db, { deletedAt: DAY, fromAccountId: "a", id: "t1", toAccountId: "b" });

        await expect(transferCells(db, "a")).resolves.toStrictEqual([]);
    });

    it("sums several transfers on the same day and currency into one cell", async () => {
        const db = makeDb();
        await addTransfer(db, { fromAccountId: "a", id: "t1", toAccountId: "b" });
        await addTransfer(db, { fromAccountId: "a", fromAmount: 40, id: "t2", toAccountId: "b" });

        const cells = await transferCells(db, "a");

        expect(cells).toHaveLength(1);
        expect(cells[0]).toMatchObject({ amount: 140, count: 2, income: false });
    });

    it("marks a leg with no frozen USD value as unconverted", async () => {
        const db = makeDb();
        await addTransfer(db, { fromAccountId: "a", fromAmountUsd: null, id: "t1", toAccountId: "b" });

        const [cell] = await transferCells(db, "a");

        expect(cell).toMatchObject({ unconvertedAmount: 100, unconvertedCount: 1 });
    });
});

describe("transfer legs and account balances", () => {
    it("debits the source exactly once when a fee rides along", async () => {
        const db = makeDb();
        await addTransfer(db, { fromAccountId: "a", fromAmount: 97.3, id: "t1", toAccountId: "b" });
        await db.insert(transactions).values({
            accountId: "a",
            amount: 2.7,
            amountUsd: 2.7,
            currency: "USD",
            date: DAY,
            day: DAY,
            id: "fee-1",
            income: false,
            month: DAY,
            transferId: "t1",
            updatedAt: DAY,
        });

        const cells = [
            ...toCurrencyCells(await settledAccountCellQuery(db, "a", DAY)),
            ...(await transferCells(db, "a")),
        ];
        const source = accountBalance({ currency: "USD", initialBalance: 500 }, cells, NO_RATES);

        expect(source.total).toBe(400);
    });
});

describe("allTransferCells splits the whole ledger by account in one read", () => {
    it("agrees with the per-account query", async () => {
        const db = makeDb();
        await addTransfer(db, { fromAccountId: "a", id: "t1", toAccountId: "b" });
        await addTransfer(db, { fromAccountId: "b", fromAmount: 30, id: "t2", toAccountId: "c" });

        const all = await allTransferCells(db);
        for (const accountId of ["a", "b", "c"]) {
            const scoped = await transferCells(db, accountId);
            const fromAll = all
                .filter((cell) => cell.accountId === accountId)
                .map(({ accountId: _drop, ...cell }) => cell);
            expect(fromAll.sort((l, r) => Number(l.income) - Number(r.income))).toStrictEqual(
                scoped.sort((l, r) => Number(l.income) - Number(r.income))
            );
        }
    });
});
