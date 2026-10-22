import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { accountBalance } from "@outlayr/money/account-balance";
import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import { buildRateTable } from "@outlayr/money/valuation";
import { renderHook } from "@testing-library/react-native";

import type { Database } from "@/db/client";
import { accounts, transactions, transfers } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";

import { openingForBalance, useAccountBalance, useSettledAccountCells } from "./accounts";
import { settledAccountCellQuery, settledAccountsCellQuery, toCurrencyCell, toCurrencyCells } from "./cell-query";
import type { CellRow } from "./cell-query";
import { useLogOverviewIn } from "./debts";
import { backfillRecurring } from "./recurrence-backfill";
import { transactionsRepo } from "./transactions-core";

const makeDb = () => migratedDatabase({ foreignKeys: false });

const JUNE_1 = new Date("2026-06-01T12:00:00.000Z");
const JUNE_2 = new Date("2026-06-02T12:00:00.000Z");
const valuation = { displayCurrency: "USD", rates: buildRateTable([]) };

async function addTransaction(
    db: Database,
    overrides: Partial<typeof transactions.$inferInsert> & { id: string }
): Promise<void> {
    await db.insert(transactions).values({
        amount: 10,
        amountUsd: 10,
        currency: "USD",
        date: JUNE_1,
        day: JUNE_1,
        income: false,
        month: JUNE_1,
        note: "",
        updatedAt: JUNE_1,
        ...overrides,
    });
}

describe("settledAccountsCellQuery", () => {
    let db: Database;
    beforeEach(() => {
        db = makeDb();
    });

    it("groups attached rows by account, currency, direction and day", async () => {
        await addTransaction(db, { accountId: "a1", amount: 5, id: "t1" });
        await addTransaction(db, { accountId: "a1", amount: 7, id: "t2" });
        await addTransaction(db, {
            accountId: "a1",
            amount: 3,
            id: "t3",
            income: true,
        });
        await addTransaction(db, { accountId: "a2", amount: 11, id: "t4" });

        const rows = await settledAccountsCellQuery(db, JUNE_1);
        const byKey = rows.map((row) => ({
            accountId: row.accountId,
            ...toCurrencyCell(row),
        }));

        const a1Expense = byKey.find((cell) => cell.accountId === "a1" && !cell.income);
        expect(a1Expense?.amount).toBe(12);
        expect(a1Expense?.count).toBe(2);
        const a1Income = byKey.find((cell) => cell.accountId === "a1" && cell.income);
        expect(a1Income?.amount).toBe(3);
        expect(byKey.find((cell) => cell.accountId === "a2")?.amount).toBe(11);
    });

    it("excludes detached and soft-deleted rows", async () => {
        await addTransaction(db, { accountId: null, amount: 99, id: "t1" });
        await addTransaction(db, {
            accountId: "a1",
            amount: 5,
            deletedAt: JUNE_1,
            id: "t2",
        });
        await addTransaction(db, { accountId: "a1", amount: 4, id: "t3" });

        const rows = await settledAccountsCellQuery(db, JUNE_1);
        expect(rows).toHaveLength(1);
        expect(rows[0].accountId).toBe("a1");
        expect(toCurrencyCell(rows[0]).amount).toBe(4);
    });

    it("values an account to the cent its own read does when a UTC day spans two local days", async () => {
        // 02:00Z and 06:00Z are one UTC day but either side of Caracas midnight.
        await addTransaction(db, {
            accountId: "a1",
            amount: 3.3,
            amountUsd: 3.3,
            date: new Date("2026-06-01T02:00Z"),
            id: "t1",
        });
        await addTransaction(db, {
            accountId: "a1",
            amount: 3.3,
            amountUsd: 3.3,
            date: new Date("2026-06-01T06:00Z"),
            id: "t2",
        });
        const euros = { currency: "EUR", initialBalance: 0 };
        const rates = buildRateTable([{ date: "2026-06-01", quote: "EUR", rate: 0.92 }]);

        const alone = accountBalance(euros, toCurrencyCells(await settledAccountCellQuery(db, "a1", JUNE_1)), rates);
        const all = accountBalance(euros, toCurrencyCells(await settledAccountsCellQuery(db, JUNE_1)), rates);

        expect(all.total).toBe(alone.total);
    });
});

