import { wallNoon } from "@outlayr/money/ledger-zone";
import type { DayLevel } from "panelui-web/day-grid";

import { categoryBudgets, change, spendSeries } from "../../../lib/dashboard-series";
import type { CategoryBudget } from "../../../lib/dashboard-series";
import { endOfDay, rowsBetween, round, startOfDay, total } from "../../../lib/dashboard-series-ledger";
import type { Ledger, LedgerRow, Scope } from "../../../lib/dashboard-series-ledger";
import { netWorthPoints } from "../../../lib/dashboard-series-net-worth";
import { daysFrom, lastMonthOf, periodOf, priorSlice, shiftPeriodKey } from "../../../lib/dashboard-series-period";
import type { Period } from "../../../lib/dashboard-series-period";
import { figureOf, foldFees } from "./rows";
import type { FoldedRow } from "./rows";

const SPARK_PERIODS = 12;
const MONTHS_IN_YEAR = 12;
const WHAT_IF_STOPS = 400;
const NICE_STEPS = [1, 2, 5, 10];
const CENT = 0.01;

// Monthly for every range, so a quarter or a year still draws a year of points.
const sparkPeriods = (ledger: Ledger, period: Period) =>
    Array.from({ length: SPARK_PERIODS }, (_, index) =>
        periodOf(shiftPeriodKey(lastMonthOf(period.key), index + 1 - SPARK_PERIODS), ledger.firstDayOfMonth)
    );

export function monthsOf(ledger: Pick<Ledger, "firstDayOfMonth">, range: Period) {
    const last = lastMonthOf(range.key);
    const months = [periodOf(last, ledger.firstDayOfMonth)];
    while ((months[0]?.from ?? "") > range.from) {
        months.unshift(periodOf(shiftPeriodKey(months[0]?.key ?? last, -1), ledger.firstDayOfMonth));
    }
    return months;
}

export function rangeBudgets(ledger: Ledger, range: Period): ReadonlyMap<string, CategoryBudget> {
    const months = monthsOf(ledger, range).filter((month) => month.from <= ledger.today);
    if (months.length <= 1) {
        return categoryBudgets(ledger, months[0] ?? range);
    }
    const sums = new Map<string, CategoryBudget>();
    for (const month of months) {
        for (const [id, standing] of categoryBudgets(ledger, month)) {
            const sum = sums.get(id);
            const limit = round(ledger, (sum?.effectiveLimit ?? 0) + standing.effectiveLimit);
            const spent = round(ledger, (sum?.spent ?? 0) + standing.spent);
            sums.set(id, {
                ...standing,
                effectiveLimit: limit,
                from: sum?.from ?? standing.from,
                limit,
                overBudget: spent > limit,
                remaining: round(ledger, limit - spent),
                runOut: null,
                spent,
            });
        }
    }
    return sums;
}

export function everyMonth(ledger: Ledger, range: Period, scope: Scope, categories: readonly string[]) {
    const picked = new Set(categories);
    const through = ledger.today < range.to ? ledger.today : range.to;
    const months = monthsOf(ledger, range).map((month) => {
        const rows = rowsBetween(ledger, scope, month.from, month.to < through ? month.to : through, false).filter(
            (row) => picked.size === 0 || picked.has(row.topId)
        );
        return { amount: total(ledger, rows), key: month.key, started: month.from <= through };
    });
    const year = range.key.slice(0, 4);
    const rest = Array.from({ length: MONTHS_IN_YEAR - months.length }, (_, index) => ({
        amount: 0,
        key: shiftPeriodKey(lastMonthOf(range.key), index + 1),
        started: false,
    })).filter((month) => month.key.startsWith(year));
    const spent = months.filter((month) => month.started && month.amount > 0);
    const ranked = spent.toSorted((a, b) => b.amount - a.amount);
    const elapsed = daysFrom(range.from, through).length;
    return {
        average: elapsed > 0 ? round(ledger, spent.reduce((sum, month) => sum + month.amount, 0) / elapsed) : 0,
        highest: ranked[0] ?? null,
        lowest: ranked.length > 1 ? (ranked.at(-1) ?? null) : null,
        months: [...months, ...rest],
    };
}

