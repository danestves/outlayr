import { useAtomMount } from "@effect/atom-react/Hooks";
import { categoryBudgetFigures, overallBudgetFigures } from "@outlayr/money/budget-figures";
import { carryWindows } from "@outlayr/money/budget-rollover";
import type { ExpenseContribution } from "@outlayr/money/budget-spent";
import {
    advanceBudgetWindow,
    BUDGET_TYPE,
    periodEnd,
    periodsBackTo,
    shiftWindow,
    startOfPeriod,
    windowEndMs,
} from "@outlayr/money/budget-window";
import type { BudgetWindow } from "@outlayr/money/budget-window";
import { utcDateString } from "@outlayr/money/dates";
import { sumValuedIn, valueDatedRowsIn } from "@outlayr/money/valuation";
import type { DatedValuable, RateTable } from "@outlayr/money/valuation";
import { and, asc, desc, eq, getTableColumns, gte, inArray, isNull, lte } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Atom from "effect/reactivity/Atom";
import { useMemo } from "react";

import { useSettingNumber } from "@/contexts/display-settings-context";
import type { Database } from "@/db/client";
import { budgets, mainBudget, transactions } from "@/db/schema";
import { buildBurndown } from "@/domain/budget-burndown";
import type { Burndown } from "@/domain/budget-burndown";
import { closedWindowsBefore, EVERY_SCOPE, spendPerWindow, typicalOf } from "@/domain/budget-typical";
import { translateNow } from "@/i18n/runtime";
import { appRuntime } from "@/lib/runtime";

import { expenseContributionQuery } from "./budget-spent";
import { budgetsRepo } from "./budgets-core";
import { useCategoryMeta } from "./categories";
import { useLiveQuery } from "./live-query";
import { useDecoratedRows } from "./transactions";
import type { TransactionWithCategory } from "./transactions";
import { usePendingDeletes } from "./use-deferred-delete";
import { useValuation } from "./use-valuation";

export { type BudgetSeverity, compareBudgetSeverity } from "@/domain/budget-severity";

export type Budget = typeof budgets.$inferSelect;

interface StartAdvance {
    readonly id: string;
    readonly kind: "budget" | "main";
    readonly startMs: number;
}

const startAdvancesAtom = Atom.family((db: Database) =>
    Atom.family((advances: readonly StartAdvance[]) =>
        appRuntime
            .atom(
                Effect.all(
                    advances.map(({ id, kind, startMs }) =>
                        kind === "main"
                            ? budgetsRepo.advanceMainStart(db, id, new Date(startMs))
                            : budgetsRepo.advanceBudgetStart(db, id, new Date(startMs))
                    ),
                    { concurrency: "unbounded", discard: true }
                ).pipe(
                    Effect.catchTags({ BudgetsError: (error) => Effect.logWarning(error.message, error.cause) }),
                    Effect.uninterruptible
                )
            )
            .pipe(Atom.withLabel("budgets:advance-starts"))
    )
);

function pendingAdvances(
    kind: StartAdvance["kind"],
    rows: readonly Pick<Budget, "id" | "startDate" | "type">[],
    now: Date
): StartAdvance[] {
    const advances: StartAdvance[] = [];
    for (const row of rows) {
        if (!row.startDate) {
            continue;
        }
        const { start } = advanceBudgetWindow(row.startDate, row.type, now);
        if (start.getTime() !== row.startDate.getTime()) {
            advances.push({ id: row.id, kind, startMs: start.getTime() });
        }
    }
    return advances;
}

export interface CategoryBudgetView {
    amount: number;
    anchor: Date;
    /** Signed: unspent allowance inherited, or an overspend still being paid off. */
    carry: number;
    categoryId: string | null;
    color: string;
    currency: string | null;
    customName: string | null;
    emoji: string | null;
    icon: string | null;
    id: string;
    leftover: number;
    limit: number;
    name: string;
    overBudget: boolean;
    rollover: boolean;
    spent: number;
    type: number;
    window: BudgetWindow;
}

export interface MainBudgetView {
    amount: number;
    anchor: Date;
    carry: number;
    currency: string | null;
    customName: string | null;
    id: string;
    leftover: number;
    limit: number;
    name: string;
    overBudget: boolean;
    periodsBack: number;
    rollover: boolean;
    spent: number;
    type: number;
    window: BudgetWindow;
}

export function earliestDate(rows: readonly { date: Date }[]): Date | null {
    let earliest: Date | null = null;
    for (const row of rows) {
        if (earliest === null || row.date.getTime() < earliest.getTime()) {
            earliest = row.date;
        }
    }
    return earliest;
}

