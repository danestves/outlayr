import BetterSqlite3 from "better-sqlite3";
import { describe, expect, it } from "vite-plus/test";

import { readMoneyManagerArchive } from "./archive";
import { buildMoneyManagerFixture } from "./fixture";
import { MoneyManagerSnapshotError, readMoneyManagerSnapshot } from "./snapshot";
import type { SqlAll } from "./snapshot";

function openFixture(): ReturnType<typeof readMoneyManagerSnapshot> {
    const archive = readMoneyManagerArchive(buildMoneyManagerFixture());
    if (!archive.ok) {
        throw new Error(archive.error.kind);
    }
    const sqlite = new BetterSqlite3(Buffer.from(archive.database));
    try {
        const all: SqlAll = (sql) => sqlite.prepare(sql).all() as Record<string, unknown>[];
        return readMoneyManagerSnapshot(all);
    } finally {
        sqlite.close();
    }
}

describe("readMoneyManagerSnapshot", () => {
    it("fails when a required table cannot be read", () => {
        const all: SqlAll = () => {
            throw new Error("no such table: account");
        };
        expect(() => readMoneyManagerSnapshot(all)).toThrow(MoneyManagerSnapshotError);
        try {
            readMoneyManagerSnapshot(all);
        } catch (error) {
            expect(error).toMatchObject({ operation: "read", table: "account" });
        }
    });

    it("resolves entered currency, a null transfer leg, and deleted rows", () => {
        const snapshot = openFixture();
        const cop = snapshot.entries.find((entry) => entry.uid === "e-cop");
        expect(cop).toMatchObject({
            accountAmount: 20.8,
            amount: 76_481,
            currency: "COP",
            defaultAmount: 20.8,
        });

        expect(snapshot.transfers.find((transfer) => transfer.uid === "t-onesided")).toMatchObject({
            fromAmount: 30,
            toAmount: 30,
            toCurrency: "USD",
        });
        expect(snapshot.accounts.find((account) => account.uid === "zinli-hidden")?.hidden).toBe(true);
        expect(snapshot.accounts.find((account) => account.uid === "zinli")?.hidden).toBe(false);
        expect(snapshot.accounts.find((account) => account.uid === "old")).toMatchObject({ removed: true });
        expect(snapshot.removedEntryCount).toBe(1);
        expect(snapshot.entries.some((entry) => entry.uid === "e-removed")).toBe(false);
        expect(snapshot.accounts.find((account) => account.uid === "cash")?.mmColor).toBe("#FF0000");
        expect(snapshot.accounts.find((account) => account.uid === "visa")?.mmColor).toBe("#0000FF");
    });
});