export function categorySpend(ledger: Ledger, period: Period, scope: Scope, categories: readonly string[]) {
    const picked = new Set(categories);
    const split = (from: string, to: string) => {
        const rows = rowsBetween(ledger, scope, from, to, false);
        const value = total(
            ledger,
            rows.filter((row) => picked.has(row.topId))
        );
        const all = total(ledger, rows);
        return { share: all > 0 ? value / all : 0, value };
    };
    const now = split(period.from, ledger.today < period.to ? ledger.today : period.to);
    const slice = priorSlice(period, ledger.today, ledger.firstDayOfMonth);
    const before = split(slice.from, slice.to);
    const finished = sparkPeriods(ledger, period)
        .filter((each) => each.to < ledger.today)
        .map((each) => split(each.from, each.to));
    return {
        delta: change(now.value, before.value),
        prior: before.value,
        share: now.share,
        shareChange: now.share - before.share,
        sharePoints: finished.map((each) => each.share),
        spentPoints: finished.map((each) => each.value),
        value: now.value,
    };
}

export function sparks(ledger: Ledger, period: Period, scope: Scope) {
    const periods = sparkPeriods(ledger, period);
    const figure = (each: Period, income: boolean) =>
        total(ledger, rowsBetween(ledger, scope, each.from, each.to, income));
    const finished = periods.filter((each) => each.to < ledger.today);
    const income = finished.map((each) => figure(each, true));
    const spent = finished.map((each) => figure(each, false));
    const instants = periods.map((each) => Math.min(ledger.now, endOfDay(ledger, each.to)));
    return {
        income,
        kept: income.map((value, index) => round(ledger, value - (spent[index] ?? 0))),
        netWorth: netWorthPoints(ledger, scope, instants).map((point) => point.net),
        spent,
    };
}

export function accountBalances(ledger: Ledger, period: Period, quiet: boolean, accounts: readonly string[]) {
    const instant = !quiet && period.to < ledger.today ? endOfDay(ledger, period.to) : ledger.now;
    const [end] = netWorthPoints(ledger, { accounts }, [instant]);
    return end ?? { accounts: [], net: 0 };
}

// Multiples of the day's average, so the dots mean the same in every currency.
const LEVEL_STEPS = [
    [1.2, 4],
    [0.6, 3],
    [0.25, 2],
] as const;

const levelOf = (amount: number, average: number): DayLevel => {
    if (amount <= 0) {
        return 0;
    }
    return LEVEL_STEPS.find(([step]) => amount >= step * average)?.[1] ?? 1;
};

export interface DayCell {
    amount: number;
    day: string;
    level: DayLevel;
    topId: string | null;
}

export function everyDay(ledger: Ledger, period: Period, scope: Scope, categories: readonly string[]) {
    const last = ledger.today < period.to ? ledger.today : period.to;
    const picked = new Set(categories);
    const rows = rowsBetween(ledger, scope, period.from, last, false).filter(
        (row) => picked.size === 0 || picked.has(row.topId)
    );
    const byDay = Map.groupBy(rows, (row) => row.day);
    const elapsed = daysFrom(period.from, last).length;
    const spent = total(ledger, rows);
    const average = elapsed > 0 ? round(ledger, spent / elapsed) : 0;
    const cells: DayCell[] = daysFrom(period.from, period.to).map((day) => {
        const dayRows = byDay.get(day) ?? [];
        const amount = total(ledger, dayRows);
        return { amount, day, level: levelOf(amount, average), topId: biggestCategory(dayRows) };
    });
    const [first, ...rest] = cells.filter((cell) => cell.amount > 0).toSorted((a, b) => b.amount - a.amount);
    const second = first && rest.find((cell) => cell.topId !== first.topId || cell.amount !== first.amount);
    return {
        average,
        cells,
        entries: foldFees(rows).length,
        lead: (new Date(wallNoon(period.from)).getUTCDay() - ledger.firstWeekday + 8) % 7,
        measured: cells.slice(0, elapsed),
        runnerUp: second ?? null,
        top: first ?? null,
    };
}

const isEntry = (row: FoldedRow): row is FoldedRow & LedgerRow => !("fromId" in row);

export function dayEntries(ledger: Ledger, day: string, scope: Scope, categories: readonly string[]) {
    const picked = new Set(categories);
    const rows = foldFees(
        rowsBetween(ledger, scope, day, day, false).filter((row) => picked.size === 0 || picked.has(row.topId))
    ).filter(isEntry);
    return rows
        .map((row) => ({ amount: figureOf(ledger, row).amount, id: row.id, note: row.note, topId: row.topId }))
        .toSorted((a, b) => b.amount - a.amount);
}

