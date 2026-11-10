import { ledgerGlance } from "@outlayr/money/ledger-view";
import { describe, expect, it } from "vite-plus/test";

import type { LedgerBooks } from "@/lib/ledger-books";

import { prepareLedger } from "../../../lib/dashboard-series-ledger";
import { accountRows } from "../accounts/model";
import { contributions, editedGoal, goalViews, monthlyAdded, standingOf } from "./model";
import type { Goal } from "./model";

const DAY_MS = 86_400_000;
const NOW = Date.parse("2026-11-08T15:00:00Z");

const envelope = (localId: string) => ({
    deletedAt: null,
    deviceId: "device",
    localId,
    seq: 1,
    updatedAt: 0,
    userId: "owner",
});

const goal = (localId: string, fields: Partial<Goal> = {}) =>
    ({
        ...envelope(localId),
        accountId: "savings",
        currency: "USD",
        dateCreated: Date.parse("2026-01-01T12:00:00Z"),
        exchangeRate: null,
        name: localId,
        sortOrder: 0,
        startAmount: 1000,
        startAmountUsd: 1000,
        targetAmount: 10_000,
        targetAmountUsd: 10_000,
        targetDate: Date.parse("2027-01-01T12:00:00Z"),
        ...fields,
    }) as Goal;

const deposit = (localId: string, date: string, amount: number, income = true) => ({
    ...envelope(localId),
    accountId: "savings",
    amount,
    amountUsd: amount,
    categoryId: null,
    currency: "USD",
    date: Date.parse(date),
    day: 0,
    exchangeRate: null,
    income,
    note: localId,
    onceRecurring: false,
    recurringCoefficient: 1,
    recurringEndDate: null,
    recurringType: 0,
});

function views(
    savingsGoals: Goal[],
    transactions: ReturnType<typeof deposit>[] = [],
    account: { currency: string; initialBalance: number } = { currency: "USD", initialBalance: 1000 }
) {
    const books = {
        accounts: [
            {
                ...envelope("savings"),
                ...account,
                initialBalanceDate: Date.parse("2025-12-01T12:00:00Z"),
                initialBalanceUsd: 1000,
                name: "Savings",
            },
        ],
        appMeta: [{ key: "timeZone", value: "UTC" }],
        budgets: [],
        categories: [],
        exchangeRates: [],
        installmentPlans: [],
        installments: [],
        mainBudget: [],
        outsideMoves: [],
        outsidePayments: [],
        savingsGoals,
        transactions,
        transfers: [],
    } as unknown as LedgerBooks;
    const ledger = prepareLedger(books, NOW);
    return { ledger, views: goalViews(ledger, accountRows(ledger, ledgerGlance(books, NOW))) };
}

describe("goal views", () => {
    it("leaves out deleted goals and payoff plans, which store a zero target", () => {
        const found = views([
            goal("trip"),
            goal("gone", { deletedAt: NOW - DAY_MS }),
            goal("payoff", { targetAmount: 0, targetAmountUsd: 0 }),
        ]).views;
        expect(found.map((view) => view.id)).toStrictEqual(["trip"]);
    });

    it("does not call a goal reached by comparing a balance with no rate against a target in another currency", () => {
        const [view] = views([goal("trip")], [], { currency: "JPY", initialBalance: 500_000 }).views;
        expect(view?.progress).toMatchObject({ fraction: 0, reached: false });
    });

    it("reads a goal that saved slower than the line from its start as behind", () => {
        const [view] = views([goal("trip")], [deposit("pay", "2026-03-01T12:00:00Z", 500)]).views;
        expect(view && standingOf(view)).toMatchObject({ kind: "behind" });
    });

    it("reads a goal past the line as ahead", () => {
        const [view] = views([goal("trip")], [deposit("pay", "2026-03-01T12:00:00Z", 8000)]).views;
        expect(view && standingOf(view)).toMatchObject({ kind: "ahead" });
    });
});

describe("contributions", () => {
    it("lists money in since the goal began, newest first, with the balance right after each", () => {
        const { ledger, views: found } = views(
            [goal("trip")],
            [
                deposit("before", "2025-12-15T12:00:00Z", 400),
                deposit("first", "2026-02-01T12:00:00Z", 200),
                deposit("rent", "2026-03-01T12:00:00Z", 50, false),
                deposit("second", "2026-04-01T12:00:00Z", 300),
            ]
        );
        const [view] = found;
        expect(
            view && contributions(ledger, view).map(({ added, balance, day }) => ({ added, balance, day }))
        ).toStrictEqual([
            { added: 300, balance: 1850, day: "2026-04-01" },
            { added: 200, balance: 1600, day: "2026-02-01" },
        ]);
    });
});

describe("monthly added", () => {
    it("leaves out money that came in earlier in the month the goal began", () => {
        const { ledger, views: found } = views(
            [goal("trip", { dateCreated: Date.parse("2026-10-20T12:00:00Z") })],
            [deposit("before", "2026-10-05T12:00:00Z", 400), deposit("after", "2026-10-25T12:00:00Z", 150)]
        );
        const [view] = found;
        expect(view && monthlyAdded(ledger, view)[0]).toMatchObject({ added: 150, month: "2026-10" });
    });
});

describe("edited goal", () => {
    const books = { exchangeRates: [] } as unknown as Pick<LedgerBooks, "exchangeRates">;
    const euros = goal("trip", { currency: "EUR", exchangeRate: 0.8, targetAmount: 800, targetAmountUsd: 1000 });

    it("values a new target through the goal's own rate, not today's", () => {
        const row = editedGoal(books, euros, { name: "Trip", targetAmount: 1600, targetDate: NOW }, NOW);
        expect(row?.fields).toMatchObject({ targetAmount: 1600, targetAmountUsd: 2000 });
    });

    it("keeps the stored USD value when the target did not change", () => {
        const stored = { ...euros, targetAmountUsd: 1003.17 };
        const row = editedGoal(books, stored, { name: "Renamed", targetAmount: 800, targetDate: NOW }, NOW);
        expect(row?.fields).toMatchObject({ name: "Renamed", targetAmountUsd: 1003.17 });
    });
});
