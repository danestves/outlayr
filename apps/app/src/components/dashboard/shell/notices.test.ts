import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import { expect, it } from "vite-plus/test";

import { prepareLedger } from "@/lib/dashboard-series-ledger";
import type { LedgerBooks } from "@/lib/ledger-books";
import { EMPTY_RECURRING, recurringModel } from "@/lib/recurring";

import { feedOf, isUnread, noticesOf } from "./notices";

// 11:00 on Nov 10 in Caracas (UTC-4).
const NOW = Date.parse("2026-11-10T15:00:00Z");
const DUE = ["2026-10-01", "2026-11-01", "2026-11-10", "2026-12-01"] as const;

const envelope = (localId: string) => ({ deletedAt: null, deviceId: "d", localId, seq: 1, updatedAt: 0, userId: "u" });

const entry = (localId: string, note: string, day: string, recurringType: number) => ({
    ...envelope(localId),
    accountId: "card",
    amount: 400,
    amountUsd: 400,
    categoryId: null,
    currency: "USD",
    date: Date.parse(`${day}T16:00:00Z`),
    income: false,
    note,
    onceRecurring: recurringType !== RECURRING_TYPE.none,
    recurringCoefficient: 1,
    recurringEndDate: null,
    recurringType,
});

function ledgerWith({ deskRepeats = false, planned = true, rent = true } = {}) {
    return prepareLedger(
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
            appMeta: [
                { key: "timeZone", value: "America/Caracas" },
                { key: "currency", value: "USD" },
            ],
            budgetPlans: [],
            budgets: [],
            categories: [],
            exchangeRates: [],
            installmentPlans: planned
                ? [{ ...envelope("plan"), accountId: "card", dateCreated: 0, transactionId: "desk" }]
                : [],
            installments: planned
                ? DUE.map((day, index) => ({
                      ...envelope(`i${index + 1}`),
                      amount: 100,
                      dueDate: Date.parse(`${day}T16:00:00Z`),
                      planId: "plan",
                      sequence: index + 1,
                  }))
                : [],
            mainBudget: [],
            outsideMoves: [],
            outsidePayments: planned
                ? [
                      {
                          ...envelope("out"),
                          amount: 100,
                          amountUsd: 100,
                          date: Date.parse("2026-10-01T16:00:00Z"),
                          planId: "plan",
                      },
                  ]
                : [],
            savingsGoals: [],
            transactions: [
                entry("desk", "Desk", "2026-09-10", deskRepeats ? RECURRING_TYPE.monthly : RECURRING_TYPE.none),
                ...(rent ? [entry("rent", "Rent", "2026-10-10", RECURRING_TYPE.monthly)] : []),
            ],
            transfers: [],
            // SAFETY: rows carry what the readers read, the validators are not under test.
        } as unknown as LedgerBooks,
        NOW
    );
}

const noticesWith = (options?: Parameters<typeof ledgerWith>[0]) => {
    const ledger = ledgerWith(options);
    return noticesOf(
        ledger,
        recurringModel(ledger, EMPTY_RECURRING, (seed) => seed.note)
    );
};

const TODAY_STARTS = Date.parse("2026-11-10T04:00:00Z");

it("lists due recurring charges and unpaid installments due by today, newest first", () => {
    expect(noticesWith().map((notice) => notice.id)).toEqual([
        "installment:i3",
        "recurring:rent:2026-11-10",
        "installment:i2",
    ]);
});

it("shows a financed purchase that also repeats once, as its installment", () => {
    const ids = noticesWith({ deskRepeats: true }).map((notice) => notice.id);
    expect(ids.filter((id) => id.startsWith("recurring:desk"))).toEqual([]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("installment:i3");
});

it("counts a notice as arrived at midnight in the ledger's zone, not UTC", () => {
    const today = noticesWith().at(0);
    if (today === undefined) {
        throw new Error("No notice is due today");
    }
    expect(isUnread(today, TODAY_STARTS - 60_000)).toBe(true);
    expect(isUnread(today, TODAY_STARTS + 60_000)).toBe(false);
});

it("has nothing to show and no dot when nothing is due", () => {
    expect(feedOf(noticesWith({ planned: false, rent: false }), null)).toEqual({
        notices: [],
        seenAt: null,
        unread: 0,
    });
});

it("dots everything until the panel is first opened, and nothing once opened after the newest arrival", () => {
    const notices = noticesWith();
    expect(feedOf(notices, null).unread).toBe(3);
    expect(feedOf(notices, String(TODAY_STARTS - 1)).unread).toBe(2);
    expect(feedOf(notices, String(NOW)).unread).toBe(0);
});
