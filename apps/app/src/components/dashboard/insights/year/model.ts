import { monthlyBudgets } from "../../../../lib/dashboard-series";
import { categorySpend } from "../../../../lib/dashboard-series-insights";
import { inScope, round, rowsBetween, total } from "../../../../lib/dashboard-series-ledger";
import type { Ledger, Scope } from "../../../../lib/dashboard-series-ledger";
import { periodKeyOf, periodKindOf, periodOf, shiftPeriodKey } from "../../../../lib/dashboard-series-period";
import type { Period } from "../../../../lib/dashboard-series-period";

const MONTHS = 12;
export const MIN_MONTHS = 3;

export interface YearMonth {
    active: boolean;
    /** Spent in the budgeted categories against what they were allowed, `null` when no budget stood that month. */
    budget: { limit: number; spent: number } | null;
    key: string;
    over: boolean | null;
    spent: number;
}

export interface YearCategory {
    color: string;
    id: string;
    label: string;
    share: number;
    value: number;
}

export interface YearChange {
    /** The latest month's spend in the category minus its average month; negative is below the average. */
    delta: number;
    id: string;
    label: string;
}

export interface Kept {
    budgeted: number;
    count: number;
    kept: number;
}

export interface YearModel {
    average: number;
    below: YearChange[];
    categories: YearCategory[];
    entries: number;
    highest: YearMonth | null;
    /** The month `below` is measured in. */
    latest: string | null;
    keptHere: Kept | null;
    keptRecent: Kept | null;
    lowest: YearMonth | null;
    months: YearMonth[];
    monthsLogged: number;
    over: number;
    prior: { delta: number | null; spent: number } | null;
    spent: number;
    tooEarly: boolean;
    under: number[];
}

/** The twelve month keys a choice covers: a calendar year, or the twelve ending with the month holding today. */
export function monthKeysOf(choice: string | null, ledger: Pick<Ledger, "firstDayOfMonth" | "today">) {
    if (choice !== null && periodKindOf(choice) === "year") {
        return Array.from({ length: MONTHS }, (_, index) => `${choice}-${String(index + 1).padStart(2, "0")}`);
    }
    const last = periodKeyOf(ledger.today, ledger.firstDayOfMonth);
    return Array.from({ length: MONTHS }, (_, index) => shiftPeriodKey(last, index + 1 - MONTHS));
}

function windowOf(ledger: Ledger, keys: readonly string[]): Period {
    const first = periodOf(keys[0] ?? "", ledger.firstDayOfMonth);
    const last = periodOf(keys.at(-1) ?? "", ledger.firstDayOfMonth);
    return { days: 0, from: first.from, key: keys.join(","), to: last.to };
}

const firstDayOf = (ledger: Ledger, scope: Scope) =>
    ledger.rows.filter(inScope(scope)).reduce((first, row) => (row.day < first ? row.day : first), ledger.today);

function monthOf(ledger: Ledger, scope: Scope, key: string, budgeted: boolean, firstDay: string): YearMonth {
    const parents = new Map(ledger.books.categories.map((row) => [row.localId, row.parentId]));
    const period = periodOf(key, ledger.firstDayOfMonth);
    const active = period.from <= ledger.today && period.to >= firstDay;
    if (!active) {
        return { active, budget: null, key, over: null, spent: 0 };
    }
    const last = ledger.today < period.to ? ledger.today : period.to;
    const spent = total(ledger, rowsBetween(ledger, scope, period.from, last, false));
    // A parent's budget already counts what its children spent, so a child under a budgeted parent is left out.
    const monthly = budgeted ? monthlyBudgets(ledger, period) : [];
    const ids = new Set(monthly.map(([id]) => id));
    const standings = monthly.filter(([id]) => !ids.has(parents.get(id) ?? "")).map(([, standing]) => standing);
    if (standings.length === 0) {
        return { active, budget: null, key, over: null, spent };
    }
    const limit = round(
        ledger,
        standings.reduce((sum, each) => sum + each.effectiveLimit, 0)
    );
    const inBudgets = round(
        ledger,
        standings.reduce((sum, each) => sum + each.spent, 0)
    );
    return { active, budget: { limit, spent: inBudgets }, key, over: inBudgets > limit, spent };
}

function keptOf(ledger: Ledger, months: readonly YearMonth[]): Kept | null {
    const judged = months.filter((month) => month.budget !== null);
    if (judged.length === 0) {
        return null;
    }
    let kept = 0;
    let budgeted = 0;
    for (const month of judged) {
        kept += Math.max((month.budget?.limit ?? 0) - (month.budget?.spent ?? 0), 0);
        budgeted += month.budget?.limit ?? 0;
    }
    return { budgeted: round(ledger, budgeted), count: judged.length, kept: round(ledger, kept) };
}

