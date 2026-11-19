import { expect, it } from "vite-plus/test";

import { prepareLedger } from "@/lib/dashboard-series-ledger";
import type { LedgerBooks } from "@/lib/ledger-books";
import { EMPTY_RECURRING, recurringModel } from "@/lib/recurring";

import { isUnread, noticesOf } from "./notices";

const NOW = Date.parse("2026-11-10T15:00:00Z");
const DUE = ["2026-10-01", "2026-11-01", "2026-11-10", "2026-12-01"] as const;

const envelope = (localId: string) => ({ deletedAt: null, deviceId: "d", localId, seq: 1, updatedAt: 0, userId: "u" });

const ledger = prepareLedger(
    {
        accounts: [
            {
                ...envelope("card"),
                currency: "USD",
                initialBalance: 0,
                initialBalanceDate: 0,
                kind: "liability",
                name: "card",
            },
        ],
        appMeta: [{ key: "timeZone", value: "America/Caracas" }],
        budgetPlans: [],
        budgets: [],
        categories: [],
        exchangeRates: [],
        installmentPlans: [{ ...envelope("plan"), accountId: "card", dateCreated: 0, transactionId: "desk" }],
        installments: DUE.map((day, index) => ({
            ...envelope(`i${index + 1}`),
            amount: 100,
            dueDate: Date.parse(`${day}T16:00:00Z`),
            planId: "plan",
            sequence: index + 1,
        })),
        mainBudget: [],
        outsideMoves: [],
        outsidePayments: [
            {
                ...envelope("out"),
                amount: 100,
                amountUsd: 100,
                date: Date.parse("2026-10-01T16:00:00Z"),
                planId: "plan",
            },
        ],
        savingsGoals: [],
        transactions: [
            {
                ...envelope("desk"),
                accountId: "card",
                amount: 400,
                amountUsd: 400,
                categoryId: null,
                currency: "USD",
                date: Date.parse("2026-09-01T16:00:00Z"),
                income: false,
                note: "Desk",
            },
        ],
        transfers: [],
        // SAFETY: rows carry what the plan reader reads, the validators are not under test.
    } as unknown as LedgerBooks,
    NOW
);

const notices = noticesOf(
    ledger,
    recurringModel(ledger, EMPTY_RECURRING, () => "")
);

it("lists unpaid installments due by today, newest first", () => {
    expect(notices.map((notice) => [notice.id, notice.day])).toEqual([
        ["installment:i3", "2026-11-10"],
        ["installment:i2", "2026-11-01"],
    ]);
});

it("counts a notice as arrived at midnight in the ledger's zone, not UTC", () => {
    const today = notices.at(0);
    if (today === undefined) {
        throw new Error("No notice is due today");
    }
    expect(isUnread(today, Date.parse("2026-11-10T03:59:00Z"))).toBe(true);
    expect(isUnread(today, Date.parse("2026-11-10T04:01:00Z"))).toBe(false);
});
