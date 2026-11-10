import { describe, expect, it } from "vite-plus/test";

import type { LedgerBooks } from "@/lib/ledger-books";

import { prepareLedger } from "../../../lib/dashboard-series-ledger";
import { accountEntries, billedApart, cardStatement, checkedAge, statementCycle } from "./model";

describe("account entries", () => {
    const at = Date.parse("2026-11-05T14:00:00Z");
    const envelope = (localId: string) => ({
        deletedAt: null,
        deviceId: "device",
        localId,
        seq: 1,
        updatedAt: 0,
        userId: "owner",
    });
    const ledger = prepareLedger(
        {
            accounts: [
                { ...envelope("chase"), currency: "USD", initialBalance: 0, initialBalanceDate: 0, name: "Chase" },
            ],
            appMeta: [{ key: "timeZone", value: "UTC" }],
            budgets: [],
            categories: [],
            exchangeRates: [],
            installmentPlans: [],
            installments: [],
            mainBudget: [],
            outsideMoves: [
                {
                    ...envelope("found"),
                    accountId: "chase",
                    adjustment: true,
                    amount: 5,
                    amountUsd: 5,
                    currency: "USD",
                    date: at,
                },
            ],
            outsidePayments: [],
            savingsGoals: [],
            transactions: [
                {
                    ...envelope("rent"),
                    accountId: "chase",
                    amount: 900,
                    amountUsd: 900,
                    categoryId: null,
                    currency: "USD",
                    date: at,
                    day: 0,
                    exchangeRate: null,
                    income: false,
                    note: "Rent",
                    onceRecurring: false,
                    recurringCoefficient: 1,
                    recurringEndDate: null,
                    recurringType: 0,
                },
            ],
            transfers: [],
        } as unknown as LedgerBooks,
        Date.parse("2026-11-08T15:00:00Z")
    );

    it("points a row back at its ledger id, and only opens what the ledger can act on", () => {
        const entries = accountEntries(ledger, "chase", "2026-11-01", "2026-11-30");
        expect(
            entries.map(({ outside, rowId }) => ({ outside, rowId })).toSorted((a, b) => a.rowId.localeCompare(b.rowId))
        ).toStrictEqual([
            { outside: true, rowId: "found" },
            { outside: false, rowId: "rent" },
        ]);
    });
});

describe("statement cycle", () => {
    it("closes this month once the statement day has passed", () => {
        expect(statementCycle(25, 20, "2026-11-08")).toStrictEqual({
            closedOn: "2026-10-25",
            dueOn: "2026-11-20",
            nextCloseOn: "2026-11-25",
        });
        expect(statementCycle(5, 25, "2026-11-08")).toStrictEqual({
            closedOn: "2026-11-05",
            dueOn: "2026-11-25",
            nextCloseOn: "2026-12-05",
        });
    });

    it("clamps day 31 to short months and crosses the year", () => {
        expect(statementCycle(31, 31, "2026-03-01")).toStrictEqual({
            closedOn: "2026-02-28",
            dueOn: "2026-03-31",
            nextCloseOn: "2026-03-31",
        });
        expect(statementCycle(10, 5, "2026-01-08")).toStrictEqual({
            closedOn: "2025-12-10",
            dueOn: "2026-01-05",
            nextCloseOn: "2026-01-10",
        });
    });
});

describe("card statement", () => {
    const card = {
        currency: "USD",
        initialBalance: -200,
        openedDay: "2026-01-01",
        paymentDay: 20,
        statementDay: 25,
    };

    it("asks for the debt at the close less payments since", () => {
        const flows = [
            { day: "2026-10-03", value: -1440.3 },
            { day: "2026-10-26", value: 300 },
            { day: "2026-11-02", value: -82.45 },
        ];
        expect(cardStatement(card, flows, "2026-11-08", [])).toMatchObject({
            due: 1340.3,
            overdue: false,
            since: 82.45,
        });
    });

    it("never asks for less than zero and turns overdue after the due day", () => {
        expect(cardStatement(card, [{ day: "2026-10-28", value: 900 }], "2026-11-08", [])?.due).toBe(0);
        expect(cardStatement(card, [], "2026-11-21", [])).toMatchObject({ due: 200, overdue: true });
    });

    it("leaves out installments billed after the due day, unless bought after the close", () => {
        const later = { day: "2026-12-14", remaining: 150, sequence: 2 };
        const billed = { day: "2026-11-14", remaining: 50, sequence: 1 };
        const rows = [billed, later];
        const flows = [{ day: "2026-10-03", value: -600 }];
        expect(cardStatement(card, flows, "2026-11-08", [{ purchaseDay: "2026-10-03", rows }])?.due).toBe(650);
        expect(cardStatement(card, flows, "2026-11-08", [{ purchaseDay: "2026-10-30", rows }])?.due).toBe(800);
        expect(cardStatement(card, flows, "2026-11-08", [{ purchaseDay: null, rows }])?.due).toBe(800);
    });

    it("lists apart exactly what the payment leaves out, so nothing owed counts twice", () => {
        const later = { day: "2026-12-14", remaining: 150, sequence: 2 };
        const billed = { day: "2026-11-14", remaining: 50, sequence: 1 };
        const rows = [billed, later];
        const cycle = { closedOn: "2026-10-25", dueOn: "2026-11-20" };
        expect(billedApart({ purchaseDay: "2026-10-03", rows }, cycle)).toStrictEqual([later]);
        expect(billedApart({ purchaseDay: "2026-10-30", rows }, cycle)).toStrictEqual(rows);
        expect(billedApart({ purchaseDay: null, rows }, cycle)).toStrictEqual([]);
    });

    it("shows no amount when the card is newer than the close", () => {
        expect(cardStatement({ ...card, openedDay: "2026-11-01" }, [], "2026-11-08", [])?.due).toBeNull();
    });
});

describe("checked age", () => {
    const caracas = { offsetAt: () => -4 * 60 * 60 * 1000, today: "2026-11-08" };

    it("counts local days, not 24 hour spans", () => {
        expect(checkedAge(Date.parse("2026-11-08T03:00:00Z"), caracas)).toStrictEqual({
            state: "yesterday",
        });
        expect(checkedAge(Date.parse("2026-11-08T05:00:00Z"), caracas)).toStrictEqual({
            state: "today",
        });
    });

    it("goes stale after a week", () => {
        expect(checkedAge(Date.parse("2026-11-01T15:00:00Z"), caracas)).toStrictEqual({
            days: 7,
            state: "daysAgo",
        });
        expect(checkedAge(Date.parse("2026-10-31T15:00:00Z"), caracas)).toStrictEqual({
            days: 8,
            state: "stale",
        });
        expect(checkedAge(null, caracas)).toStrictEqual({ state: "never" });
    });
});
