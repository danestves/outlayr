import type { BudgetWindow } from "@outlayr/money/budget-window";
import { monthPeriodStart } from "@outlayr/money/calendar";

import { typicalOf } from "./budget-typical";
import { median } from "./stats";

/**
 * `yyyymm`, a calendar month and never an instant: a plan written in one time zone must stay on the same month
 * when the phone moves to another.
 */
export type MonthKey = number;

export type PlanSource = "plan" | "budget" | "scheduled" | "typical";

export type MonthStatus = "closed" | "current" | "ahead";

const TYPICAL_LOOKBACK = 6;

export function monthKey(year: number, monthIndex: number): MonthKey {
    const normalized = new Date(year, monthIndex, 1);
    return normalized.getFullYear() * 100 + normalized.getMonth() + 1;
}

export function monthKeyParts(key: MonthKey) {
    return { monthIndex: (key % 100) - 1, year: Math.floor(key / 100) };
}

export function shiftMonthKey(key: MonthKey, count: number): MonthKey {
    const { monthIndex, year } = monthKeyParts(key);
    return monthKey(year, monthIndex + count);
}

export function yearMonthKeys(year: number): MonthKey[] {
    return Array.from({ length: 12 }, (_, index) => monthKey(year, index));
}

// Mirrors `monthPeriodStart`: an anchor past the 28th would skip February.
function anchorDay(firstDayOfMonth: number): number {
    return Math.min(Math.max(1, firstDayOfMonth), 28);
}

/** The budget month that opens in this calendar month, so an anchor on the 15th runs to the 15th of the next. */
export function monthKeyWindow(key: MonthKey, firstDayOfMonth: number): BudgetWindow {
    const { monthIndex, year } = monthKeyParts(key);
    const day = anchorDay(firstDayOfMonth);
    return { end: new Date(year, monthIndex + 1, day), start: new Date(year, monthIndex, day) };
}

export function monthKeyAt(date: Date, firstDayOfMonth: number): MonthKey {
    const start = monthPeriodStart(date, firstDayOfMonth);
    return monthKey(start.getFullYear(), start.getMonth());
}

export interface PlanCategory {
    id: string;
    income: boolean;
}

/** Valued into the display currency, filed under its top-level category. */
export interface PlanFlow {
    amount: number;
    categoryId: string;
    date: Date;
    income: boolean;
}

export interface PlanGoal {
    id: string;
    perMonth: number;
    /** The last month the goal still asks for money. */
    throughKey: MonthKey;
}

export interface YearPlanInput {
    budgets: ReadonlyMap<string, number>;
    categories: readonly PlanCategory[];
    firstDayOfMonth: number;
    /** Logged, dated on or before `now`; reaching six months before the current one feeds `typical`. */
    flows: readonly PlanFlow[];
    goals: readonly PlanGoal[];
    now: Date;
    plans: ReadonlyMap<string, ReadonlyMap<MonthKey, number>>;
    /** Occurrences still to come, dated after `now`. */
    scheduled: readonly PlanFlow[];
    year: number;
}

export interface CategoryMonth {
    actual: number;
    categoryId: string;
    income: boolean;
    planned: number;
    /** Closed: what was logged. Current: the larger of logged and planned. Ahead: planned. */
    projected: number;
    source: PlanSource | null;
}

export interface MonthProjection {
    categories: CategoryMonth[];
    goals: { amount: number; goalId: string }[];
    in: number;
    inActual: number;
    inPlanned: number;
    key: MonthKey;
    left: number;
    out: number;
    outActual: number;
    outPlanned: number;
    setAside: number;
    status: MonthStatus;
    window: BudgetWindow;
}

export interface YearProjection {
    months: MonthProjection[];
    monthsAhead: number;
    totals: { in: number; out: number; setAside: number };
    typical: ReadonlyMap<string, number>;
    unassigned: number;
    year: number;
}

function totalsByCategory(flows: readonly PlanFlow[], window: BudgetWindow): Map<string, number> {
    const totals = new Map<string, number>();
    const start = window.start.getTime();
    const end = window.end.getTime();
    for (const flow of flows) {
        const at = flow.date.getTime();
        if (at >= start && at < end) {
            totals.set(flow.categoryId, (totals.get(flow.categoryId) ?? 0) + flow.amount);
        }
    }
    return totals;
}

function typicalByCategory(input: YearPlanInput, currentKey: MonthKey): Map<string, number> {
    const earliest = input.flows.reduce((min, flow) => Math.min(min, flow.date.getTime()), Number.POSITIVE_INFINITY);
    const windows: BudgetWindow[] = [];
    for (let back = 1; back <= TYPICAL_LOOKBACK; back += 1) {
        const window = monthKeyWindow(shiftMonthKey(currentKey, -back), input.firstDayOfMonth);
        if (window.end.getTime() <= earliest) {
            break;
        }
        windows.push(window);
    }
    const perWindow = windows.map((window) => totalsByCategory(input.flows, window));
    const typical = new Map<string, number>();
    for (const category of input.categories) {
        const value = typicalOf(perWindow.map((totals) => totals.get(category.id) ?? 0));
        if (value !== null) {
            typical.set(category.id, value);
        }
    }
    return typical;
}

