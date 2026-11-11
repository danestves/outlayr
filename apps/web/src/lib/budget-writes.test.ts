import { BUDGET_TYPE } from "@outlayr/money/budget-window";
import { fixedOffset } from "@outlayr/money/ledger-zone";
import { describe, expect, it } from "vite-plus/test";

import type { Budget, BudgetDraft } from "./budget-writes";
import { budgetPlanId, createdBudget, editedBudget, plannedMonths, windowAnchorDay } from "./budget-writes";
import { prepareLedger, startOfDay } from "./dashboard-series-ledger";
import type { LedgerBooks } from "./ledger-books";

const HOUR = 3_600_000;
const NOW = Date.UTC(2026, 10, 10, 18);
const EARLIER = NOW - 1000;

const books = (extra: Partial<LedgerBooks> = {}): LedgerBooks => ({
    accounts: [],
    appMeta: [],
    budgetPlans: [],
    budgets: [],
    categories: [],
    exchangeRates: [],
    installmentPlans: [],
    installments: [],
    mainBudget: [],
    outsideMoves: [],
    outsidePayments: [],
    savingsGoals: [],
    transactions: [],
    transfers: [],
    ...extra,
});

const ledgerOf = (extra: Partial<LedgerBooks> = {}) => ({
    ...prepareLedger(books(extra), NOW),
    currency: "EUR",
    firstDayOfMonth: 15,
    firstWeekday: 2,
    offsetAt: fixedOffset(-5 * HOUR),
    today: "2026-11-10",
});

const ledger = ledgerOf();

const budget = (extra: Partial<Budget> = {}) =>
    ({
        amount: 300,
        amountUsd: 300,
        categoryId: "food",
        currency: "USD",
        dateCreated: EARLIER,
        deletedAt: null,
        green: false,
        localId: "food-limit",
        name: null,
        rollover: false,
        startDate: startOfDay(ledger, "2026-10-15"),
        type: BUDGET_TYPE.month,
        updatedAt: EARLIER,
        ...extra,
    }) as Budget;

const draft = (extra: Partial<BudgetDraft> = {}): BudgetDraft => ({
    amount: 300,
    name: "",
    rollover: false,
    startDay: null,
    type: BUDGET_TYPE.month,
    ...extra,
});

describe("windowAnchorDay", () => {
    it("opens a month on the ledger's first day, in the month it already started", () => {
        expect(windowAnchorDay("2026-11-10", BUDGET_TYPE.month, ledger)).toBe("2026-10-15");
        expect(windowAnchorDay("2026-11-15", BUDGET_TYPE.month, ledger)).toBe("2026-11-15");
    });

    it("opens a week on the ledger's first weekday", () => {
        expect(windowAnchorDay("2026-11-10", BUDGET_TYPE.week, ledger)).toBe("2026-11-09");
        expect(windowAnchorDay("2026-11-10", BUDGET_TYPE.week, { ...ledger, firstWeekday: 1 })).toBe("2026-11-08");
    });
});

describe("editedBudget", () => {
    it("keeps the stored anchor when the cadence is restated, in the ledger's time zone", () => {
        const row = editedBudget(ledger, "budgets", budget(), draft({ amount: 450 }), NOW);
        expect(row.fields).toMatchObject({ amount: 450, startDate: startOfDay(ledger, "2026-10-15") });
    });

    it("re-anchors to the new cadence's current window", () => {
        const row = editedBudget(ledger, "budgets", budget(), draft({ type: BUDGET_TYPE.week }), NOW);
        expect(row.fields).toMatchObject({ startDate: startOfDay(ledger, "2026-11-09"), type: BUDGET_TYPE.week });
    });

    it("keeps the frozen currency until the amount changes", () => {
        const kept = editedBudget(ledger, "budgets", budget(), draft({ rollover: true }), NOW);
        expect(kept.fields).toMatchObject({ amountUsd: 300, currency: "USD", rollover: true });
        const changed = editedBudget(ledger, "budgets", budget(), draft({ amount: 280 }), NOW);
        expect(changed.fields).toMatchObject({ amountUsd: null, currency: "EUR" });
    });
});

describe("createdBudget", () => {
    it("replaces the live overall limit instead of adding a second one", () => {
        const { categoryId: _, ...existing } = budget({ localId: "overall" });
        const row = createdBudget(
            ledgerOf({ mainBudget: [existing as unknown as LedgerBooks["mainBudget"][number]] }),
            null,
            draft({ amount: 2000 }),
            "fresh-id",
            NOW
        );
        expect(row).toMatchObject({ fields: { amount: 2000 }, localId: "overall", table: "mainBudget" });
    });
});

describe("plannedMonths", () => {
    const month = Date.UTC(2026, 11, 1);
    const plan = (deletedAt: number | null) =>
        ({
            amount: 100,
            categoryId: "food",
            currency: "USD",
            deletedAt,
            localId: budgetPlanId("food", month),
            month,
            restoredAt: null,
            updatedAt: EARLIER,
        }) as LedgerBooks["budgetPlans"][number];

    it("brings a deleted month back so its tombstone does not outrank the new amount", () => {
        const [row] = plannedMonths(
            books({ budgetPlans: [plan(EARLIER)] }),
            "food",
            "EUR",
            new Map([[month, 80]]),
            NOW
        );
        expect(row).toMatchObject({ deletedAt: null, fields: { amount: 80, currency: "EUR" }, restoredAt: NOW });
    });

    it("clears a month back to its fallback with a null amount", () => {
        const [row] = plannedMonths(books({ budgetPlans: [plan(null)] }), "food", "EUR", new Map([[month, null]]), NOW);
        expect(row).toMatchObject({ fields: { amount: null }, restoredAt: null });
    });
});
