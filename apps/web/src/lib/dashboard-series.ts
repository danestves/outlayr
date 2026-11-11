import { spentForCategory, spentForMain } from "@outlayr/money/budget-spent";
import { budgetStanding } from "@outlayr/money/budget-standing";
import type { StoredBudget } from "@outlayr/money/budget-standing";
import { wall } from "@outlayr/money/ledger-zone";
import { merchantKey } from "@outlayr/money/merchant-key";
import type { AreaChartDatum } from "panelui-web/area-chart";

import { endOfDay, round, rowsBetween, rowsOf, startOfDay, total, UNCATEGORIZED_NAME } from "./dashboard-series-ledger";
import type { Expense, Ledger, LedgerRow, Scope } from "./dashboard-series-ledger";
import { netWorthPoints } from "./dashboard-series-net-worth";
import { daysFrom, priorSlice, periodOf, shiftPeriodKey } from "./dashboard-series-period";
import type { Period } from "./dashboard-series-period";
import { addDays, daysBetween } from "./ledger";
import type { LedgerBooks } from "./ledger-books";

export interface SeriesCategory {
    color: string;
    id: string;
    name: string;
    total: number;
}

const NEAR_HUE_DEGREES = 30;
const GRAY_SATURATION = 0.08;
const HEX_COLOR = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
const MAX_CHANNEL = 255;

function hueOf(color: string) {
    const match = HEX_COLOR.exec(color);
    if (!match) {
        return null;
    }
    const [red = 0, green = 0, blue = 0] = match.slice(1).map((channel) => Number.parseInt(channel, 16) / MAX_CHANNEL);
    const high = Math.max(red, green, blue);
    const spread = high - Math.min(red, green, blue);
    if (spread < GRAY_SATURATION) {
        return null;
    }
    const sector = (() => {
        if (high === red) {
            return ((green - blue) / spread) % 6;
        }
        return high === green ? (blue - red) / spread + 2 : (red - green) / spread + 4;
    })();
    return (sector * 60 + 360) % 360;
}

function hueGap(a: string, b: string) {
    const first = hueOf(a);
    const second = hueOf(b);
    if (first === null || second === null) {
        return 180;
    }
    const gap = Math.abs(first - second);
    return Math.min(gap, 360 - gap);
}

const clashes = (order: readonly { color: string }[]) =>
    order.filter((item, index) => index > 0 && hueGap(order[index - 1]?.color ?? "", item.color) < NEAR_HUE_DEGREES)
        .length;

export function stackOrder<Item extends { color: string; id: string; total: number }>(
    items: readonly Item[],
    base: string | null
) {
    const ranked = items.toSorted((a, b) => a.total - b.total || a.id.localeCompare(b.id));
    const order = [...ranked.filter((item) => item.id === base), ...ranked.filter((item) => item.id !== base)];
    const pinned = base !== null && order[0]?.id === base ? 1 : 0;
    let worst = clashes(order);
    for (let first = pinned; first < order.length && worst > 0; first += 1) {
        for (let second = first + 1; second < order.length && worst > 0; second += 1) {
            const a = order[first];
            const b = order[second];
            if (!a || !b) {
                continue;
            }
            order[first] = b;
            order[second] = a;
            const next = clashes(order);
            if (next < worst) {
                worst = next;
            } else {
                order[first] = a;
                order[second] = b;
            }
        }
    }
    return order;
}

export function categoriesOf(ledger: Ledger, rows: readonly LedgerRow[], base: string | null): SeriesCategory[] {
    const grouped = Map.groupBy(rows, (row) => row.topId);
    return stackOrder(
        [...grouped].flatMap(([id, members]) => {
            const category = ledger.categories.get(id);
            return category ? [{ ...category, total: total(ledger, members) }] : [];
        }),
        base
    );
}

interface DashboardScope extends Scope {
    category: string | null;
}

interface SpendSeries {
    categories: readonly SeriesCategory[];
    data: readonly AreaChartDatum[];
    income: number;
    kept: number;
    keptAt: number;
    spent: number;
}

