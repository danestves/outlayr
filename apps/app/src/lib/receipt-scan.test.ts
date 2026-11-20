import type { ReceiptDraft } from "@outlayr/backend/confect/receiptScan.spec";
import { describe, expect, it } from "vite-plus/test";

import { prepareLedger } from "./dashboard-series-ledger";
import { draftOf, wallInstant } from "./entry-writes";
import type { LedgerBooks } from "./ledger-books";
import { scannedEntry } from "./receipt-scan";

// 22:30 on Nov 7 in Caracas (UTC-4), already Nov 8 in UTC.
const LATE = Date.parse("2026-11-08T02:30:00Z");

const envelope = (localId: string) => ({ deletedAt: null, deviceId: "d", localId, seq: 1, updatedAt: 5, userId: "u" });

const category = (localId: string, name: string, income = false) => ({
    ...envelope(localId),
    color: "#000",
    emoji: null,
    icon: null,
    income,
    name,
    parentId: null,
    sortOrder: 0,
});

const account = (localId: string, name: string, currency: string) => ({
    ...envelope(localId),
    currency,
    initialBalance: 0,
    initialBalanceDate: 0,
    name,
});

const ledger = prepareLedger(
    {
        accounts: [account("chase", "Chase", "USD"), account("bdv", "Banco de Venezuela", "VES")],
        appMeta: [
            { key: "timeZone", value: "America/Caracas" },
            { key: "currency", value: "USD" },
        ],
        budgetPlans: [],
        budgets: [],
        categories: [
            category("groceries", "Groceries"),
            category("refunds", "Groceries", true),
            category("gifts-a", "Gifts"),
            category("gifts-b", "gifts"),
        ],
        exchangeRates: [{ date: "2026-11-01", quote: "JPY", rate: 150, rateType: "official" }],
        installmentPlans: [],
        installments: [],
        mainBudget: [],
        outsideMoves: [],
        outsidePayments: [],
        savingsGoals: [],
        transactions: [],
        transfers: [],
    } as unknown as LedgerBooks,
    LATE
);

const receipt = (patch: Partial<typeof ReceiptDraft.Type> = {}): typeof ReceiptDraft.Type => ({
    accountName: null,
    categoryName: "Groceries",
    currency: null,
    currencySource: "inferred",
    currencyUnresolved: false,
    date: "2026-11-07",
    domain: null,
    income: false,
    items: [],
    merchant: " Costco ",
    paymentMethod: null,
    subtotal: null,
    tax: null,
    tip: null,
    total: 186.77,
    ...patch,
});

const scan = (patch: Partial<typeof ReceiptDraft.Type> = {}) =>
    scannedEntry(ledger, receipt(patch), { accountId: null, at: LATE, fileName: "costco.jpg" });

describe("scannedEntry", () => {
    it("keeps the clock for a receipt from the ledger's today and puts any other day at its noon", () => {
        expect(ledger.today).toBe("2026-11-07");
        const today = scan();
        expect(draftOf(ledger, today.values, null, "").date).toBe(LATE);
        const earlier = scan({ date: "2026-10-28" });
        expect(wallInstant(earlier.values.dateText, ledger)).toBe(Date.parse("2026-10-28T16:00:00Z"));
    });

    it("saves the printed currency's amount at that currency's precision, and falls back when it can't be priced", () => {
        const yen = scan({ currency: "JPY", items: [{ name: "Tea", price: 1234.56, quantity: 2 }], total: 1234.56 });
        expect(draftOf(ledger, yen.values, null, "").amount).toBe(1235);
        expect(yen.values.currencyByHand).toBe(true);
        expect(yen.receipt?.items[0]?.price).toBe(1235);
        const unknown = scan({ currency: null, currencyUnresolved: true });
        expect(unknown.values.currency).toBe("USD");
        expect(draftOf(ledger, unknown.values, null, "").amount).toBe(186.77);
    });

    it("files only under a category of the same kind whose name matches once, and picks the named account", () => {
        expect(scan().values.categoryId).toBe("groceries");
        expect(scan({ income: true }).values.categoryId).toBe("refunds");
        expect(scan({ categoryName: "Gifts" }).values.categoryId).toBeNull();
        const bolivars = scan({ accountName: "banco de venezuela" });
        expect(bolivars.values.accountId).toBe("bdv");
        expect(bolivars.values.currency).toBe("VES");
        expect(bolivars.values.currencyByHand).toBe(false);
    });
});
