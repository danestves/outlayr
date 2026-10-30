import BetterSqlite3 from "better-sqlite3";
import { describe, expect, it } from "vite-plus/test";

import { analyzeSnapshot } from "./analysis";
import { readMoneyManagerArchive } from "./archive";
import { buildMoneyManagerFixture } from "./fixture";
import { readMoneyManagerSnapshot } from "./snapshot";
import type { SqlAll } from "./snapshot";
import type { OutlayrLedgerState } from "./types";

const EMPTY: OutlayrLedgerState = {
    accounts: [],
    budgetCategoryIds: [],
    categories: [],
    currency: "USD",
    currencyChosen: false,
    entries: [],
};

function snapshot() {
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

describe("analyzeSnapshot", () => {
    it("pairs uncategorized corrections, counts orphans, and reports only a real balance gap", () => {
        const analysis = analyzeSnapshot(snapshot(), EMPTY);
        expect(analysis.uncategorized).toMatchObject({ expense: 3, income: 1 });
        expect(analysis.uncategorized.pairs).toStrictEqual([
            expect.objectContaining({
                fromAccountUid: "cash",
                inUid: "e-pair-in",
                outUid: "e-pair-out",
                toAccountUid: "visa",
            }),
        ]);
        expect(analysis.orphanedEntryCount).toBe(1);
        expect(analysis.balanceGaps.map((gap) => gap.accountUid)).toStrictEqual(["spare"]);
        expect(analysis.accounts.find((account) => account.uid === "cash")?.entryCount).toBe(4);
    });

    it("counts overlap from the first Outlayr day inside the backup", () => {
        const ledger: OutlayrLedgerState = {
            ...EMPTY,
            entries: [{ amount: 15, currency: "USD", date: new Date(2024, 2, 4, 10).getTime(), income: false }],
        };
        const { overlap } = analyzeSnapshot(snapshot(), ledger);
        expect(overlap).toStrictEqual({ matches: 1, mmEntries: 7, outlayrEntries: 1, outlayrFirstDay: "2024-03-04" });

        const base = snapshot();
        const twins = base.entries
            .filter((entry) => entry.uid === "e-transport")
            .map((entry) => ({ ...entry, uid: "twin" }));
        const doubled = { ...base, entries: [...base.entries, ...twins] };
        expect(analyzeSnapshot(doubled, ledger).overlap?.matches).toBe(1);
    });
});