export function spendSeries(ledger: Ledger, period: Period, scope: DashboardScope): SpendSeries {
    const last = ledger.today < period.to ? ledger.today : period.to;
    const spend = rowsBetween(ledger, scope, period.from, last, false);
    const income = rowsBetween(ledger, scope, period.from, last, true);
    const categories = categoriesOf(ledger, spend, scope.category);
    const spendByDay = Map.groupBy(spend, (row) => row.day);
    const incomeByDay = Map.groupBy(income, (row) => row.day);
    const running = new Map(categories.map((category) => [category.id, 0]));
    let earned = 0;
    const data = daysFrom(period.from, last).map((date) => {
        for (const row of spendByDay.get(date) ?? []) {
            running.set(row.topId, (running.get(row.topId) ?? 0) + row.amount);
        }
        for (const row of incomeByDay.get(date) ?? []) {
            earned += row.amount;
        }
        return {
            date,
            income: round(ledger, earned),
            ...Object.fromEntries([...running].map(([id, value]) => [id, round(ledger, value)])),
        };
    });
    const spent = total(ledger, spend);
    const earnedTotal = total(ledger, income);
    return {
        categories,
        data,
        income: earnedTotal,
        kept: round(ledger, earnedTotal - spent),
        keptAt: round(ledger, (earnedTotal + spent) / 2),
        spent,
    };
}

export interface Kpi {
    delta: number | null;
    prior: number;
    value: number;
}

interface Kpis {
    income: Kpi;
    kept: Kpi & { share: number | null };
    netWorth: Kpi;
    spent: Kpi;
}

export const change = (value: number, prior: number) => (prior === 0 ? null : (value - prior) / Math.abs(prior));

export function kpis(ledger: Ledger, period: Period, scope: Scope): Kpis {
    const through = ledger.today < period.to ? ledger.today : period.to;
    const prior = priorSlice(period, ledger.today, ledger.firstDayOfMonth);
    const figure = (from: string, to: string, income: boolean) =>
        total(ledger, rowsBetween(ledger, scope, from, to, income));
    const incomeNow = figure(period.from, through, true);
    const incomeBefore = figure(prior.from, prior.to, true);
    const spentNow = figure(period.from, through, false);
    const spentBefore = figure(prior.from, prior.to, false);
    const keptNow = round(ledger, incomeNow - spentNow);
    const keptBefore = round(ledger, incomeBefore - spentBefore);
    const asOf = Math.min(ledger.now, endOfDay(ledger, period.to));
    const [before, now] = netWorthPoints(ledger, scope, [Math.min(startOfDay(ledger, period.from) - 1, asOf), asOf]);
    const netBefore = before?.net ?? 0;
    const netNow = now?.net ?? 0;
    return {
        income: { delta: change(incomeNow, incomeBefore), prior: incomeBefore, value: incomeNow },
        kept: {
            delta: change(keptNow, keptBefore),
            prior: keptBefore,
            share: incomeNow > 0 ? keptNow / incomeNow : null,
            value: keptNow,
        },
        netWorth: { delta: change(netNow, netBefore), prior: netBefore, value: netNow },
        spent: { delta: change(spentNow, spentBefore), prior: spentBefore, value: spentNow },
    };
}

export interface CategoryBudget {
    effectiveLimit: number;
    from: string;
    limit: number;
    overBudget: boolean;
    period: string | null;
    remaining: number;
    runOut: { day: string; daysEarly: number } | null;
    spent: number;
    to: string;
}

type Budget = LedgerBooks["budgets"][number];

const budgetsByAge = (ledger: Ledger) =>
    ledger.books.budgets
        .filter((row) => row.deletedAt === null && row.categoryId !== null)
        .toSorted((a, b) => (a.dateCreated ?? 0) - (b.dateCreated ?? 0));

const allExpenses = new WeakMap<Ledger, readonly Expense[]>();

