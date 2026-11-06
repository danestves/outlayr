import type { CategoryBudget } from "../../../lib/dashboard-series";
import { round, rowsBetween, total } from "../../../lib/dashboard-series-ledger";
import type { Ledger, Scope } from "../../../lib/dashboard-series-ledger";
import { periodOf, shiftPeriodKey } from "../../../lib/dashboard-series-period";
import type { Period } from "../../../lib/dashboard-series-period";
import { addDays, daysBetween } from "../../../lib/ledger";

const PRIOR_PERIODS = 6;
const MIN_PRIOR_PERIODS = 3;
const MIN_DELTA_OF_USUAL = 0.2;
const MIN_DELTA_OF_TOTAL = 0.05;
const MAX_CARDS = 3;

export interface Usual {
    active: ReadonlyMap<string, number>;
    byCategory: ReadonlyMap<string, number>;
    total: number;
}

const earlier = (a: string, b: string) => (a < b ? a : b);

function priorWindows(ledger: Ledger, period: Period) {
    const elapsed = Math.max(daysBetween(period.from, ledger.today) + 1, 1);
    const closed = elapsed >= period.days;
    const firstSpend = ledger.rows.reduce((first, row) => (row.income ? first : earlier(first, row.day)), ledger.today);
    return Array.from({ length: PRIOR_PERIODS }, (_, index) =>
        periodOf(shiftPeriodKey(period.key, -(index + 1)), ledger.firstDayOfMonth)
    )
        .filter((prior) => prior.from >= firstSpend)
        .map((prior) => ({ cut: closed ? prior.to : earlier(addDays(prior.from, elapsed - 1), prior.to), prior }));
}

export function usualSpend(ledger: Ledger, period: Period, scope: Scope): Usual | null {
    const windows = priorWindows(ledger, period);
    if (windows.length < MIN_PRIOR_PERIODS) {
        return null;
    }
    const sums = new Map<string, number>();
    const active = new Map<string, number>();
    for (const { cut, prior } of windows) {
        const spend = (to: string) =>
            Map.groupBy(rowsBetween(ledger, scope, prior.from, to, false), (row) => row.topId);
        for (const [id, rows] of spend(cut)) {
            sums.set(id, (sums.get(id) ?? 0) + total(ledger, rows));
        }
        for (const [id, rows] of spend(prior.to)) {
            if (total(ledger, rows) > 0) {
                active.set(id, (active.get(id) ?? 0) + 1);
            }
        }
    }
    const byCategory = new Map([...sums].map(([id, sum]) => [id, round(ledger, sum / windows.length)]));
    return {
        active,
        byCategory,
        total: round(
            ledger,
            [...byCategory.values()].reduce((sum, each) => sum + each, 0)
        ),
    };
}

export type Comparison = { kind: "asUsual" } | { kind: "less" | "more"; percent: number };

export function compareToUsual(spent: number, usual: number | null): Comparison | null {
    if (usual === null || usual <= 0) {
        return null;
    }
    const percent = Math.round((Math.abs(spent - usual) / usual) * 100);
    if (percent === 0) {
        return { kind: "asUsual" };
    }
    return { kind: spent > usual ? "more" : "less", percent };
}

export interface BiggestPurchase {
    amount: number;
    day: string;
    note: string;
}

export type Standout =
    | {
          biggest: BiggestPurchase | null;
          budget: CategoryBudget;
          categoryId: string;
          impact: number;
          kind: "overBudget";
      }
    | { categoryId: string; gap: number; impact: number; kind: "versus"; under: boolean; usual: number };

function biggestPurchase(ledger: Ledger, scope: Scope, budget: CategoryBudget, categoryId: string) {
    const to = earlier(budget.to, ledger.today);
    return rowsBetween(ledger, scope, budget.from, to, false)
        .filter((row) => row.categoryId === categoryId || row.parentId === categoryId)
        .reduce<BiggestPurchase | null>(
            (top, row) =>
                top === null || row.amount > top.amount
                    ? { amount: row.amount, day: row.day, note: row.note.trim() }
                    : top,
            null
        );
}

export function standouts(
    ledger: Ledger,
    period: Period,
    scope: Scope,
    budgets: ReadonlyMap<string, CategoryBudget>,
    usual: Usual | null
): Standout[] {
    const cards: Standout[] = [...budgets]
        .filter(([id, budget]) => ledger.budgetTargets.has(id) && budget.overBudget && budget.remaining < 0)
        .map(([categoryId, budget]) => ({
            biggest: biggestPurchase(ledger, scope, budget, categoryId),
            budget,
            categoryId,
            impact: -budget.remaining,
            kind: "overBudget" as const,
        }));
    if (usual !== null) {
        const spent = Map.groupBy(
            rowsBetween(ledger, scope, period.from, earlier(period.to, ledger.today), false),
            (row) => row.topId
        );
        for (const [categoryId, typical] of usual.byCategory) {
            const now = total(ledger, spent.get(categoryId) ?? []);
            const gap = round(ledger, Math.abs(now - typical));
            const worthALook =
                !budgets.has(categoryId) &&
                (usual.active.get(categoryId) ?? 0) >= MIN_PRIOR_PERIODS &&
                typical > 0 &&
                gap >= typical * MIN_DELTA_OF_USUAL &&
                gap >= usual.total * MIN_DELTA_OF_TOTAL;
            if (worthALook && ledger.categories.has(categoryId)) {
                cards.push({ categoryId, gap, impact: gap, kind: "versus", under: now < typical, usual: typical });
            }
        }
    }
    return cards.toSorted((a, b) => b.impact - a.impact).slice(0, MAX_CARDS);
}