function biggestCategory(rows: readonly LedgerRow[]) {
    const totals = new Map<string, number>();
    for (const row of rows) {
        totals.set(row.topId, (totals.get(row.topId) ?? 0) + row.amount);
    }
    return [...totals].toSorted((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

export function budgetRows(
    ledger: Pick<Ledger, "budgetTargets" | "currency">,
    standings: ReadonlyMap<string, CategoryBudget>
) {
    const rows = [...standings].flatMap(([id, standing]) => {
        const category = ledger.budgetTargets.get(id);
        return category ? [{ category, standing }] : [];
    });
    const counted = rows.filter(({ category }) => category.id === category.topId || !standings.has(category.topId));
    const limit = counted.reduce((sum, { standing }) => sum + standing.effectiveLimit, 0);
    const spent = counted.reduce((sum, { standing }) => sum + standing.spent, 0);
    return {
        left: round(ledger, limit - spent),
        limit: round(ledger, limit),
        over: rows.filter((row) => row.standing.overBudget).length,
        rows: rows.toSorted(
            (a, b) => b.standing.spent - a.standing.spent || b.standing.effectiveLimit - a.standing.effectiveLimit
        ),
    };
}

const RECENT_SHOWN = 2;

// What's picked pins to the top; the rest of the list only offers categories with spending to narrow to.
export function categoryChoices(ledger: Ledger, period: Period, scope: Scope, picked: readonly string[]) {
    const { categories } = spendSeries(ledger, period, { ...scope, category: null });
    const totals = new Map(categories.map((each) => [each.id, each.total]));
    const recentIds = [...picked];
    for (const row of ledger.rows.toSorted((a, b) => b.at - a.at)) {
        if (recentIds.length >= RECENT_SHOWN) {
            break;
        }
        if (!row.income && (totals.get(row.topId) ?? 0) > 0 && !recentIds.includes(row.topId)) {
            recentIds.push(row.topId);
        }
    }
    const every = [...ledger.categories.values()].map((category) => ({
        ...category,
        total: totals.get(category.id) ?? 0,
    }));
    return {
        all: every
            .filter((each) => !recentIds.includes(each.id) && each.total > 0)
            .toSorted((a, b) => a.name.localeCompare(b.name)),
        recent: recentIds.flatMap((id) => every.filter((each) => each.id === id)),
    };
}

export type SetupStep = "account" | "budget" | "entry";

export interface SetupState {
    done: Record<SetupStep, boolean>;
    firstSpendTopId: string | null;
    spent: number;
    step: SetupStep;
}

// The placeholder table holds six rows; past that a ledger is in use, and accounts and budgets are optional.
const SETUP_ENTRY_LIMIT = 6;

export function setupState(ledger: Ledger): SetupState | null {
    const done = {
        account: ledger.books.accounts.some((row) => row.deletedAt === null),
        budget: ledger.books.budgets.some((row) => row.deletedAt === null),
        entry: ledger.rows.length > 0,
    };
    const step = (["account", "entry", "budget"] as const).find((each) => !done[each]);
    if (!step || ledger.rows.length + ledger.transfers.length >= SETUP_ENTRY_LIMIT) {
        return null;
    }
    const spending = ledger.rows.filter((row) => !row.income).toSorted((a, b) => a.at - b.at);
    return { done, firstSpendTopId: spending[0]?.topId ?? null, spent: total(ledger, spending), step };
}

export function homeCovered(ledger: Ledger, period: Period) {
    const { opening } = ledger;
    if (opening === null) {
        return true;
    }
    const reaches = (day: string) => startOfDay(ledger, day) >= opening.cutoff;
    const [earliest] = sparkPeriods(ledger, period);
    const recent = ledger.rows.filter((row) => row.at >= opening.cutoff).length;
    const carries = ledger.books.budgets.some((row) => row.deletedAt === null && row.rollover);
    return (
        earliest !== undefined &&
        reaches(earliest.from) &&
        reaches(period.from) &&
        recent >= SETUP_ENTRY_LIMIT &&
        !carries &&
        [...rangeBudgets(ledger, period).values()].every((standing) => reaches(standing.from))
    );
}

export function whatIfStep(income: number) {
    if (income <= 0) {
        return CENT;
    }
    const rough = income / WHAT_IF_STOPS;
    const power = 10 ** Math.floor(Math.log10(rough));
    const nice = NICE_STEPS.find((each) => each * power >= rough) ?? 1;
    return Math.max(Number((nice * power).toFixed(2)), CENT);
}

export function snapWhatIf(value: number, step: number, income: number) {
    if (value >= income) {
        return income;
    }
    return Math.max(0, Math.min(income, Number((Math.round(value / step) * step).toFixed(2))));
}