/** Every expense once, for the overall limit; a category's list repeats a row under its parent. */
function expensesOf(ledger: Ledger, categoryId: string | null): readonly Expense[] {
    if (categoryId !== null) {
        return ledger.expensesByCategory.get(categoryId) ?? [];
    }
    const kept = allExpenses.get(ledger);
    if (kept) {
        return kept;
    }
    const rows = ledger.rows
        .filter((row) => !row.income)
        .map((row) => ({
            amount: row.amount,
            categoryId: row.categoryId,
            date: wall(row.at, ledger.offsetAt(row.at)),
            day: row.day,
            parentId: row.parentId,
        }));
    allExpenses.set(ledger, rows);
    return rows;
}

/** The instant a period is read at: its end once it is over, now while it runs, its first moment before it starts. */
export function periodInstant(ledger: Ledger, period: Period) {
    return period.from > ledger.today
        ? startOfDay(ledger, period.from)
        : Math.min(ledger.now, endOfDay(ledger, period.to));
}

/** The window holding `asOf`; `categoryId` null reads the limit against all spending. */
export function standingAt(
    ledger: Ledger,
    budget: StoredBudget,
    categoryId: string | null,
    asOf: number
): CategoryBudget {
    const clock = {
        currency: ledger.currency,
        now: wall(asOf, ledger.offsetAt(asOf)),
        offsetAt: ledger.offsetAt,
        rates: ledger.rates,
    };
    const filed = expensesOf(ledger, categoryId);
    const standing = budgetStanding(
        budget,
        budget.rollover,
        (start, last) =>
            categoryId === null ? spentForMain(filed, start, last) : spentForCategory(filed, categoryId, start, last),
        clock
    );
    const byDay = new Map<string, number>();
    for (const { amount, date, day } of filed) {
        if (day >= standing.from && day <= standing.to && date.getTime() <= clock.now.getTime()) {
            byDay.set(day, (byDay.get(day) ?? 0) + amount);
        }
    }
    let spent = 0;
    let runOutDay: string | null = null;
    for (const day of [...byDay.keys()].toSorted()) {
        spent += byDay.get(day) ?? 0;
        if (round(ledger, spent) > standing.effectiveLimit) {
            runOutDay = day;
            break;
        }
    }
    return {
        effectiveLimit: standing.effectiveLimit,
        from: standing.from,
        limit: standing.limit,
        overBudget: standing.overBudget,
        period: standing.period,
        remaining: standing.remaining,
        runOut: runOutDay === null ? null : { day: runOutDay, daysEarly: daysBetween(runOutDay, standing.to) },
        spent: standing.spent,
        to: standing.to,
    };
}

const standingOf = (ledger: Ledger, budget: Budget, categoryId: string, period: Period) =>
    standingAt(ledger, budget, categoryId, periodInstant(ledger, period));

export function categoryBudget(ledger: Ledger, categoryId: string, period: Period) {
    const budget = budgetsByAge(ledger).find((row) => row.categoryId === categoryId);
    return budget ? standingOf(ledger, budget, categoryId, period) : null;
}

export function budgetParts(ledger: Ledger, categoryId: string, standing: CategoryBudget, period: Period) {
    const asOf = Math.min(ledger.now, endOfDay(ledger, period.to));
    const now = wall(asOf, ledger.offsetAt(asOf)).getTime();
    const totals = new Map<string, number>();
    for (const expense of ledger.expensesByCategory.get(categoryId) ?? []) {
        if (expense.day >= standing.from && expense.day <= standing.to && expense.date.getTime() <= now) {
            const id = expense.categoryId ?? categoryId;
            totals.set(id, (totals.get(id) ?? 0) + expense.amount);
        }
    }
    if (totals.size < 2) {
        return [];
    }
    const names = new Map(ledger.books.categories.map((row) => [row.localId, row.name]));
    return [...totals]
        .map(([id, amount]) => ({
            amount: round(ledger, amount),
            id,
            name: id === categoryId ? null : (names.get(id) ?? UNCATEGORIZED_NAME),
        }))
        .toSorted((a, b) => b.amount - a.amount);
}