export function expenseContributionsFrom(
    rows: readonly (DatedValuable & { categoryId: string | null })[],
    categoryMeta: ReadonlyMap<string, { parentId: string | null }>,
    displayCurrency: string,
    rates: RateTable
): ExpenseContribution[] {
    const valued = valueDatedRowsIn(rows, displayCurrency, rates);
    return rows.map((row, index) => ({
        // `amount` is the valued amount from here down, not the row's stored one.
        amount: valued[index],
        categoryId: row.categoryId,
        date: row.date,
        parentId: row.categoryId ? (categoryMeta.get(row.categoryId)?.parentId ?? null) : null,
    }));
}

// `useLiveQuery` registers a listener per call: call this once per screen and thread the result down, or one insert
// re-runs the same full scan N times.
export function useExpenseContributions(
    db: Database,
    nowMs: number,
    sinceMs: number | null = null
): ExpenseContribution[] {
    const pending = usePendingDeletes();
    const data = useLiveQuery(
        transactions,
        () => expenseContributionQuery(db, new Date(nowMs), sinceMs === null ? null : new Date(sinceMs), pending),
        [nowMs, sinceMs, pending],
        nowMs
    );

    const categoryMeta = useCategoryMeta(db);
    const valuation = useValuation(db);

    return expenseContributionsFrom(data, categoryMeta, valuation.displayCurrency, valuation.rates);
}

// Null means no budget is set, never "not read yet": the read runs in render. Only the current window is written
// back: browsing a closed one must not move the anchor the budget runs on.
export function useMainBudget(
    db: Database,
    nowMs: number,
    contributions: readonly ExpenseContribution[],
    periodOffset = 0
): MainBudgetView | null {
    const data = useLiveQuery(mainBudget, () =>
        db.select().from(mainBudget).where(isNull(mainBudget.deletedAt)).limit(1)
    );
    const row = data[0] ?? null;
    const { displayCurrency, rates } = useValuation(db);

    useAtomMount(startAdvancesAtom(db)(pendingAdvances("main", row ? [row] : [], new Date(nowMs))));

    if (!row) {
        return null;
    }
    const now = new Date(nowMs);
    const current = advanceBudgetWindow(row.startDate ?? now, row.type, now);
    const figures = overallBudgetFigures(row, contributions, { displayCurrency, now, periodOffset, rates });
    return {
        ...figures,
        anchor: row.startDate ?? figures.window.start,
        currency: row.currency,
        customName: row.name?.trim() ? row.name.trim() : null,
        id: row.id,
        name: row.name?.trim() ? row.name.trim() : translateNow("budgets.scope.everything"),
        periodsBack: periodsBackTo(current.start, row.type, earliestDate(contributions)),
        rollover: row.rollover,
        type: row.type,
    };
}

export function useBurndown(
    contributions: readonly ExpenseContribution[],
    nowMs: number,
    budget: { amount: number; window: BudgetWindow } | null,
    categoryId: string | null = null
): Burndown | null {
    return useMemo(() => {
        if (!budget) {
            return null;
        }
        return buildBurndown(contributions, {
            categoryId,
            limit: budget.amount,
            now: new Date(nowMs),
            window: budget.window,
        });
    }, [contributions, budget, nowMs, categoryId]);
}

export function useBurndowns(
    contributions: readonly ExpenseContribution[],
    nowMs: number,
    budgetList: readonly CategoryBudgetView[]
): Map<string, Burndown> {
    return useMemo(() => {
        const now = new Date(nowMs);
        const series = new Map<string, Burndown>();
        for (const budget of budgetList) {
            series.set(
                budget.id,
                buildBurndown(contributions, {
                    categoryId: budget.categoryId,
                    limit: budget.amount,
                    now,
                    window: budget.window,
                })
            );
        }
        return series;
    }, [contributions, budgetList, nowMs]);
}

/** Reads no row before {@link overBudgetReadStart}. */
export function usePerCategoryBudgets(
    db: Database,
    nowMs: number,
    contributions: readonly ExpenseContribution[]
): CategoryBudgetView[] {
    const rows = useLiveQuery(budgets, () =>
        db
            .select(getTableColumns(budgets))
            .from(budgets)
            .where(isNull(budgets.deletedAt))
            .orderBy(asc(budgets.dateCreated))
    );
    const categoryMeta = useCategoryMeta(db);
    const { displayCurrency, rates } = useValuation(db);

    useAtomMount(startAdvancesAtom(db)(pendingAdvances("budget", rows, new Date(nowMs))));

    const now = new Date(nowMs);
    return rows.map((row) => {
        const figures = categoryBudgetFigures(row, contributions, { displayCurrency, now, rates });
        const meta = row.categoryId ? categoryMeta.get(row.categoryId) : undefined;
        return {
            ...figures,
            anchor: row.startDate ?? figures.window.start,
            categoryId: row.categoryId,
            color: meta?.color ?? "#767676",
            currency: row.currency,
            customName: row.name?.trim() ? row.name.trim() : null,
            emoji: meta?.emoji ?? null,
            icon: meta?.icon ?? null,
            id: row.id,
            name: row.name?.trim() ? row.name.trim() : (meta?.name ?? "Budget"),
            rollover: row.rollover,
            type: row.type,
        };
    });
}