const sumOf = (ledger: Ledger, months: readonly YearMonth[]) =>
    round(
        ledger,
        months.reduce((sum, month) => sum + month.spent, 0)
    );

/** How many times the kept money covers a year of Pro; null unless it does and both amounts share a currency. */
export const proMultiple = (kept: number, price: { amount: number; currency: string }, currency: string) =>
    price.currency === currency && kept > price.amount ? Math.round(kept / price.amount) : null;

const BELOW_ROWS = 5;

/** Each category after the biggest, the latest closed month against that category's average month. */
function belowOf(ledger: Ledger, scope: Scope, spans: readonly YearMonth[]): YearChange[] {
    if (spans.length === 0) {
        return [];
    }
    const perMonth = spans.map((month) => categorySpend(ledger, periodOf(month.key, ledger.firstDayOfMonth), scope));
    const totals = new Map<string, { label: string; spent: number }>();
    for (const categories of perMonth) {
        for (const each of categories) {
            totals.set(each.id, { label: each.label, spent: (totals.get(each.id)?.spent ?? 0) + each.value });
        }
    }
    const lastSpent = new Map((perMonth.at(-1) ?? []).map((each) => [each.id, each.value]));
    return [...totals]
        .toSorted((a, b) => b[1].spent - a[1].spent)
        .slice(1, BELOW_ROWS + 1)
        .map(([id, sum]) => ({
            delta: round(ledger, (lastSpent.get(id) ?? 0) - sum.spent / spans.length),
            id,
            label: sum.label,
        }))
        .toSorted((a, b) => a.delta - b.delta);
}

/** A year of months: spend, what stayed under the budgets, and the latest month against the average. */
export function yearOf(ledger: Ledger, scope: Scope, choice: string | null, budgeted: boolean): YearModel {
    const firstDay = firstDayOf(ledger, scope);
    const monthsFor = (keys: readonly string[]) => keys.map((key) => monthOf(ledger, scope, key, budgeted, firstDay));
    const keys = monthKeysOf(choice, ledger);
    const months = monthsFor(keys);
    const logged = months.filter((month) => month.active);
    const span = windowOf(ledger, keys);
    const priorKeys = keys.map((key) => shiftPeriodKey(key, -MONTHS));
    const priorMonths = monthsFor(priorKeys);
    const hasPrior = priorMonths.some((month) => month.active);
    const spent = sumOf(ledger, months);
    const priorSpent = sumOf(ledger, priorMonths);
    const categories = categorySpend(ledger, span, scope);
    const counted = logged.filter((month) => month.budget !== null);
    const closed = logged.filter((month) => periodOf(month.key, ledger.firstDayOfMonth).to <= ledger.today);
    const spans = closed.length > 0 ? closed : logged;
    const recent = choice === null ? months : monthsFor(monthKeysOf(null, ledger));
    const ranked = spans.toSorted((a, b) => b.spent - a.spent);
    return {
        average: spans.length === 0 ? 0 : round(ledger, sumOf(ledger, spans) / spans.length),
        below: belowOf(ledger, scope, spans),
        categories,
        entries: ledger.rows.filter(inScope(scope)).filter((row) => row.day >= span.from && row.day <= span.to).length,
        highest: ranked[0] ?? null,
        keptHere: keptOf(ledger, months),
        keptRecent: keptOf(ledger, recent),
        latest: spans.at(-1)?.key ?? null,
        lowest: ranked.at(-1) ?? null,
        months,
        monthsLogged: logged.length,
        over: counted.filter((month) => month.over).length,
        prior: hasPrior
            ? { delta: priorSpent > 0 ? (spent - priorSpent) / priorSpent : null, spent: priorSpent }
            : null,
        spent,
        tooEarly: logged.length < MIN_MONTHS,
        under: months.flatMap((month, index) => (month.over === false ? [index] : [])),
    };
}

/** Consecutive indexes folded into `[first, last]` runs, for "Jan to Jun, Sep". */
export function runsOf(indexes: readonly number[]) {
    const runs: [number, number][] = [];
    for (const index of indexes) {
        const run = runs.at(-1);
        if (run && run[1] === index - 1) {
            run[1] = index;
        } else {
            runs.push([index, index]);
        }
    }
    return runs;
}

/** The calendar years that hold entries and have ended, newest first. */
export function yearsWithData(ledger: Ledger, scope: Scope) {
    const first = Number(periodKeyOf(firstDayOf(ledger, scope), ledger.firstDayOfMonth).slice(0, 4));
    const current = Number(periodKeyOf(ledger.today, ledger.firstDayOfMonth).slice(0, 4));
    return Array.from({ length: Math.max(current - first, 0) }, (_, index) => String(current - 1 - index));
}
