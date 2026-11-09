import type { LedgerBooks } from "@outlayr/backend/confect/ledgerView";
import { describe, expect, it } from "vite-plus/test";

import { prepareLedger } from "../../../lib/dashboard-series-ledger";
import { bulkEdited, toAccount, toCategory, toDay } from "./bulk-writes";
import type { BulkChange } from "./bulk-writes";

const NOW = Date.parse("2026-11-08T15:00:00Z");
const OCT = Date.parse("2026-10-01T15:00:00Z");

const envelope = (localId: string) => ({ deletedAt: null, deviceId: "d", localId, seq: 1, updatedAt: 5, userId: "u" });
const account = (localId: string, currency: string) => ({
    ...envelope(localId),
    currency,
    initialBalance: 0,
    initialBalanceDate: 0,
    name: localId,
});
const entry = (localId: string, extra: Record<string, unknown> = {}) => ({
    ...envelope(localId),
    accountId: "chase",
    amount: 100,
    amountUsd: 100,
    categoryId: "food",
    currency: "USD",
    customColor: null,
    date: OCT,
    day: OCT,
    details: null,
    emoji: null,
    exchangeRate: null,
    exchangeRateType: null,
    icon: null,
    imageColor: null,
    imageKey: null,
    income: false,
    month: OCT,
    note: localId,
    onceRecurring: false,
    recurringCoefficient: 1,
    recurringEndDate: null,
    recurringType: 0,
    ...extra,
});
const category = (localId: string, income: boolean) => ({
    ...envelope(localId),
    color: null,
    income,
    name: localId,
    parentId: null,
    sortOrder: 0,
});

const ledgerWith = (transactions: unknown[], installmentPlans: unknown[] = []) =>
    prepareLedger(
        {
            accounts: [account("chase", "USD"), account("amex", "USD"), account("revolut", "EUR")],
            appMeta: [
                { key: "timeZone", value: "America/Caracas" },
                { key: "currency", value: "USD" },
            ],
            budgets: [],
            categories: [category("food", false), category("rent", false), category("pay", true)],
            exchangeRates: [],
            installmentPlans,
            installments: [],
            mainBudget: [],
            outsideMoves: [],
            outsidePayments: [],
            savingsGoals: [],
            transactions,
            transfers: [],
            // SAFETY: rows carry what these rules read, the validators are not under test.
        } as unknown as LedgerBooks,
        NOW
    );

const run = (transactions: unknown[], ids: string[], change: BulkChange, plans: unknown[] = []) =>
    bulkEdited(ledgerWith(transactions, plans), ids, change, () => "fee note", NOW);

const fieldsOf = (rows: ReturnType<typeof run>["rows"], id: string) =>
    new Map(Object.entries(rows.find((row) => row.localId === id)?.fields ?? {}));

describe("bulkEdited", () => {
    it("moves an entry and its card fee to a new account without touching what they cost", () => {
        const fee = entry("fee", { amount: 3, amountUsd: 3, categoryId: null, feeForId: "a", feeRate: null });
        const { count, rows } = run([entry("a"), fee], ["a"], toAccount("amex"));
        expect(count).toBe(1);
        expect(fieldsOf(rows, "a").get("accountId")).toBe("amex");
        expect(fieldsOf(rows, "a").get("amount")).toBe(100);
        expect(fieldsOf(rows, "a").get("amountUsd")).toBe(100);
        expect(fieldsOf(rows, "fee").get("accountId")).toBe("amex");
        expect(fieldsOf(rows, "fee").get("amount")).toBe(3);
    });

    it("keeps an entry's own currency on an account in another one", () => {
        const { rows } = run([entry("a")], ["a"], toAccount("revolut"));
        expect(fieldsOf(rows, "a").get("currency")).toBe("USD");
        expect(fieldsOf(rows, "a").get("amount")).toBe(100);
    });

    it("gives a category only to entries of its kind", () => {
        const { count, rows, skipped } = run(
            [entry("spent"), entry("paid", { categoryId: "pay", income: true })],
            ["spent", "paid"],
            toCategory("rent", false)
        );
        expect([count, skipped]).toStrictEqual([1, 1]);
        expect(fieldsOf(rows, "spent").get("categoryId")).toBe("rent");
        expect(rows.some((row) => row.localId === "paid")).toBe(false);
    });

    it("skips what the drawer would not edit: transfers, their fees, card fees and financed entries", () => {
        const { count, rows, skipped } = run(
            [
                entry("plain"),
                entry("charge", { installmentId: "i" }),
                entry("bought"),
                entry("card", { feeForId: "plain" }),
                entry("wire", { transferId: "t" }),
            ],
            ["a-transfer", "charge", "bought", "card", "wire", "plain"],
            toAccount("amex"),
            [{ ...envelope("p"), transactionId: "bought" }]
        );
        expect([count, skipped]).toStrictEqual([1, 5]);
        expect(rows.map((row) => row.localId)).not.toContain("wire");
        expect(rows.map((row) => row.localId)).not.toContain("charge");
    });

    it("moves to the ledger's day and keeps each entry's time, across the UTC midnight", () => {
        // 22:30 on Sep 30 in Caracas, already Oct 1 in UTC.
        const late = entry("late", { date: Date.parse("2026-10-01T02:30:00Z") });
        const { rows } = run([late], ["late"], toDay("2026-10-20"));
        const fields = fieldsOf(rows, "late");
        expect(fields.get("date")).toBe(Date.parse("2026-10-21T02:30:00Z"));
        expect(fields.get("day")).toBe(Date.parse("2026-10-20T04:00:00Z"));
        expect(fields.get("month")).toBe(Date.parse("2026-10-01T04:00:00Z"));
    });
});