// Moved back to its UTC midnight: valuation converts a currency's rows a UTC day at a time, and a row's value depends
// on that day's earlier rows.
export function overBudgetReadStart(rows: readonly Budget[], now: Date): number | null {
    let earliest: number | null = null;
    for (const row of rows) {
        if (!row.categoryId) {
            continue;
        }
        const window = advanceBudgetWindow(row.startDate ?? now, row.type, now);
        const carried = row.rollover
            ? carryWindows({ anchor: row.dateCreated ?? window.start, current: window, type: row.type }).windows.at(-1)
            : undefined;
        const from = (carried ?? window).start.getTime();
        earliest = earliest === null ? from : Math.min(earliest, from);
    }
    return earliest === null ? null : Date.parse(utcDateString(earliest));
}

export function useOverBudgetCount(db: Database, nowMs: number): number {
    const rows = useLiveQuery(budgets, () =>
        db.select(getTableColumns(budgets)).from(budgets).where(isNull(budgets.deletedAt))
    );
    const sinceMs = overBudgetReadStart(rows, new Date(nowMs)) ?? nowMs + 1;
    const contributions = useExpenseContributions(db, nowMs, sinceMs);
    const perCategory = usePerCategoryBudgets(db, nowMs, contributions);
    return perCategory.reduce((count, budget) => (budget.overBudget ? count + 1 : count), 0);
}

export interface CategoryBudgetDetail {
    budget: CategoryBudgetView | null;
    contributions: readonly ExpenseContribution[];
    periodsBack: number;
    transactions: TransactionWithCategory[];
}

export function useCategoryBudget(db: Database, id: string, nowMs: number, periodOffset = 0): CategoryBudgetDetail {
    const data = useLiveQuery(
        budgets,
        () =>
            db
                .select(getTableColumns(budgets))
                .from(budgets)
                .where(and(eq(budgets.id, id), isNull(budgets.deletedAt)))
                .limit(1),
        [id]
    );
    const row = data[0] ?? null;
    const categoryMeta = useCategoryMeta(db);
    const { displayCurrency, rates } = useValuation(db);

    const windows = viewedWindows(row, nowMs, periodOffset);

    useAtomMount(startAdvancesAtom(db)(pendingAdvances("budget", row ? [row] : [], new Date(nowMs))));

    const { current, window, windowEnd } = windows;
    const windowTransactions = useBudgetContributions(
        db,
        row?.categoryId ?? null,
        window ? window.start : null,
        windowEnd
    );

    const earliest = useEarliestContribution(db, row?.categoryId ?? null);
    // The same read the list uses, so the list and its detail can't disagree on what a window inherited.
    const contributions = useExpenseContributions(db, nowMs);

    let budget: CategoryBudgetView | null = null;
    if (row && window) {
        const figures = categoryBudgetFigures(row, contributions, {
            displayCurrency,
            now: new Date(nowMs),
            periodOffset,
            rates,
            spent: sumValuedIn(windowTransactions, displayCurrency, rates),
        });
        const meta = row.categoryId ? categoryMeta.get(row.categoryId) : undefined;
        budget = {
            ...figures,
            anchor: row.startDate ?? figures.window.start,
            categoryId: row.categoryId,
            color: meta?.color ?? "#767676",
            currency: row.currency,
            customName: row.name?.trim() ? row.name.trim() : null,
            emoji: meta?.emoji ?? null,
            icon: meta?.icon ?? null,
            id: row.id,
            name: row.name?.trim() ? row.name.trim() : (meta?.name ?? "Budget"),
            rollover: row.rollover,
            type: row.type,
        };
    }

    const periodsBack = current && row ? periodsBackTo(current.start, row.type, earliest) : 0;

    return { budget, contributions, periodsBack, transactions: windowTransactions };
}

function viewedWindows(row: Budget | null, nowMs: number, periodOffset: number) {
    const now = new Date(nowMs);
    const current = row ? advanceBudgetWindow(row.startDate ?? now, row.type, now) : null;
    const window = current && row ? shiftWindow(current.start, row.type, periodOffset) : null;
    return { current, window, windowEnd: window ? windowEndMs(window, nowMs) : nowMs };
}

