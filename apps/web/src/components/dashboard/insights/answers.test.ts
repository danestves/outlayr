import type { LedgerBooks } from "@outlayr/backend/confect/ledgerView";
import type { Doc, TableNames } from "@outlayr/backend/convex/_generated/dataModel";
import { BUDGET_TYPE } from "@outlayr/money/budget-window";
import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import { describe, expect, it } from "vite-plus/test";

import { categoryBudgets } from "../../../lib/dashboard-series";
import type { CategoryBudget } from "../../../lib/dashboard-series";
import { prepareLedger } from "../../../lib/dashboard-series-ledger";
import { periodOf } from "../../../lib/dashboard-series-period";
import { compareToUsual, standouts, usualSpend } from "./answers";

const at = (iso: string) => Date.parse(iso);
const NOW = at("2026-10-20T15:00:00Z");
const ALL = { accounts: [] } as const;

let sequence = 0;
const docOf = <Table extends TableNames>(row: Omit<Doc<Table>, "_creationTime" | "_id">) =>
    ({ _creationTime: 0, _id: `doc-${(sequence += 1)}`, ...row }) as unknown as Doc<Table>;
const envelope = (localId: string) => {
    sequence += 1;
    return { deletedAt: null, deviceId: "device", localId, seq: sequence, updatedAt: 0, userId: "owner" };
};

const category = (localId: string, name: string, color: string | null, parentId: string | null = null) =>
    docOf<"categories">({
        ...envelope(localId),
        color,
        dateCreated: 0,
        emoji: null,
        icon: null,
        income: false,
        name,
        parentId,
        sortOrder: 0,
    });

const budget = (categoryId: string, limit: number) =>
    docOf<"budgets">({
        ...envelope(`budget-${categoryId}`),
        amount: limit,
        amountUsd: limit,
        categoryId,
        currency: "USD",
        dateCreated: 0,
        green: false,
        name: null,
        rollover: false,
        startDate: at("2026-10-01T04:00:00Z"),
        type: BUDGET_TYPE.month,
    });

const entry = (localId: string, iso: string, amount: number, categoryId: string) =>
    docOf<"transactions">({
        ...envelope(localId),
        accountId: "chase",
        amount,
        amountUsd: amount,
        categoryId,
        currency: "USD",
        customColor: null,
        date: at(iso),
        day: at(iso),
        details: null,
        emoji: null,
        exchangeRate: null,
        exchangeRateType: null,
        icon: null,
        imageColor: null,
        imageKey: null,
        income: false,
        month: 0,
        note: "",
        onceRecurring: false,
        recurringCoefficient: 1,
        recurringEndDate: null,
        recurringType: RECURRING_TYPE.none,
    });

const booksWith = (transactions: LedgerBooks["transactions"], fields: Partial<LedgerBooks> = {}): LedgerBooks => ({
    accounts: [],
    appMeta: [{ key: "timeZone", value: "UTC" }],
    budgets: [],
    categories: [category("rent", "Rent", "#e2643f"), category("food", "Groceries", "#4f9d69")],
    exchangeRates: [],
    installmentPlans: [],
    mainBudget: [],
    outsideMoves: [],
    outsidePayments: [],
    transactions,
    transfers: [],
    ...fields,
});

const history = [
    entry("jun", "2026-06-20T12:00:00Z", 5, "rent"),
    entry("jul", "2026-07-05T12:00:00Z", 100, "food"),
    entry("aug", "2026-08-05T12:00:00Z", 200, "food"),
    entry("sep", "2026-09-05T12:00:00Z", 300, "food"),
    entry("sep-late", "2026-09-28T12:00:00Z", 9000, "food"),
    entry("sep-rent", "2026-09-01T12:00:00Z", 1850, "rent"),
    entry("oct-rent", "2026-10-01T12:00:00Z", 1850, "rent"),
    entry("oct-food", "2026-10-08T12:00:00Z", 500, "food"),
];

const october = periodOf("2026-10", 1);

const blown: CategoryBudget = {
    effectiveLimit: 400,
    from: "2026-10-01",
    limit: 400,
    overBudget: true,
    period: "month",
    remaining: -100,
    runOut: null,
    spent: 500,
    to: "2026-10-31",
};

describe("usualSpend", () => {
    it("stays empty until three earlier periods have spending", () => {
        const ledger = prepareLedger(booksWith(history.filter((row) => row.date >= at("2026-08-01T00:00:00Z"))), NOW);
        expect(usualSpend(ledger, october, ALL)).toBeNull();
    });

    it("averages the same days of earlier periods and ignores what came after", () => {
        const usual = usualSpend(prepareLedger(booksWith(history), NOW), october, ALL);
        expect(usual?.byCategory.get("food")).toBe(200);
        expect(usual?.active.get("food")).toBe(3);
    });
});

describe("standouts", () => {
    const ledger = prepareLedger(booksWith(history, { budgets: [budget("food", 400)] }), NOW);
    const usual = usualSpend(ledger, october, ALL);

    it("flags a category far from its usual when it has no budget", () => {
        expect(standouts(ledger, october, ALL, new Map(), usual)).toEqual([
            { categoryId: "food", gap: 300, impact: 300, kind: "versus", under: false, usual: 200 },
        ]);
    });

    it("leaves a budgeted category to its budget card and ranks by impact", () => {
        const cards = standouts(ledger, october, ALL, new Map([["food", blown]]), usual);
        expect(cards).toHaveLength(1);
        expect(cards[0]).toMatchObject({ categoryId: "food", impact: 100, kind: "overBudget" });
    });
});

describe("a budget on a subcategory", () => {
    const withSnacks = prepareLedger(
        booksWith(
            [
                entry("snack-1", "2026-10-09T12:00:00Z", 40, "snacks"),
                entry("snack-2", "2026-10-12T12:00:00Z", 30, "snacks"),
                entry("food", "2026-10-08T12:00:00Z", 500, "food"),
            ],
            {
                budgets: [budget("snacks", 50)],
                categories: [category("food", "Groceries", "#4f9d69"), category("snacks", "Snacks", null, "food")],
            }
        ),
        NOW
    );

    it("stands out under its own name, with its own biggest purchase, and opens its parent", () => {
        const budgets = categoryBudgets(withSnacks, october);
        const [card] = standouts(withSnacks, october, ALL, budgets, null);

        expect(card).toMatchObject({
            biggest: { amount: 40, day: "2026-10-09" },
            categoryId: "snacks",
            impact: 20,
            kind: "overBudget",
        });
        expect(withSnacks.budgetTargets.get("snacks")).toStrictEqual({
            color: "#4f9d69",
            id: "snacks",
            name: "Snacks",
            topId: "food",
        });
    });
});

describe("compareToUsual", () => {
    it("says nothing without a usual and calls a near match as usual", () => {
        expect(compareToUsual(100, null)).toBeNull();
        expect(compareToUsual(100.4, 100)).toEqual({ kind: "asUsual" });
        expect(compareToUsual(104, 100)).toEqual({ kind: "more", percent: 4 });
        expect(compareToUsual(60, 100)).toEqual({ kind: "less", percent: 40 });
    });
});