describe("openingForBalance", () => {
    it("back-solves the opening from the account's own flows so the balance reads the target", async () => {
        const db = makeDb();
        await addTransaction(db, { accountId: "a1", amount: 10, id: "t1" });
        await addTransaction(db, { accountId: "a1", amount: 3, id: "t2", income: true });
        await addTransaction(db, { accountId: "a1", amount: 40, deletedAt: JUNE_1, id: "t3" });
        await addTransaction(db, { accountId: "a2", amount: 99, id: "t4" });

        await expect(openingForBalance(db, "a1", 50, "USD", JUNE_1)).resolves.toBe(57);
        await expect(openingForBalance(db, "a1", -20, "USD", JUNE_1)).resolves.toBe(-13);
    });
});

jest.mock("./live-query", () => ({
    ...jest.requireActual<typeof import("./live-query")>("./live-query"),
    useLiveQuery: jest.fn<typeof import("./live-query").useLiveQuery>(),
}));

const mockUseLiveQuery = jest.mocked(jest.requireMock<typeof import("./live-query")>("./live-query").useLiveQuery);
const { useLiveQuery } = jest.requireActual<typeof import("./live-query")>("./live-query");

function liveRow(overrides: Partial<CellRow & { plotDay: string }> = {}): CellRow & { plotDay: string } {
    return {
        currency: "USD",
        dateKey: "2026-08-06",
        income: true,
        plotDay: "2026-08-06",
        rows: 1,
        total: 4,
        totalUsd: 4,
        unconverted: 0,
        unconvertedRows: 0,
        ...overrides,
    };
}

describe("useSettledAccountCells", () => {
    beforeEach(() => {
        mockUseLiveQuery.mockReset();
    });

    it("keeps transaction cells and maps outbound and inbound transfers with opposite directions", async () => {
        const transaction = liveRow();
        const outbound = liveRow({
            currency: "EUR",
            dateKey: "2026-08-07",
            income: false,
            plotDay: "2026-08-07",
            total: 35,
            totalUsd: 40,
        });
        const inbound = liveRow({
            currency: "VES",
            dateKey: "2026-08-08",
            income: false,
            plotDay: "2026-08-08",
            total: 10,
            totalUsd: 1,
        });
        mockUseLiveQuery
            .mockReturnValueOnce([transaction])
            .mockReturnValueOnce([outbound])
            .mockReturnValueOnce([inbound])
            .mockReturnValueOnce([])
            .mockReturnValueOnce([]);

        const { result } = await renderHook(() =>
            useSettledAccountCells({} as Database, "account-1", JUNE_1.getTime())
        );

        expect(result.current).toStrictEqual([
            {
                amount: 4,
                amountUsd: 4,
                count: 1,
                currencyCode: "USD",
                dateKey: "2026-08-06",
                income: true,
                plotDay: "2026-08-06",
                rateNeededAmount: 0,
                rateNeededCount: 0,
                unconvertedAmount: 0,
                unconvertedCount: 0,
            },
            {
                amount: 35,
                amountUsd: 40,
                count: 1,
                currencyCode: "EUR",
                dateKey: "2026-08-07",
                income: false,
                plotDay: "2026-08-07",
                rateNeededAmount: 0,
                rateNeededCount: 0,
                unconvertedAmount: 0,
                unconvertedCount: 0,
            },
            {
                amount: 10,
                amountUsd: 1,
                count: 1,
                currencyCode: "VES",
                dateKey: "2026-08-08",
                income: true,
                plotDay: "2026-08-08",
                rateNeededAmount: 0,
                rateNeededCount: 0,
                unconvertedAmount: 0,
                unconvertedCount: 0,
            },
        ]);
    });
});