// A sorted fetch's first row, not `min()`: the aggregate comes back as a raw column the driver doesn't map to a Date.
function useEarliestContribution(db: Database, categoryId: string | null): Date | null {
    const categoryMeta = useCategoryMeta(db);

    const contributingIds = contributingCategoryIds(categoryId, categoryMeta);
    const contributingKey = contributingIds?.join(",") ?? "";

    const rows = useLiveQuery(
        transactions,
        () =>
            db
                .select({ date: transactions.date })
                .from(transactions)
                .where(
                    and(
                        eq(transactions.income, false),
                        isNull(transactions.deletedAt),
                        contributingIds ? inArray(transactions.categoryId, contributingIds) : undefined
                    )
                )
                .orderBy(asc(transactions.date))
                .limit(1),
        [contributingKey]
    );

    return rows[0]?.date ?? null;
}

function contributingCategoryIds(
    categoryId: string | null,
    categoryMeta: ReadonlyMap<string, { parentId: string | null }>
): string[] | null {
    if (!categoryId) {
        return null;
    }
    const ids = [categoryId];
    for (const [id, meta] of categoryMeta) {
        if (meta.parentId === categoryId) {
            ids.push(id);
        }
    }
    return ids;
}

// Children are resolved in JS and matched with `inArray`, not joined: a join on `categories.parentId` makes the row
// set depend on a table the subscription doesn't watch, so re-parenting a subcategory silently goes stale.
export function useBudgetContributions(
    db: Database,
    categoryId: string | null,
    start: Date | null,
    endMs: number
): TransactionWithCategory[] {
    const startMs = start ? start.getTime() : endMs + 1;
    const categoryMeta = useCategoryMeta(db);

    const contributingIds = contributingCategoryIds(categoryId, categoryMeta);

    const contributingKey = contributingIds?.join(",") ?? "";

    const data = useLiveQuery(
        transactions,
        () =>
            db
                .select(getTableColumns(transactions))
                .from(transactions)
                .where(
                    and(
                        eq(transactions.income, false),
                        isNull(transactions.deletedAt),
                        gte(transactions.date, new Date(startMs)),
                        lte(transactions.date, new Date(endMs)),
                        contributingIds ? inArray(transactions.categoryId, contributingIds) : undefined
                    )
                )
                .orderBy(desc(transactions.date), asc(transactions.feeForId)),
        [contributingKey, startMs, endMs]
    );

    return useDecoratedRows(db, data);
}

export interface UnbudgetedScope {
    categoryId: string;
    color: string;
    emoji: string | null;
    icon: string | null;
    name: string;
    typical: number;
}

export interface UnbudgetedRail {
    everything: number | null;
    scopes: UnbudgetedScope[];
    window: BudgetWindow;
}

// Top-level only: a subcategory's spend already counts toward its parent, so offering both asks for the money twice.
export function useUnbudgetedScopes(
    db: Database,
    nowMs: number,
    contributions: readonly ExpenseContribution[]
): UnbudgetedRail {
    const rows = useLiveQuery(budgets, () =>
        db.select({ categoryId: budgets.categoryId }).from(budgets).where(isNull(budgets.deletedAt))
    );
    const categoryMeta = useCategoryMeta(db);
    const firstDayOfMonth = useSettingNumber("firstDayOfMonth");
    const firstWeekday = useSettingNumber("firstWeekday");

    const now = new Date(nowMs);
    const start = startOfPeriod(now, BUDGET_TYPE.month, { firstDayOfMonth, firstWeekday });
    const window = { end: periodEnd(start, BUDGET_TYPE.month), start };
    const totals = spendPerWindow(
        contributions,
        closedWindowsBefore({ current: window, since: earliestDate(contributions), type: BUDGET_TYPE.month })
    );
    const budgeted = new Set(rows.map((row) => row.categoryId));

    const scopes: UnbudgetedScope[] = [];
    for (const [categoryId, meta] of categoryMeta) {
        if (meta.parentId || budgeted.has(categoryId)) {
            continue;
        }
        const typical = typicalOf(totals.get(categoryId) ?? []);
        if (typical === null) {
            continue;
        }
        scopes.push({
            categoryId,
            color: meta.color ?? "#767676",
            emoji: meta.emoji,
            icon: meta.icon,
            name: meta.name ?? translateNow("budgets.name.default"),
            typical,
        });
    }
    scopes.sort((left, right) => right.typical - left.typical);

    return { everything: typicalOf(totals.get(EVERY_SCOPE) ?? []), scopes, window };
}