function statusOf(window: BudgetWindow, now: Date): MonthStatus {
    if (window.end.getTime() <= now.getTime()) {
        return "closed";
    }
    return window.start.getTime() <= now.getTime() ? "current" : "ahead";
}

interface Resolved {
    planned: number;
    source: PlanSource | null;
}

function resolvePlan(
    input: YearPlanInput,
    category: PlanCategory,
    key: MonthKey,
    scheduledEstimate: number,
    typical: number | undefined
): Resolved {
    const explicit = input.plans.get(category.id)?.get(key);
    if (explicit !== undefined) {
        return { planned: explicit, source: "plan" };
    }
    const budget = category.income ? undefined : input.budgets.get(category.id);
    if (budget !== undefined) {
        return { planned: budget, source: "budget" };
    }
    if (scheduledEstimate > 0 && scheduledEstimate >= (typical ?? 0)) {
        return { planned: scheduledEstimate, source: "scheduled" };
    }
    if (typical !== undefined) {
        return { planned: typical, source: "typical" };
    }
    return { planned: 0, source: null };
}

function projectMonth(
    input: YearPlanInput,
    key: MonthKey,
    currentKey: MonthKey,
    typical: ReadonlyMap<string, number>
): MonthProjection {
    const window = monthKeyWindow(key, input.firstDayOfMonth);
    const status = statusOf(window, input.now);
    const actuals = totalsByCategory(input.flows, window);
    const scheduled = status === "closed" ? new Map<string, number>() : totalsByCategory(input.scheduled, window);

    const categories: CategoryMonth[] = [];
    for (const category of input.categories) {
        const actual = status === "ahead" ? 0 : (actuals.get(category.id) ?? 0);
        // The running month's schedule only holds what is still to come, so what landed already counts toward it.
        const scheduledEstimate = (status === "current" ? actual : 0) + (scheduled.get(category.id) ?? 0);
        const { planned, source } = resolvePlan(input, category, key, scheduledEstimate, typical.get(category.id));
        if (actual === 0 && planned === 0) {
            continue;
        }
        let projected = planned;
        if (status === "closed") {
            projected = actual;
        } else if (status === "current") {
            projected = Math.max(actual, planned);
        }
        categories.push({ actual, categoryId: category.id, income: category.income, planned, projected, source });
    }

    const goals =
        status === "closed"
            ? []
            : input.goals
                  .filter((goal) => goal.perMonth > 0 && key >= currentKey && key <= goal.throughKey)
                  .map((goal) => ({ amount: goal.perMonth, goalId: goal.id }));

    let inProjected = 0;
    let outProjected = 0;
    let inActual = 0;
    let outActual = 0;
    let inPlanned = 0;
    let outPlanned = 0;
    for (const entry of categories) {
        if (entry.income) {
            inProjected += entry.projected;
            inActual += entry.actual;
            inPlanned += entry.planned;
        } else {
            outProjected += entry.projected;
            outActual += entry.actual;
            outPlanned += entry.planned;
        }
    }
    const setAside = goals.reduce((sum, goal) => sum + goal.amount, 0);

    return {
        categories,
        goals,
        in: inProjected,
        inActual,
        inPlanned,
        key,
        left: inProjected - outProjected - setAside,
        out: outProjected,
        outActual,
        outPlanned,
        setAside,
        status,
        window,
    };
}

export function projectYear(input: YearPlanInput): YearProjection {
    const currentKey = monthKeyAt(input.now, input.firstDayOfMonth);
    const typical = typicalByCategory(input, currentKey);
    const months = yearMonthKeys(input.year).map((key) => projectMonth(input, key, currentKey, typical));
    const totals = { in: 0, out: 0, setAside: 0 };
    for (const month of months) {
        totals.in += month.in;
        totals.out += month.out;
        totals.setAside += month.setAside;
    }
    return {
        months,
        monthsAhead: months.filter((month) => month.status !== "closed").length,
        totals,
        typical,
        unassigned: totals.in - totals.out - totals.setAside,
        year: input.year,
    };
}

/** One projected month outside the year view, such as January of next year from the month stepper. */
export function projectMonthAt(input: YearPlanInput, key: MonthKey): MonthProjection {
    const currentKey = monthKeyAt(input.now, input.firstDayOfMonth);
    return projectMonth(input, key, currentKey, typicalByCategory(input, currentKey));
}

export const isShort = (month: MonthProjection): boolean => month.status !== "closed" && month.left < -0.5;

export interface ShortRun {
    driver: string | null;
    from: MonthKey;
    to: MonthKey;
    /** The first month after the run that covers its plan, or null when the year ends short. */
    backIn: MonthKey | null;
}

