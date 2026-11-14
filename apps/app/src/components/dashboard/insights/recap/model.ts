import { monthlyBudgets } from "../../../../lib/dashboard-series";
import { UNCATEGORIZED_ID, round, rowsBetween, total } from "../../../../lib/dashboard-series-ledger";
import type { Ledger, LedgerRow, Scope } from "../../../../lib/dashboard-series-ledger";
import { daysFrom, periodOf, shiftPeriodKey } from "../../../../lib/dashboard-series-period";
import type { Period } from "../../../../lib/dashboard-series-period";

const PRIOR_MONTHS = 3;
const MIN_PRIOR_MONTHS_WITH_SPEND = 2;
const SHOWN_CATEGORIES = 6;
const DAYS_IN_WEEK = 7;

export interface CategoryRow {
    amount: number;
    base: number;
    color: string;
    delta: number;
    id: string;
    name: string;
    share: number;
}

export interface Drop {
    amount: number;
    average: number;
    id: string;
    name: string;
}

export interface Savings {
    budgetsKept: number;
    budgetsTotal: number;
    drop: Drop | null;
    keptNames: string[];
    kept: number;
    over: { by: number; id: string; name: string }[];
    underBudgets: number;
}

export interface Recap {
    /** Blanks before the first day when weeks start on Monday. */
    lead: number;
    month: Period;
    days: { day: string; logged: boolean }[];
    entries: number;
    mostChange: CategoryRow[];
    priorSpent: number;
    rows: CategoryRow[];
    savings: Savings;
    spent: number;
    spentChange: number | null;
}

const NO_SAVINGS: Savings = {
    budgetsKept: 0,
    budgetsTotal: 0,
    drop: null,
    keptNames: [],
    kept: 0,
    over: [],
    underBudgets: 0,
};

const byTop = (ledger: Ledger, rows: readonly LedgerRow[]) => {
    const amounts = new Map<string, number>();
    for (const [id, members] of Map.groupBy(rows, (row) => row.topId)) {
        amounts.set(id, total(ledger, members));
    }
    return amounts;
};

const nameOf = (ledger: Ledger, id: string) =>
    ledger.categories.get(id)?.name ?? ledger.books.categories.find((row) => row.localId === id)?.name ?? "";

function savingsOf(ledger: Ledger, scope: Scope, month: Period, spentNow: Map<string, number>): Savings {
    if (month.to >= ledger.today || scope.accounts.length > 0) {
        return NO_SAVINGS;
    }
    const parents = new Map(ledger.books.categories.map((row) => [row.localId, row.parentId]));
    const counted = monthlyBudgets(ledger, month).filter(([, standing]) => standing.spent > 0);
    const kept = counted.filter(([, standing]) => !standing.overBudget);
    const keptIds = new Set(kept.map(([id]) => id));
    const standing = kept.filter(([id]) => {
        const parent = parents.get(id);
        return parent === null || parent === undefined || !keptIds.has(parent);
    });
    const underBudgets = round(
        ledger,
        standing.reduce((all, [, each]) => all + Math.max(0, each.limit - each.spent), 0)
    );
    const skipped = new Set(kept.flatMap(([id]) => [id, parents.get(id) ?? null]).filter((id) => id !== null));
    const priors = Array.from({ length: PRIOR_MONTHS }, (_, index) =>
        periodOf(shiftPeriodKey(month.key, -(index + 1)), ledger.firstDayOfMonth)
    ).map((prior) => byTop(ledger, rowsBetween(ledger, scope, prior.from, prior.to, false)));
    let drop: Drop | null = null;
    for (const [id, spent] of spentNow) {
        const before = priors.map((amounts) => amounts.get(id) ?? 0);
        const seen = before.filter((amount) => amount > 0).length;
        if (skipped.has(id) || spent <= 0 || seen < MIN_PRIOR_MONTHS_WITH_SPEND || id === UNCATEGORIZED_ID) {
            continue;
        }
        const average = round(ledger, before.reduce((all, amount) => all + amount, 0) / PRIOR_MONTHS);
        const amount = round(ledger, average - spent);
        if (amount > 0 && (drop === null || amount > drop.amount)) {
            drop = { amount, average, id, name: nameOf(ledger, id) };
        }
    }
    return {
        budgetsKept: kept.length,
        budgetsTotal: counted.length,
        drop,
        keptNames: standing.map(([id]) => nameOf(ledger, id)),
        kept: round(ledger, underBudgets + (drop?.amount ?? 0)),
        over: counted
            .filter(([, each]) => each.overBudget)
            .map(([id, each]) => ({
                by: round(ledger, each.spent - each.effectiveLimit),
                id,
                name: nameOf(ledger, id),
            })),
        underBudgets,
    };
}

/** A closed month read back: where it went, against the month before, and what staying under budget saved. */
export function recapOf(ledger: Ledger, scope: Scope, month: Period): Recap {
    const through = ledger.today < month.to ? ledger.today : month.to;
    const prior = periodOf(shiftPeriodKey(month.key, -1), ledger.firstDayOfMonth);
    const spentRows = rowsBetween(ledger, scope, month.from, through, false);
    const everyRow = [...spentRows, ...rowsBetween(ledger, scope, month.from, through, true)];
    const now = byTop(ledger, spentRows);
    const before = byTop(ledger, rowsBetween(ledger, scope, prior.from, prior.to, false));
    const spent = total(ledger, spentRows);
    const priorSpent = [...before.values()].reduce((all, amount) => all + amount, 0);
    const ids = new Set([...now.keys(), ...before.keys()]);
    const rows = [...ids]
        .map((id): CategoryRow => {
            const amount = now.get(id) ?? 0;
            const base = before.get(id) ?? 0;
            const category = ledger.categories.get(id);
            return {
                amount,
                base,
                color: category?.color ?? "",
                delta: round(ledger, amount - base),
                id,
                name: category?.name ?? "",
                share: spent === 0 ? 0 : amount / spent,
            };
        })
        .toSorted((a, b) => b.amount - a.amount);
    const loggedDays = new Set(everyRow.map((row) => row.day));
    const weekday = new Date(`${month.from}T12:00:00Z`).getUTCDay();
    return {
        days: daysFrom(month.from, through).map((day) => ({ day, logged: loggedDays.has(day) })),
        entries: everyRow.length,
        lead: (weekday + DAYS_IN_WEEK - 1) % DAYS_IN_WEEK,
        month,
        mostChange: rows.toSorted((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, SHOWN_CATEGORIES),
        priorSpent: round(ledger, priorSpent),
        rows: rows.filter((row) => row.amount > 0),
        savings: savingsOf(ledger, scope, month, now),
        spent,
        spentChange: priorSpent > 0 ? (spent - priorSpent) / priorSpent : null,
    };
}

/** What Pro costs a month, shown only when the month's savings clearly outweigh it and the currency is the same. */
export const proCostIfWorth = (kept: number, cost: { amount: number; currency: string }, currency: string) =>
    cost.currency === currency && kept > cost.amount ? cost.amount : null;
