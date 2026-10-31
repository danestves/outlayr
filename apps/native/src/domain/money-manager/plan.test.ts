import BetterSqlite3 from "better-sqlite3";
import { describe, expect, it } from "vite-plus/test";

import { analyzeSnapshot } from "./analysis";
import { readMoneyManagerArchive } from "./archive";
import { defaultChoices, keepModeCategories } from "./defaults";
import { buildMoneyManagerFixture } from "./fixture";
import { buildImportPlan } from "./plan";
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

function opened() {
    const archive = readMoneyManagerArchive(buildMoneyManagerFixture());
    if (!archive.ok) {
        throw new Error(archive.error.kind);
    }
    const sqlite = new BetterSqlite3(Buffer.from(archive.database));
    const all: SqlAll = (sql) => sqlite.prepare(sql).all() as Record<string, unknown>[];
    const snap = readMoneyManagerSnapshot(all);
    sqlite.close();
    return snap;
}

describe("buildImportPlan", () => {
    it("books a foreign entry on a non-USD account at what the account was charged", () => {
        const base = opened();
        const snap = {
            ...base,
            accounts: base.accounts.map((account) =>
                account.uid === "visa" ? { ...account, currency: "COP" } : account
            ),
            entries: base.entries.map((entry) =>
                entry.uid === "e-cop" ? { ...entry, accountAmount: 76_481, amount: 20.8, currency: "USD" } : entry
            ),
        };
        const analysis = analyzeSnapshot(snap, EMPTY);
        const plan = buildImportPlan(snap, analysis, defaultChoices(snap, analysis, EMPTY), EMPTY);
        expect(plan.entries.find((entry) => entry.note === "Trip")).toMatchObject({
            amount: 76_481,
            currency: "COP",
            exchangeRate: 76_481 / 20.8,
        });
    });

    it("folds duplicates, turns pairs and a one-sided transfer into the right rows, and freezes a foreign rate", () => {
        const snap = opened();
        const analysis = analyzeSnapshot(snap, EMPTY);
        const plan = buildImportPlan(snap, analysis, defaultChoices(snap, analysis, EMPTY), EMPTY);

        expect(plan.accounts.map((account) => account.key)).toStrictEqual(["cash", "visa", "zinli", "spare"]);
        expect(plan.accounts.find((account) => account.key === "visa")?.kind).toBe("liability");
        expect(plan.accounts.find((account) => account.key === "zinli")?.expectedBalance).toBe(105);
        expect(plan.accounts.find((account) => account.key === "spare")).toMatchObject({
            expectedBalance: 5,
            initialBalance: 5,
        });
        expect(plan.accounts.find((account) => account.key === "cash")?.initialBalance).toBe(0);
        expect(plan.entries.find((entry) => entry.note === "Snack")?.accountKey).toBe("zinli");
        expect(plan.entries.find((entry) => entry.currency === "COP")?.exchangeRate).toBeCloseTo(76_481 / 20.8);
        expect(plan.entries.find((entry) => entry.note === "Market")?.exchangeRate).toBeNull();
        expect(plan.entries.find((entry) => entry.note === "Transfer Old")).toMatchObject({
            accountKey: "cash",
            amount: 30,
            categoryKey: null,
            income: true,
        });
        expect(plan.transfers).toStrictEqual(
            expect.arrayContaining([
                expect.objectContaining({ fromAccountKey: "cash", fromAmount: 20, toAccountKey: "visa" }),
                expect.objectContaining({ fromAccountKey: "cash", fromAmount: 10, toAccountKey: "zinli" }),
            ])
        );
        expect(plan.entries).toHaveLength(9);
        expect(plan.transfers).toHaveLength(2);
        expect(plan.categories.map((category) => category.name)).toStrictEqual([
            "Groceries",
            "Transport",
            "Parking",
            "Paycheck",
            "Allowance",
        ]);
        expect(plan.categories.find((category) => category.name === "Parking")?.parent).toStrictEqual({
            key: "preset:out:Transport",
        });
        expect(plan.budgets).toStrictEqual([
            { amount: 500, categoryKey: "preset:out:Groceries" },
            { amount: 100, categoryKey: "mm:allowance" },
        ]);
        expect(plan.ledgerCurrency).toBe("USD");
    });

    it("drops rows on or after the overlap day and skips a budget the ledger already has", () => {
        const snap = opened();
        const overlapLedger: OutlayrLedgerState = {
            ...EMPTY,
            entries: [{ amount: 1, currency: "USD", date: new Date(2024, 2, 10, 9).getTime(), income: false }],
        };
        const overlap = analyzeSnapshot(snap, overlapLedger);
        const cutoff = buildImportPlan(snap, overlap, defaultChoices(snap, overlap, overlapLedger), overlapLedger);
        expect(cutoff.transfers.some((transfer) => transfer.fromAmount === 20)).toBe(false);
        expect(cutoff.transfers).toHaveLength(1);
        expect(cutoff.entries.some((entry) => entry.note === "Transfer Old")).toBe(true);
        expect(cutoff.entries.some((entry) => entry.note === "" && entry.amount === 7)).toBe(false);
        expect(cutoff.entries).toHaveLength(8);

        const budgeted: OutlayrLedgerState = {
            ...EMPTY,
            budgetCategoryIds: ["g1"],
            categories: [
                {
                    color: "#53915A",
                    icon: "ShoppingCart01",
                    id: "g1",
                    income: false,
                    name: "Groceries",
                    parentId: null,
                    preset: null,
                },
            ],
        };
        const analysis = analyzeSnapshot(snap, budgeted);
        const plan = buildImportPlan(snap, analysis, defaultChoices(snap, analysis, budgeted), budgeted);
        expect(plan.budgets).toStrictEqual([{ amount: 100, categoryKey: "mm:allowance" }]);
        expect(keepModeCategories(snap, analysis, EMPTY).mercado).toStrictEqual({ kind: "new" });
    });

    it("uses noon when the write timestamp falls on another local day", () => {
        const snap = opened();
        const market = snap.entries.find((entry) => entry.uid === "e-mercado");
        if (market == null) {
            throw new Error("missing market entry");
        }
        market.createdAt = new Date(2024, 2, 1, 15, 4).getTime();
        const analysis = analyzeSnapshot(snap, EMPTY);
        const plan = buildImportPlan(snap, analysis, defaultChoices(snap, analysis, EMPTY), EMPTY);
        const imported = plan.entries.find((entry) => entry.note === "Market");
        expect(imported?.date.getFullYear()).toBe(2024);
        expect(imported?.date.getMonth()).toBe(2);
        expect(imported?.date.getDate()).toBe(2);
        expect(imported?.date.getHours()).toBe(12);
        const lot = plan.entries.find((entry) => entry.note === "Lot");
        expect(lot?.date.getHours()).toBe(15);
        expect(lot?.date.getMinutes()).toBe(4);
    });
});