export function categoryBudgets(ledger: Ledger, period: Period) {
    const standings = new Map<string, CategoryBudget>();
    for (const budget of budgetsByAge(ledger)) {
        if (budget.categoryId !== null && !standings.has(budget.categoryId)) {
            standings.set(budget.categoryId, standingOf(ledger, budget, budget.categoryId, period));
        }
    }
    return standings;
}

/** The budgets that run for exactly this month. A window may end on the month's last day or the day after it. */
export function monthlyBudgets(ledger: Ledger, month: Period) {
    const nextDay = addDays(month.to, 1);
    return [...categoryBudgets(ledger, month)].filter(
        ([, standing]) => standing.from === month.from && (standing.to === month.to || standing.to === nextDay)
    );
}

interface ShareRow {
    amount: number;
    id: string | null;
    name: string;
    share: number;
}

interface MerchantRow {
    amount: number;
    count: number;
    name: string;
    share: number;
}

export interface CategoryDetail {
    average: number | null;
    byAccount: readonly ShareRow[];
    byDay: readonly { amount: number; date: string }[];
    count: number;
    merchants: readonly MerchantRow[];
    months: readonly { amount: number; key: string }[];
    peak: { amount: number; date: string } | null;
    spent: number;
    versus: number | null;
}

const COMPARED_PERIODS = 3;
const MERCHANTS_SHOWN = 5;

export function categoryDetail(
    ledger: Ledger,
    categoryId: string,
    period: Period,
    scope: Scope,
    merchantLimit = MERCHANTS_SHOWN
): CategoryDetail {
    const last = ledger.today < period.to ? ledger.today : period.to;
    const category = ledger.categories.get(categoryId);
    const filed = rowsOf(ledger, scope, false).filter((row) => row.topId === categoryId);
    const within = (from: string, to: string) => filed.filter((row) => row.day >= from && row.day <= to);
    const rows = within(period.from, last);
    const spent = total(ledger, rows);
    const share = (amount: number) => (spent > 0 ? amount / spent : 0);
    const dayTotals = Map.groupBy(rows, (row) => row.day);
    const byDay = daysFrom(period.from, last).map((date) => ({
        amount: total(ledger, dayTotals.get(date) ?? []),
        date,
    }));
    const peak = byDay.reduce<{ amount: number; date: string } | null>(
        (top, day) => (day.amount > (top?.amount ?? 0) ? day : top),
        null
    );
    const merchants = [
        ...Map.groupBy(
            rows.toSorted((a, b) => b.at - a.at),
            (row) => merchantKey(row.note) || merchantKey(category?.name ?? "")
        ).values(),
    ]
        .map((members) => {
            const amount = total(ledger, members);
            return {
                amount,
                count: members.length,
                name: members[0]?.note.trim() || (category?.name ?? ""),
                share: share(amount),
            };
        })
        .toSorted((a, b) => b.amount - a.amount)
        .slice(0, merchantLimit);
    const byAccount = [...Map.groupBy(rows, (row) => row.accountId).entries()]
        .map(([id, members]) => {
            const amount = total(ledger, members);
            return { amount, id, name: id === null ? "" : (ledger.accounts.get(id)?.name ?? ""), share: share(amount) };
        })
        .toSorted((a, b) => b.amount - a.amount);
    const periods = Array.from({ length: COMPARED_PERIODS + 1 }, (_, index) =>
        periodOf(shiftPeriodKey(period.key, index - COMPARED_PERIODS), ledger.firstDayOfMonth)
    );
    const months = periods.map((each) => ({ amount: total(ledger, within(each.from, each.to)), key: each.key }));
    const firstDay = ledger.rows.reduce((first, row) => (row.day < first ? row.day : first), ledger.today);
    const before = periods.slice(0, COMPARED_PERIODS);
    const average = before.every((each) => each.from >= firstDay)
        ? round(
              ledger,
              months.slice(0, COMPARED_PERIODS).reduce((sum, month) => sum + month.amount, 0) / COMPARED_PERIODS
          )
        : null;
    return {
        average,
        byAccount,
        byDay,
        count: rows.length,
        merchants,
        months,
        peak,
        spent,
        versus: average === null ? null : round(ledger, spent - average),
    };
}
