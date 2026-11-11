import { BUDGET_TYPE } from "@outlayr/money/budget-window";
import { TOMBSTONED_BUDGET, TOMBSTONED_MAIN_BUDGET } from "@outlayr/money/erase";
import { uuidV5 } from "@outlayr/money/uuid5";
import type { MonthKey } from "@outlayr/money/year-plan";

import { frozenUsd, nextRow } from "./account-writes";
import { startOfDay } from "./dashboard-series-ledger";
import type { Ledger } from "./dashboard-series-ledger";
import type { Calendar } from "./dashboard-series-period";
import { periodKeyOf, weekKeyOf } from "./dashboard-series-period";
import type { LedgerBooks } from "./ledger-books";
import type { CommitRow } from "./ledger-committer";

export type Budget = LedgerBooks["budgets"][number];
export type MainBudget = LedgerBooks["mainBudget"][number];

export interface BudgetDraft {
    amount: number;
    name: string;
    rollover: boolean;
    /** A day the window opens on; null opens it on the current window of `type`. */
    startDay: string | null;
    type: number;
}

const BUDGET_PLAN_NAMESPACE = "5b1f0d8e-7c43-4f6a-9e2d-3a8c61b47f09";

// The same id a phone writes, so two devices planning one month land on one row.
export const budgetPlanId = (categoryId: string, month: MonthKey) =>
    uuidV5(`${categoryId}:${month}`, BUDGET_PLAN_NAMESPACE);

/** The first day of the window of `type` holding `today`, as a phone anchors a new budget. */
export function windowAnchorDay(today: string, type: number, calendar: Calendar): string {
    switch (type) {
        case BUDGET_TYPE.week: {
            return weekKeyOf(today, calendar.firstWeekday);
        }
        case BUDGET_TYPE.month: {
            const anchor = Math.min(Math.max(1, calendar.firstDayOfMonth), 28);
            return `${periodKeyOf(today, calendar.firstDayOfMonth)}-${String(anchor).padStart(2, "0")}`;
        }
        case BUDGET_TYPE.year: {
            return `${today.slice(0, 4)}-01-01`;
        }
        default: {
            return today;
        }
    }
}

const customName = (name: string) => name.trim() || null;

function limitFields(ledger: Ledger, amount: number, currency: string, startDay: string) {
    const startDate = startOfDay(ledger, startDay);
    const magnitude = Math.abs(amount);
    return {
        amount: magnitude,
        amountUsd: frozenUsd(ledger.books, magnitude, currency, startDate),
        currency,
        startDate,
    };
}

const anchorOf = (ledger: Ledger, draft: BudgetDraft) =>
    draft.startDay ?? windowAnchorDay(ledger.today, draft.type, ledger);

/** A category limit, or the overall one when `categoryId` is null. */
export function createdBudget(ledger: Ledger, categoryId: string | null, draft: BudgetDraft, id: string, at: number) {
    const shared = {
        ...limitFields(ledger, draft.amount, ledger.currency, anchorOf(ledger, draft)),
        dateCreated: at,
        green: false,
        name: customName(draft.name),
        rollover: draft.rollover,
        type: draft.type,
    };
    const live = { deletedAt: null, localId: id, restoredAt: null, updatedAt: at };
    if (categoryId === null) {
        const existing = ledger.books.mainBudget.find((row) => row.deletedAt === null);
        // One overall limit at a time: a second one replaces the first, as on a phone.
        if (existing) {
            return editedBudget(ledger, "mainBudget", existing, draft, at);
        }
        return { ...live, fields: shared, table: "mainBudget" } satisfies CommitRow;
    }
    return { ...live, fields: { ...shared, categoryId }, table: "budgets" } satisfies CommitRow;
}

const dayOf = (ledger: Ledger, instant: number) =>
    new Date(instant + ledger.offsetAt(instant)).toISOString().slice(0, 10);

/**
 * A cadence change re-anchors to the new cadence's current window unless a start day is given; a restated cadence
 * keeps the stored anchor. A new amount or window freezes the USD value again on the day the window opens.
 */
export function editedBudget(
    ledger: Ledger,
    table: "budgets" | "mainBudget",
    row: Budget | MainBudget,
    draft: BudgetDraft,
    at: number
): CommitRow {
    const cadenceChanged = draft.type !== row.type;
    let { startDay } = draft;
    if (startDay === null && !cadenceChanged && row.startDate !== null) {
        startDay = dayOf(ledger, row.startDate);
    }
    const amountChanged = Math.abs(draft.amount) !== row.amount;
    const anchor = startDay ?? anchorOf(ledger, draft);
    const unchanged = !amountChanged && startOfDay(ledger, anchor) === row.startDate;
    const currency = amountChanged || row.currency === null ? ledger.currency : row.currency;
    const limit = unchanged
        ? { amount: row.amount, amountUsd: row.amountUsd, currency: row.currency, startDate: row.startDate }
        : limitFields(ledger, draft.amount, currency, anchor);
    return nextRow(
        table,
        row,
        { ...limit, name: customName(draft.name), rollover: draft.rollover, type: draft.type },
        at
    );
}

export const deletedBudget = (table: "budgets" | "mainBudget", row: Budget | MainBudget, at: number) =>
    nextRow(table, row, { ...(table === "budgets" ? TOMBSTONED_BUDGET : TOMBSTONED_MAIN_BUDGET), deletedAt: at }, at);

/** One row per month; a null amount clears that month's plan so it falls back to the budget or typical spend. */
export function plannedMonths(
    books: Pick<LedgerBooks, "budgetPlans">,
    categoryId: string,
    currency: string,
    amounts: ReadonlyMap<MonthKey, number | null>,
    at: number
): CommitRow[] {
    const stored = new Map(books.budgetPlans.map((row) => [row.localId, row]));
    return [...amounts].map(([month, value]) => {
        const localId = budgetPlanId(categoryId, month);
        const amount = value === null ? null : Math.abs(value);
        const existing = stored.get(localId);
        if (!existing) {
            return {
                deletedAt: null,
                fields: { amount, categoryId, currency, month },
                localId,
                restoredAt: null,
                table: "budgetPlans",
                updatedAt: at,
            } satisfies CommitRow;
        }
        // A tombstone outranks a later edit unless the row says it came back after it.
        const restoredAt = existing.deletedAt === null ? (existing.restoredAt ?? null) : at;
        return nextRow("budgetPlans", { ...existing, restoredAt }, { amount, currency, deletedAt: null }, at);
    });
}
