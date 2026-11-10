import { describe, expect, it } from "vite-plus/test";

import { undoRows } from "./import-writes";
import type { LedgerBooks } from "./ledger-books";

const NOW = Date.parse("2026-11-08T15:00:00Z");
const DAY = Date.parse("2026-10-15T15:00:00Z");

const envelope = (localId: string) => ({
    $key: localId,
    $origin: "remote",
    _creationTime: 1,
    _id: `doc-${localId}`,
    dateCreated: 1,
    deletedAt: null,
    deviceId: "phone",
    localId,
    seq: 7,
    updatedAt: 5,
    userId: "owner",
});

const entry = (localId: string, accountId: string, categoryId: string) => ({
    ...envelope(localId),
    accountId,
    amount: 10,
    amountUsd: 10,
    categoryId,
    currency: "USD",
    customColor: null,
    date: DAY,
    day: DAY,
    details: null,
    emoji: null,
    exchangeRate: 1,
    exchangeRateType: null,
    icon: null,
    imageColor: null,
    imageKey: null,
    income: false,
    month: DAY,
    note: localId,
    onceRecurring: false,
    recurringCoefficient: 1,
    recurringEndDate: null,
    recurringType: 0,
});

const category = (localId: string) => ({
    ...envelope(localId),
    color: "#B56858",
    emoji: null,
    icon: null,
    income: false,
    name: localId,
    parentId: null,
    sortOrder: 0,
});

const account = (localId: string) => ({
    ...envelope(localId),
    currency: "USD",
    customColor: null,
    emoji: null,
    icon: null,
    imageColor: null,
    imageKey: null,
    initialBalance: 0,
    initialBalanceDate: DAY,
    initialBalanceUsd: 0,
    kind: "asset",
    name: localId,
    sortOrder: 0,
});

const books = (patch: Partial<Record<keyof LedgerBooks, unknown[]>>) =>
    // SAFETY: fixture rows carry the live query keys the row types omit.
    ({
        accounts: [],
        appMeta: [{ key: "currency", value: "USD" }],
        budgets: [],
        categories: [],
        exchangeRates: [],
        installmentPlans: [],
        installments: [],
        outsideMoves: [],
        outsidePayments: [],
        savingsGoals: [],
        transactions: [],
        transfers: [],
        ...patch,
    }) as unknown as LedgerBooks;

describe("undoRows", () => {
    it("keeps what the import made when an entry logged since still uses it", () => {
        const ledger = books({
            accounts: [account("wallet"), account("card")],
            categories: [category("coffee"), category("tea")],
            transactions: [
                entry("imported-1", "wallet", "coffee"),
                entry("imported-2", "card", "tea"),
                entry("logged-later", "wallet", "coffee"),
            ],
        });

        const { count, rows } = undoRows(
            ledger,
            {
                accountIds: ["wallet", "card"],
                categoryIds: ["coffee", "tea"],
                entryIds: ["imported-1", "imported-2"],
            },
            NOW
        );

        expect(count).toBe(2);
        expect(rows.map((row) => `${row.table}/${row.localId}`).toSorted()).toStrictEqual([
            "accounts/card",
            "categories/tea",
            "transactions/imported-1",
            "transactions/imported-2",
        ]);
    });

    it("keeps an account a later transfer moves money through and a category a later budget tracks", () => {
        const ledger = books({
            accounts: [account("card")],
            budgets: [{ ...envelope("tea-budget"), categoryId: "tea" }],
            categories: [category("tea")],
            transactions: [entry("imported", "card", "tea")],
            transfers: [{ ...envelope("later-move"), fromAccountId: "card", toAccountId: "cash" }],
        });

        const { rows } = undoRows(ledger, { accountIds: ["card"], categoryIds: ["tea"], entryIds: ["imported"] }, NOW);

        expect(rows.map((row) => `${row.table}/${row.localId}`)).toStrictEqual(["transactions/imported"]);
    });

    it("keeps the imported parent of an imported category something logged later still uses", () => {
        const ledger = books({
            categories: [category("food"), { ...category("bakery"), parentId: "food" }],
            transactions: [entry("imported", "cash", "bakery"), entry("logged-later", "cash", "bakery")],
        });

        const { rows } = undoRows(
            ledger,
            { accountIds: [], categoryIds: ["food", "bakery"], entryIds: ["imported"] },
            NOW
        );

        expect(rows.map((row) => `${row.table}/${row.localId}`)).toStrictEqual(["transactions/imported"]);
    });
});
