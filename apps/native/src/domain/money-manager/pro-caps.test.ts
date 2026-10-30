import { describe, expect, it } from "vite-plus/test";

import { importCapsPassed } from "./pro-caps";
import type { MmImportPlan, OutlayrLedgerState, PlannedAccount } from "./types";

const EMPTY: OutlayrLedgerState = {
    accounts: [],
    budgetCategoryIds: [],
    categories: [],
    currency: "USD",
    currencyChosen: false,
    entries: [],
};

function account(name: string, currency: string, existingId: string | null = null): PlannedAccount {
    return {
        color: "#339475",
        currency,
        existingId,
        expectedBalance: null,
        icon: "Wallet01",
        initialBalance: 0,
        initialBalanceDate: new Date(2024, 0, 1),
        key: name,
        kind: "asset",
        name,
    };
}

function plan(accounts: PlannedAccount[], budgets = 0): MmImportPlan {
    return {
        accounts,
        budgets: Array.from({ length: budgets }, (_, index) => ({ amount: 10, categoryKey: `mm:${index}` })),
        categories: [],
        entries: [],
        ledgerCurrency: null,
        transfers: [],
    };
}

describe("importCapsPassed", () => {
    it("names every free cap a large backup passes, and none for a small one", () => {
        const big = plan([account("Cash", "USD"), account("Bank", "USD"), account("Pesos", "COP")], 3);
        expect(importCapsPassed(big, EMPTY)).toStrictEqual([
            { cap: "accounts", count: 3, free: 2 },
            { cap: "budgets", count: 3, free: 2 },
            { cap: "currencies", count: 2, free: 1 },
        ]);
        expect(importCapsPassed(plan([account("Cash", "USD"), account("Bank", "USD")], 2), EMPTY)).toStrictEqual([]);
    });

    it("counts what the ledger already holds, but never blocks an import that adds nothing to a cap", () => {
        const ledger: OutlayrLedgerState = {
            ...EMPTY,
            accounts: [
                { currency: "USD", id: "a1", kind: "asset", name: "Cash" },
                { currency: "EUR", id: "a2", kind: "asset", name: "Euros" },
                { currency: "USD", id: "p1", kind: "person", name: "Ana" },
            ],
        };
        expect(importCapsPassed(plan([account("Bank", "USD")]), ledger)).toStrictEqual([
            { cap: "accounts", count: 3, free: 2 },
        ]);
        expect(importCapsPassed(plan([account("Cash", "USD", "a1")]), ledger)).toStrictEqual([]);
    });
});
