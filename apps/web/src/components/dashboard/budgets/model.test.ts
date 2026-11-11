import type { Doc } from "@outlayr/backend/convex/_generated/dataModel";
import { BUDGET_TYPE } from "@outlayr/money/budget-window";
import { describe, expect, it } from "vite-plus/test";

import { prepareLedger } from "@/lib/dashboard-series-ledger";
import { periodOf } from "@/lib/dashboard-series-period";
import type { LedgerBooks } from "@/lib/ledger-books";

import { budgetDetail, budgetsOverview, limitPreview } from "./model";

const NOW = Date.parse("2026-11-10T15:00:00Z");

const category = (localId: string, parentId: string | null = null) =>
    ({
        color: "#336699",
        dateCreated: 0,
        deletedAt: null,
        emoji: null,
        icon: null,
        income: false,
        localId,
        name: localId,
        parentId,
        sortOrder: 0,
    }) as unknown as Doc<"categories">;

const entry = (localId: string, categoryId: string, day: string, amount: number, income = false) =>
    ({
        accountId: "a",
        amount,
        amountUsd: amount,
        categoryId,
        currency: "USD",
        date: Date.parse(`${day}T12:00:00Z`),
        day: Date.parse(`${day}T00:00:00Z`),
        deletedAt: null,
        income,
        localId,
        note: "",
        recurringType: 0,
    }) as unknown as Doc<"transactions">;

const foodLimit = {
    amount: 300,
    amountUsd: 300,
    categoryId: "food",
    currency: "USD",
    dateCreated: 0,
    deletedAt: null,
    green: false,
    localId: "food-limit",
    name: null,
    rollover: false,
    startDate: Date.parse("2026-11-01T00:00:00Z"),
    type: BUDGET_TYPE.month,
} as unknown as Doc<"budgets">;

const ledgerWith = (budgets: Doc<"budgets">[]) =>
    prepareLedger(
        {
            accounts: [],
            appMeta: [{ key: "timeZone", value: "UTC" }],
            budgetPlans: [],
            budgets,
            categories: [category("food"), category("groceries", "food"), category("fun"), category("salary")],
            exchangeRates: [],
            installmentPlans: [],
            installments: [],
            mainBudget: [],
            outsideMoves: [],
            outsidePayments: [],
            savingsGoals: [],
            transactions: [
                entry("sep", "food", "2026-09-12", 200),
                entry("oct", "food", "2026-10-08", 100),
                entry("groceries", "groceries", "2026-11-03", 200),
                entry("dinner", "food", "2026-11-05", 150),
                entry("cinema", "fun", "2026-11-06", 50),
                entry("pay", "salary", "2026-11-01", 3000, true),
            ],
            transfers: [],
        } satisfies LedgerBooks,
        NOW
    );

const ledger = ledgerWith([foodLimit]);

describe("budgetsOverview", () => {
    const overview = budgetsOverview(ledger, periodOf("2026-11", 1));

    it("counts a subcategory's spending against its parent's limit", () => {
        expect(overview.lines.map((line) => [line.categoryId, line.standing.spent, line.status])).toStrictEqual([
            ["food", 350, "over"],
        ]);
        expect(overview.totals).toMatchObject({ onTrack: 0, over: 1, spent: 350 });
    });

    it("counts a child's limit inside its parent's once in the totals", () => {
        const groceriesLimit = { ...foodLimit, amount: 100, categoryId: "groceries", localId: "groceries-limit" };
        const nested = budgetsOverview(ledgerWith([foodLimit, groceriesLimit]), periodOf("2026-11", 1));
        expect(nested.lines).toHaveLength(2);
        expect(nested.totals).toMatchObject({ limits: 300, spent: 350 });
        expect(nested.pace).toMatchObject({ limit: 300, spent: 350 });
    });

    it("counts a child's days outside a shorter parent window against the child's share of its limit", () => {
        const weeklyFood = { ...foodLimit, startDate: Date.parse("2026-11-08T00:00:00Z"), type: BUDGET_TYPE.week };
        const groceriesLimit = { ...foodLimit, amount: 90, categoryId: "groceries", localId: "groceries-limit" };
        const mixed = budgetsOverview(ledgerWith([weeklyFood, groceriesLimit]), periodOf("2026-11", 1));
        expect(mixed.totals).toMatchObject({ limits: 369, spent: 200 });
        expect(mixed.pace).toMatchObject({ limit: 369, spent: 200 });
    });

    it("leaves a child's spending after the month being read out of its totals", () => {
        const yearlyGroceries = {
            ...foodLimit,
            categoryId: "groceries",
            localId: "groceries-limit",
            startDate: Date.parse("2026-01-01T00:00:00Z"),
            type: BUDGET_TYPE.year,
        };
        const september = budgetsOverview(ledgerWith([foodLimit, yearlyGroceries]), periodOf("2026-09", 1));
        expect(september.totals.spent).toBe(200);
        expect(september.pace?.spent).toBe(200);
    });

    it("leaves a limited subcategory's spending out of its unlimited parent's open line", () => {
        const groceriesLimit = { ...foodLimit, categoryId: "groceries", localId: "groceries-limit" };
        const { open } = budgetsOverview(ledgerWith([groceriesLimit]), periodOf("2026-11", 1));
        expect(open.map((line) => [line.categoryId, line.spent])).toStrictEqual([
            ["food", 150],
            ["fun", 50],
        ]);
    });

    it("leaves budgeted categories and income out of the open spending", () => {
        expect(overview.open.map((line) => [line.categoryId, line.spent, line.share])).toStrictEqual([
            ["fun", 50, 50 / 400],
        ]);
        expect(overview.totals.total).toBe(400);
    });
});

describe("a limit anchored on the running window, as a phone keeps it", () => {
    it("reads an earlier month's own window", () => {
        const [food] = budgetsOverview(ledger, periodOf("2026-09", 1)).lines;
        expect(food?.standing).toMatchObject({ from: "2026-09-01", spent: 200, to: "2026-09-30" });
    });
});

describe("budgetDetail", () => {
    it("counts today and every day after it in the running window, all of one not yet open", () => {
        expect(budgetDetail(ledger, "food", periodOf("2026-11", 1))?.daysLeft).toBe(21);
        const ahead = budgetDetail(ledger, "food", periodOf("2026-12", 1));
        expect(ahead).toMatchObject({ daysLeft: 31, phase: "ahead", rows: [], selected: -1 });
    });

    it("reads a closed window from its own history when it is beyond the running one's bars", () => {
        const june = budgetDetail(ledger, "food", periodOf("2026-06", 1));
        expect(june?.history.at(-1)?.from).toBe("2026-06-01");
        expect(june?.selected).toBe((june?.history.length ?? 0) - 1);
        expect(june?.daysLeft).toBe(0);
    });

    it("takes the typical spend from closed windows before the one being read", () => {
        expect(budgetDetail(ledger, "food", periodOf("2026-10", 1))?.typical.amount).toBe(200);
    });
});

describe("limitPreview", () => {
    it("counts the closed windows a draft limit would have run over", () => {
        const preview = limitPreview(ledger, "food", { amount: 120, startDay: null, type: BUDGET_TYPE.month });
        expect(preview).toMatchObject({ closed: 4, current: { spent: 350 }, daysLeft: 21, over: 1 });
    });

    it("gives no verdict over windows that spent nothing", () => {
        const yearly = limitPreview(ledger, "food", { amount: 120, startDay: null, type: BUDGET_TYPE.year });
        expect(yearly).toMatchObject({ closed: 4, over: null });
    });
});