/** How far above its usual month a category runs; the usual is its median projection over the year. */
function deviations(projection: YearProjection, months: readonly MonthProjection[]): Map<string, number> {
    const series = new Map<string, number[]>();
    for (const [index, month] of projection.months.entries()) {
        for (const entry of month.categories) {
            if (entry.income) {
                continue;
            }
            let values = series.get(entry.categoryId);
            if (!values) {
                values = Array.from({ length: projection.months.length }, () => 0);
                series.set(entry.categoryId, values);
            }
            values[index] = entry.projected;
        }
    }
    const lift = new Map<string, number>();
    for (const month of months) {
        for (const entry of month.categories) {
            const usual = median(series.get(entry.categoryId) ?? []) ?? 0;
            const above = entry.projected - usual;
            if (!entry.income && above > 0) {
                lift.set(entry.categoryId, (lift.get(entry.categoryId) ?? 0) + above);
            }
        }
    }
    return lift;
}

function largest(lift: ReadonlyMap<string, number>): string | null {
    let best: string | null = null;
    let bestValue = 0.5;
    for (const [categoryId, value] of lift) {
        if (value > bestValue) {
            best = categoryId;
            bestValue = value;
        }
    }
    return best;
}

/** The category that pushes this month above its usual shape, if one does. */
export function monthDriver(projection: YearProjection, month: MonthProjection): string | null {
    return largest(deviations(projection, [month]));
}

export function firstShortRun(projection: YearProjection): ShortRun | null {
    const { months } = projection;
    const start = months.findIndex(isShort);
    if (start === -1) {
        return null;
    }
    let end = start;
    while (end + 1 < months.length && isShort(months[end + 1])) {
        end += 1;
    }
    const run = months.slice(start, end + 1);
    return {
        backIn: months[end + 1]?.key ?? null,
        driver: largest(deviations(projection, run)),
        from: months[start].key,
        to: months[end].key,
    };
}

export interface TrimEffect {
    after: YearProjection;
    /** Months that ran short before and cover their plan after. */
    fixed: MonthKey[];
    /** Extra money the trim leaves unassigned across the year. */
    freed: number;
    /** The running month when logged spend already passes the new amount and it still ends short. */
    stillShort: { by: number; key: MonthKey; spent: number } | null;
}

export function withPlannedMonths(
    input: YearPlanInput,
    categoryId: string,
    amounts: ReadonlyMap<MonthKey, number>
): YearPlanInput {
    const plans = new Map(input.plans);
    plans.set(categoryId, new Map([...(input.plans.get(categoryId) ?? new Map<MonthKey, number>()), ...amounts]));
    return { ...input, plans };
}

export function trimMonths(fromKey: MonthKey, throughKey: MonthKey, amount: number): Map<MonthKey, number> {
    const amounts = new Map<MonthKey, number>();
    for (let key = fromKey; key <= throughKey; key = shiftMonthKey(key, 1)) {
        amounts.set(key, amount);
    }
    return amounts;
}

export function trimEffect(
    input: YearPlanInput,
    before: YearProjection,
    categoryId: string,
    amount: number,
    fromKey: MonthKey,
    throughKey: MonthKey
): TrimEffect {
    const after = projectYear(withPlannedMonths(input, categoryId, trimMonths(fromKey, throughKey, amount)));
    const fixed = before.months
        .filter((month, index) => isShort(month) && !isShort(after.months[index]))
        .map((month) => month.key);
    const current = after.months.find((month) => month.status === "current");
    const spent = current?.categories.find((entry) => entry.categoryId === categoryId)?.actual ?? 0;
    const stillShort =
        current && isShort(current) && spent > amount ? { by: -current.left, key: current.key, spent } : null;
    return { after, fixed, freed: after.unassigned - before.unassigned, stillShort };
}

export interface EditorMonth {
    key: MonthKey;
    /** Closed months show what was logged and cannot be dragged. */
    locked: boolean;
    planned: number;
    source: PlanSource | null;
    value: number;
}

export function editorMonths(projection: YearProjection, categoryId: string): EditorMonth[] {
    return projection.months.map((month) => {
        const entry = month.categories.find((candidate) => candidate.categoryId === categoryId);
        const locked = month.status === "closed";
        return {
            key: month.key,
            locked,
            planned: entry?.planned ?? 0,
            source: entry?.source ?? null,
            value: locked ? (entry?.actual ?? 0) : (entry?.planned ?? 0),
        };
    });
}

/** The editable month furthest above typical, for the note under the editor's chart. */
export function aboveTypical(
    months: readonly EditorMonth[],
    typical: number | null
): { by: number; key: MonthKey } | null {
    if (typical === null) {
        return null;
    }
    let best: { by: number; key: MonthKey } | null = null;
    for (const month of months) {
        const by = month.value - typical;
        if (!month.locked && by >= 1 && (best === null || by > best.by)) {
            best = { by, key: month.key };
        }
    }
    return best;
}

/** The closed month that overshot a plan someone set (a plan row or a budget), by the most. */
export function overPlan(months: readonly EditorMonth[]): { by: number; key: MonthKey } | null {
    let best: { by: number; key: MonthKey } | null = null;
    for (const month of months) {
        const intended = month.source === "plan" || month.source === "budget";
        const by = month.value - month.planned;
        if (month.locked && intended && by >= 1 && (best === null || by > best.by)) {
            best = { by, key: month.key };
        }
    }
    return best;
}
