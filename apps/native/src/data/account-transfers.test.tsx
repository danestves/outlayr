import { beforeEach, describe, expect, it } from "@jest/globals";
import { accountBalance } from "@outlayr/money/account-balance";
import { buildRateTable } from "@outlayr/money/valuation";
import { render } from "@testing-library/react-native";
import { Text } from "react-native";

import type { Database } from "@/db/client";
import { accounts, transactions, transfers } from "@/db/schema";
import { migratedDatabase } from "@/db/test-database";
import { groupByDay } from "@/domain/day-sections";
import { mergeByRecency } from "@/domain/transfer-log-rows";
import type { TransferLogRow } from "@/domain/transfer-log-rows";

import { useAccountTransfers } from "./account-transfers";
import { useAccountTransactions, useSettledAccountCells } from "./accounts";

const AUG_9 = new Date(Date.UTC(2026, 7, 9, 12));
const AUG_10 = new Date(Date.UTC(2026, 7, 10, 12));

const makeDb = migratedDatabase;

async function addAccount(db: Database, id: string, name: string): Promise<void> {
    await db.insert(accounts).values({
        currency: "USD",
        dateCreated: AUG_9,
        id,
        initialBalanceDate: AUG_9,
        name,
        updatedAt: AUG_9,
    });
}

async function addTransfer(
    db: Database,
    row: Partial<typeof transfers.$inferInsert> & { id: string; fromAccountId: string; toAccountId: string }
): Promise<void> {
    await db.insert(transfers).values({
        date: AUG_9,
        dateCreated: AUG_9,
        day: AUG_9,
        fromAmount: 40,
        fromCurrency: "USD",
        month: AUG_9,
        toAmount: 40,
        toCurrency: "USD",
        updatedAt: AUG_9,
        ...row,
    });
}

async function readTransfers(db: Database, accountId: string): Promise<TransferLogRow[]> {
    let seen: TransferLogRow[] = [];
    function Probe() {
        seen = useAccountTransfers(db, accountId);
        return <Text testID="probe">{seen.length}</Text>;
    }
    await render(<Probe />);
    return seen;
}

async function readDay(db: Database, accountId: string): Promise<{ balance: number; total: number }> {
    let seen = { balance: 0, total: 0 };
    function Probe() {
        const rows = mergeByRecency(useAccountTransactions(db, accountId), useAccountTransfers(db, accountId));
        const cells = useSettledAccountCells(db, accountId, AUG_9.getTime());
        seen = {
            balance: accountBalance({ currency: "USD", initialBalance: 0 }, cells, buildRateTable([])).total,
            total: groupByDay(rows, "USD")[0]?.total ?? 0,
        };
        return <Text testID="probe">{rows.length}</Text>;
    }
    await render(<Probe />);
    return seen;
}

describe("an account's transfers", () => {
    let db: Database;

    beforeEach(async () => {
        db = makeDb();
        await addAccount(db, "checking", "Checking");
        await addAccount(db, "savings", "Savings");
    });

    it("includes money that arrived from another account", async () => {
        await addTransfer(db, { fromAccountId: "checking", id: "tr1", toAccountId: "savings" });

        const rows = await readTransfers(db, "savings");
        expect(rows.map((row) => row.id)).toStrictEqual(["tr1"]);
    });

    it("includes money that left for another account", async () => {
        await addTransfer(db, { fromAccountId: "checking", id: "tr1", toAccountId: "savings" });

        const rows = await readTransfers(db, "checking");
        expect(rows.map((row) => row.id)).toStrictEqual(["tr1"]);
    });

    it("names both ends of the move on a row that carries no note", async () => {
        await addTransfer(db, { fromAccountId: "checking", id: "tr1", toAccountId: "savings" });

        const rows = await readTransfers(db, "savings");
        expect(rows[0].note).toBe("Checking → Savings");
    });

    it("states what left and what arrived when the source paid a fee", async () => {
        await addTransfer(db, { fromAccountId: "checking", id: "tr1", toAccountId: "savings" });
        await db.insert(transactions).values({
            accountId: "checking",
            amount: 2,
            currency: "USD",
            date: AUG_9,
            day: AUG_9,
            id: "fee1",
            income: false,
            month: AUG_9,
            note: "Fee",
            transferId: "tr1",
            updatedAt: AUG_9,
        });

        const [row] = await readTransfers(db, "checking");
        expect(row?.moved).toStrictEqual({
            arrived: 40,
            arrivedCurrency: "USD",
            fees: [{ amount: 2, currency: "USD" }],
            outside: null,
            sent: 42,
        });
    });

    it("moves each account's day total by exactly what the day did to its balance", async () => {
        const spend = { currency: "USD", date: AUG_9, day: AUG_9, income: false, month: AUG_9, updatedAt: AUG_9 };
        const move = { fromAccountId: "checking", toAccountId: "savings" };
        await addTransfer(db, { ...move, fromAmount: 100, id: "tr1", toAmount: 100 });
        await addTransfer(db, { ...move, fromAmount: 50, id: "tr2", toAmount: 50 });
        await db.insert(transactions).values([
            { ...spend, accountId: "checking", amount: 2, id: "fee1", note: "Fee", transferId: "tr1" },
            { ...spend, accountId: "savings", amount: 1, id: "fee2", note: "Fee", transferId: "tr2" },
            { ...spend, accountId: "checking", amount: 10, id: "coffee", note: "Coffee" },
        ]);

        await expect(readDay(db, "checking")).resolves.toStrictEqual({ balance: -162, total: -162 });
        await expect(readDay(db, "savings")).resolves.toStrictEqual({ balance: 149, total: 149 });
    });

    it("ignores a transfer between two other accounts", async () => {
        await addAccount(db, "cash", "Cash");
        await addTransfer(db, { fromAccountId: "checking", id: "tr1", toAccountId: "cash" });

        await expect(readTransfers(db, "savings")).resolves.toStrictEqual([]);
    });

    it("ignores a transfer that was deleted", async () => {
        await addTransfer(db, { deletedAt: AUG_9, fromAccountId: "checking", id: "tr1", toAccountId: "savings" });

        await expect(readTransfers(db, "savings")).resolves.toStrictEqual([]);
    });

    it("lists the newest first", async () => {
        await addTransfer(db, { fromAccountId: "checking", id: "older", toAccountId: "savings" });
        await addTransfer(db, {
            date: AUG_10,
            day: AUG_10,
            fromAccountId: "savings",
            id: "newer",
            toAccountId: "checking",
        });

        const rows = await readTransfers(db, "savings");
        expect(rows.map((row) => row.id)).toStrictEqual(["newer", "older"]);
    });
});