describe("useLogOverviewIn", () => {
    beforeEach(() => {
        // The reads after the queued ones are the installment orders, empty here.
        mockUseLiveQuery.mockReset().mockReturnValue([]);
    });

    const account = (id: string, initialBalance: number) => ({
        currency: "USD",
        id,
        initialBalance,
        initialBalanceDate: JUNE_1,
        initialBalanceUsd: initialBalance,
        kind: "asset",
    });

    it("drops an account inside its undo window, cells and all", async () => {
        // `useAccounts`, then the transaction cells, then outbound and inbound transfers.
        mockUseLiveQuery
            .mockReturnValueOnce([account("keep", 100), account("going", 50)])
            .mockReturnValueOnce([{ ...liveRow({ income: false, total: 5, totalUsd: 5 }), accountId: "going" }])
            .mockReturnValueOnce([])
            .mockReturnValueOnce([])
            .mockReturnValueOnce([]);

        const { result } = await renderHook(() => useLogOverviewIn(makeDb(), valuation, JUNE_1.getTime(), "going"));

        expect(result.current.banks?.count).toBe(1);
        expect(result.current.banks?.total).toBe(100);
        expect(result.current.banks?.rows.map((row) => row.id)).toStrictEqual(["keep"]);
    });

    it("leaves people out of the Log's total and values them for its Debts row", async () => {
        mockUseLiveQuery
            .mockReturnValueOnce([account("zinli", 100), { ...account("pedro", -50), kind: "person" }])
            .mockReturnValueOnce([])
            .mockReturnValueOnce([])
            .mockReturnValueOnce([])
            .mockReturnValueOnce([]);

        const { result } = await renderHook(() => useLogOverviewIn(makeDb(), valuation, JUNE_1.getTime()));

        expect(result.current.banks?.total).toBe(100);
        expect(result.current.banks?.rows.map((row) => row.id)).toStrictEqual(["zinli"]);
        expect(result.current.debts.youOweTotal).toBe(50);
    });

    it("leaves a future-dated row out of the total until its date", async () => {
        mockUseLiveQuery.mockImplementation(useLiveQuery);
        const db = makeDb();
        await db
            .insert(accounts)
            .values({ ...account("a1", 100), dateCreated: JUNE_1, name: "Checking", updatedAt: JUNE_1 });
        await addTransaction(db, { accountId: "a1", amount: 7, date: JUNE_2, day: JUNE_2, id: "later" });
        const { rerender, result } = await renderHook(
            (nowMs: number) => useLogOverviewIn(db, valuation, nowMs).banks?.total,
            { initialProps: JUNE_1.getTime() }
        );
        expect(result.current).toBe(100);

        await rerender(JUNE_2.getTime());

        expect(result.current).toBe(93);
    });
});

describe("a row dated after now", () => {
    const checking = { currency: "USD", id: "a1", initialBalance: 100 };
    const savings = { currency: "USD", id: "a2", initialBalance: 0 };
    let db: Database;

    beforeEach(async () => {
        mockUseLiveQuery.mockImplementation(useLiveQuery);
        db = makeDb();
        await addTransaction(db, { accountId: "a1", amount: 10, id: "settled" });
    });

    async function balanceBeforeAndOn(account: typeof checking): Promise<number[]> {
        const { rerender, result } = await renderHook((nowMs: number) => useAccountBalance(db, account, nowMs).total, {
            initialProps: JUNE_1.getTime(),
        });
        const before = result.current;
        await rerender(JUNE_2.getTime());
        return [before, result.current];
    }

    it("leaves an expense out of the balance until its date", async () => {
        await addTransaction(db, { accountId: "a1", amount: 7, date: JUNE_2, day: JUNE_2, id: "later" });

        await expect(balanceBeforeAndOn(checking)).resolves.toStrictEqual([90, 83]);
    });

    it("leaves both legs of a transfer out of the balances until its date", async () => {
        await db.insert(transfers).values({
            date: JUNE_2,
            dateCreated: JUNE_1,
            day: JUNE_2,
            fromAccountId: "a1",
            fromAmount: 40,
            fromCurrency: "USD",
            id: "move",
            month: JUNE_2,
            toAccountId: "a2",
            toAmount: 40,
            toCurrency: "USD",
            updatedAt: JUNE_1,
        });

        await expect(balanceBeforeAndOn(checking)).resolves.toStrictEqual([90, 50]);
        await expect(balanceBeforeAndOn(savings)).resolves.toStrictEqual([0, 40]);
    });

    it("leaves a subscription charging tomorrow out of the balance until it charges", async () => {
        const id = await transactionsRepo.create(db, {
            accountId: "a1",
            amount: 7.06,
            categoryId: null,
            currency: "USD",
            date: JUNE_2,
            details: null,
            income: false,
            note: "Prime Video",
            onceRecurring: true,
            recurringCoefficient: 1,
            recurringEndDate: null,
            recurringType: RECURRING_TYPE.monthly,
            reminderLeadDays: null,
        });
        await backfillRecurring(db, id, JUNE_1);

        await expect(balanceBeforeAndOn(checking)).resolves.toStrictEqual([90, 82.94]);
    });

    it("keeps the opening when the editor saves the balance it shows", async () => {
        await addTransaction(db, { accountId: "a1", amount: 7, date: JUNE_2, day: JUNE_2, id: "later" });
        const { result } = await renderHook(() => useAccountBalance(db, checking, JUNE_1.getTime()).total);

        expect(result.current).toBe(90);
        await expect(openingForBalance(db, "a1", result.current, "USD", JUNE_1)).resolves.toBe(checking.initialBalance);
    });
});
