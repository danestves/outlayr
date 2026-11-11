import type { StoredBudget } from "@outlayr/money/budget-standing";
import { typicalOf, windowsOver } from "@outlayr/money/budget-typical";

import type { Budget, BudgetDraft, MainBudget } from "@/lib/budget-writes";
import { windowAnchorDay } from "@/lib/budget-writes";
import { periodInstant, standingAt } from "@/lib/dashboard-series";
import type { CategoryBudget } from "@/lib/dashboard-series";
import { endOfDay, round, startOfDay, UNCATEGORIZED_ID } from "@/lib/dashboard-series-ledger";
import type { Ledger, LedgerRow } from "@/lib/dashboard-series-ledger";
import { daysFrom, periodKeyOf, periodOf, shiftPeriodKey } from "@/lib/dashboard-series-period";
import type { Period } from "@/lib/dashboard-series-period";
import { addDays, daysBetween } from "@/lib/ledger";

export type Phase = "ahead" | "closed" | "current";

export type LineStatus = "held" | "notStarted" | "onTrack" | "over";

/** Months of history beside the window being read: the sparkline, the bars and the typical spend. */
export const LOOKBACK = 4;

/** How far ahead the month stepper reaches, so a limit can be read before its month opens. */
export const MONTHS_AHEAD = 12;

export const phaseOf = (ledger: Pick<Ledger, "today">, from: string, to: string): Phase => {
    if (to < ledger.today) {
        return "closed";
    }
    return from > ledger.today ? "ahead" : "current";
};

export interface BudgetLine {
    budget: Budget | MainBudget;
    /** Null for the overall limit. */
    categoryId: string | null;
    color: string;
    /** The category's own name, which a custom budget name stands in for. */
    categoryName: string;
    customName: string | null;
    /** Spent per month across `sparkMonths`, oldest first. */
    history: readonly number[];
    id: string;
    standing: CategoryBudget;
    status: LineStatus;
    table: "budgets" | "mainBudget";
}

export interface OpenLine {
    categoryId: string;
    color: string;
    history: readonly number[];
    name: string;
    /** Of everything spent in the period. */
    share: number;
    spent: number;
}

export interface Pace {
    /** Cumulative spending per day of the period, through today. */
    daily: readonly number[];
    days: readonly string[];
    daysLeft: number;
    /** What an even spend would have used by the start of today; null outside the running period. */
    even: number | null;
    left: number;
    limit: number;
    runOut: { day: string; daysEarly: number } | null;
    spent: number;
}

export interface BudgetsOverview {
    hasData: boolean;
    lines: readonly BudgetLine[];
    open: readonly OpenLine[];
    overall: BudgetLine | null;
    pace: Pace | null;
    period: Period;
    phase: Phase;
    sparkMonths: readonly string[];
    totals: {
        /** Over the categories with a limit. */
        limits: number;
        onTrack: number;
        open: number;
        over: number;
        spent: number;
        /** Everything spent in the period, with or without a limit. */
        total: number;
    };
}

const liveBudgets = (ledger: Ledger) =>
    ledger.books.budgets
        .filter((row) => row.deletedAt === null && row.categoryId !== null && ledger.budgetTargets.has(row.categoryId))
        .toSorted((a, b) => (a.dateCreated ?? 0) - (b.dateCreated ?? 0));

export const liveMainBudget = (ledger: Ledger) => ledger.books.mainBudget.find((row) => row.deletedAt === null) ?? null;

/** Oldest first wins, as `categoryBudgets` reads it: a second row on one category is a sync leftover. */
export function budgetOf(ledger: Ledger, categoryId: string) {
    return liveBudgets(ledger).find((row) => row.categoryId === categoryId) ?? null;
}

const lastDay = (ledger: Ledger, period: Pick<Period, "to">) => (period.to < ledger.today ? period.to : ledger.today);

function spentByDay(ledger: Ledger, categoryId: string | null, from: string, to: string) {
    const totals = new Map<string, number>();
    const rows =
        categoryId === null
            ? ledger.rows.filter((row) => !row.income)
            : (ledger.expensesByCategory.get(categoryId) ?? []);
    for (const row of rows) {
        if (row.day >= from && row.day <= to) {
            totals.set(row.day, (totals.get(row.day) ?? 0) + row.amount);
        }
    }
    return totals;
}

const spentIn = (ledger: Ledger, categoryId: string | null, from: string, to: string) =>
    round(
        ledger,
        [...spentByDay(ledger, categoryId, from, to).values()].reduce((sum, amount) => sum + amount, 0)
    );

/** Up to five months ending at `period`, never reaching before the first logged day. */
export function sparkMonthsOf(ledger: Ledger, period: Period) {
    const earliest = ledger.rows.reduce((first, row) => (row.day < first ? row.day : first), ledger.today);
    const first = periodKeyOf(earliest, ledger.firstDayOfMonth);
    return Array.from({ length: LOOKBACK + 1 }, (_, index) => shiftPeriodKey(period.key, index - LOOKBACK)).filter(
        (key) => key >= first
    );
}

const monthTotals = (ledger: Ledger, categoryId: string | null, keys: readonly string[]) =>
    keys.map((key) => {
        const month = periodOf(key, ledger.firstDayOfMonth);
        return spentIn(ledger, categoryId, month.from, lastDay(ledger, month));
    });

function statusOf(phase: Phase, standing: CategoryBudget): LineStatus {
    if (phase === "ahead") {
        return "notStarted";
    }
    if (standing.overBudget) {
        return "over";
    }
    return phase === "closed" ? "held" : "onTrack";
}

function lineOf(
    ledger: Ledger,
    budget: Budget | MainBudget,
    categoryId: string | null,
    asOf: number,
    sparkMonths: readonly string[]
): BudgetLine {
    const standing = standingAt(ledger, budget, categoryId, asOf);
    const target = categoryId === null ? null : ledger.budgetTargets.get(categoryId);
    return {
        budget,
        categoryId,
        categoryName: target?.name ?? "",
        color: target?.color ?? "var(--color-app-muted)",
        customName: budget.name?.trim() || null,
        history: monthTotals(ledger, categoryId, sparkMonths),
        id: budget.localId,
        standing,
        status: statusOf(phaseOf(ledger, standing.from, standing.to), standing),
        table: categoryId === null ? "mainBudget" : "budgets",
    };
}

interface Share {
    limit: number;
    perDay: ReadonlyMap<string, number>;
    spent: number;
}

const shareOf = (ledger: Ledger, line: BudgetLine): Share => ({
    limit: line.standing.effectiveLimit,
    perDay: spentByDay(ledger, line.categoryId, line.standing.from, line.standing.to),
    spent: line.standing.spent,
});

// A child's limit sits inside its parent's, so a day both windows cover counts once, against the parent,
// and the child keeps the slice of its limit that falls on its other days.
function childShare(ledger: Ledger, line: BudgetLine, parent: BudgetLine, through: string): Share {
    const { from, to } = parent.standing;
    const days = daysFrom(line.standing.from, line.standing.to);
    const own = days.filter((day) => day < from || day > to);
    const perDay = new Map(
        [...shareOf(ledger, line).perDay].filter(([day]) => day <= through && (day < from || day > to))
    );
    return {
        limit: round(ledger, days.length === 0 ? 0 : (line.standing.effectiveLimit * own.length) / days.length),
        perDay,
        spent: round(
            ledger,
            [...perDay.values()].reduce((sum, amount) => sum + amount, 0)
        ),
    };
}

function paceOf(ledger: Ledger, period: Period, phase: Phase, shares: readonly Share[]) {
    if (phase === "ahead" || shares.length === 0) {
        return null;
    }
    const limit = round(
        ledger,
        shares.reduce((sum, share) => sum + share.limit, 0)
    );
    const spent = round(
        ledger,
        shares.reduce((sum, share) => sum + share.spent, 0)
    );
    const days = daysFrom(period.from, lastDay(ledger, period));
    let running = 0;
    const daily = days.map((day) => {
        running += shares.reduce((sum, share) => sum + (share.perDay.get(day) ?? 0), 0);
        return round(ledger, running);
    });
    const crossed = daily.findIndex((value) => value > limit);
    const runOutDay = crossed === -1 ? null : days[crossed];
    const daysLeft = phase === "current" ? daysBetween(ledger.today, period.to) + 1 : 0;
    const elapsed = daysBetween(period.from, ledger.today);
    return {
        daily,
        days,
        daysLeft,
        even: phase === "current" ? round(ledger, (limit * elapsed) / period.days) : null,
        left: round(ledger, limit - spent),
        limit,
        runOut: runOutDay ? { day: runOutDay, daysEarly: daysBetween(runOutDay, period.to) } : null,
        spent,
    } satisfies Pace;
}

/** Every limit read against one month; an ahead month reads each limit on its first day, before anything is spent. */
export function budgetsOverview(ledger: Ledger, period: Period): BudgetsOverview {
    const phase = phaseOf(ledger, period.from, period.to);
    const asOf = periodInstant(ledger, period);
    const sparkMonths = phase === "ahead" ? [] : sparkMonthsOf(ledger, period);
    const seen = new Set<string>();
    const lines: BudgetLine[] = [];
    for (const budget of liveBudgets(ledger)) {
        const { categoryId } = budget;
        if (categoryId !== null && !seen.has(categoryId)) {
            seen.add(categoryId);
            lines.push(lineOf(ledger, budget, categoryId, asOf, sparkMonths));
        }
    }
    lines.sort((a, b) => b.standing.spent - a.standing.spent || b.standing.effectiveLimit - a.standing.effectiveLimit);
    const main = liveMainBudget(ledger);
    const overall = main ? lineOf(ledger, main, null, asOf, sparkMonths) : null;
    const through = lastDay(ledger, period);
    const total = phase === "ahead" ? 0 : spentIn(ledger, null, period.from, through);
    const open =
        phase === "ahead"
            ? []
            : [...ledger.categories.values()]
                  .filter((category) => category.id !== UNCATEGORIZED_ID && !seen.has(category.id))
                  .map((category) => {
                      const spent = round(
                          ledger,
                          ledger.rows
                              .filter(
                                  (row) =>
                                      !row.income &&
                                      row.topId === category.id &&
                                      row.day >= period.from &&
                                      row.day <= through
                              )
                              .reduce((sum, row) => sum + row.amount, 0)
                      );
                      return {
                          categoryId: category.id,
                          color: category.color,
                          history: sparkMonths.map((key) => {
                              const month = periodOf(key, ledger.firstDayOfMonth);
                              const end = lastDay(ledger, month);
                              return round(
                                  ledger,
                                  ledger.rows
                                      .filter(
                                          (row) =>
                                              !row.income &&
                                              row.topId === category.id &&
                                              row.day >= month.from &&
                                              row.day <= end
                                      )
                                      .reduce((sum, row) => sum + row.amount, 0)
                              );
                          }),
                          name: category.name,
                          share: total > 0 ? spent / total : 0,
                          spent,
                      };
                  })
                  .filter((line) => line.spent > 0)
                  .toSorted((a, b) => b.spent - a.spent);
    const sum = (values: readonly number[]) =>
        round(
            ledger,
            values.reduce((acc, value) => acc + value, 0)
        );
    const byCategory = new Map(lines.map((line) => [line.categoryId, line]));
    const shares = lines.map((line) => {
        const target = line.categoryId === null ? undefined : ledger.budgetTargets.get(line.categoryId);
        const parent = target && target.id !== target.topId ? byCategory.get(target.topId) : undefined;
        return parent ? childShare(ledger, line, parent, through) : shareOf(ledger, line);
    });
    const over = lines.filter((line) => line.standing.overBudget).length;
    return {
        hasData: ledger.rows.length > 0,
        lines,
        open,
        overall,
        pace: paceOf(ledger, period, phase, overall ? [shareOf(ledger, overall)] : shares),
        period,
        phase,
        sparkMonths,
        totals: {
            limits: sum(shares.map((share) => share.limit)),
            onTrack: lines.length - over,
            open: sum(open.map((line) => line.spent)),
            over,
            spent: sum(shares.map((share) => share.spent)),
            total,
        },
    };
}

export interface BudgetWindowSpend {
    from: string;
    /** The limit for that window, carry included; null when the category has none. */
    limit: number | null;
    phase: Phase;
    spent: number;
    to: string;
}

export interface Typical {
    amount: number | null;
    from: string | null;
    to: string | null;
}

function typicalAcross(windows: readonly BudgetWindowSpend[]): Typical {
    const closed = windows.filter((window) => window.phase === "closed");
    const spending = closed.filter((window) => window.spent > 0);
    return {
        amount: typicalOf(closed.map((window) => window.spent)),
        from: spending[0]?.from ?? null,
        to: spending.at(-1)?.from ?? null,
    };
}

/** The window holding `asOf` and the `LOOKBACK` before it, oldest first. */
function windowsBack(ledger: Ledger, budget: StoredBudget, categoryId: string | null, asOf: number) {
    const windows: BudgetWindowSpend[] = [];
    let at = asOf;
    for (let index = 0; index <= LOOKBACK; index += 1) {
        const standing = standingAt(ledger, budget, categoryId, at);
        windows.unshift({
            from: standing.from,
            limit: standing.effectiveLimit,
            phase: phaseOf(ledger, standing.from, standing.to),
            spent: standing.spent,
            to: standing.to,
        });
        at = endOfDay(ledger, addDays(standing.from, -1));
    }
    return windows;
}

function monthsBack(ledger: Ledger, categoryId: string, key: string) {
    return Array.from({ length: LOOKBACK + 1 }, (_, index) => {
        const month = periodOf(shiftPeriodKey(key, index - LOOKBACK), ledger.firstDayOfMonth);
        return {
            from: month.from,
            limit: null,
            phase: phaseOf(ledger, month.from, month.to),
            spent: month.from > ledger.today ? 0 : spentIn(ledger, categoryId, month.from, lastDay(ledger, month)),
            to: month.to,
        } satisfies BudgetWindowSpend;
    });
}

export interface BudgetDetail {
    categoryId: string;
    color: string;
    /** Cumulative spending per day of the window, through today. */
    daily: readonly number[];
    days: readonly string[];
    /** Counting today in the running window, every day in one that has not opened, none in a closed one. */
    daysLeft: number;
    /** Oldest first; the one being read is at `selected`, or -1 for a window that has not opened. */
    history: readonly BudgetWindowSpend[];
    line: BudgetLine | null;
    name: string;
    phase: Phase;
    rows: readonly LedgerRow[];
    selected: number;
    /** Of everything spent in the same days. */
    share: number;
    spent: number;
    typical: Typical;
    window: { from: string; to: string };
}

const contributes = (row: LedgerRow, categoryId: string) =>
    row.categoryId === categoryId || row.parentId === categoryId || row.topId === categoryId;

export function budgetDetail(ledger: Ledger, categoryId: string, period: Period): BudgetDetail | null {
    const target = ledger.budgetTargets.get(categoryId);
    const category = target ?? ledger.categories.get(categoryId);
    if (!category || categoryId === UNCATEGORIZED_ID) {
        return null;
    }
    const budget = budgetOf(ledger, categoryId);
    const asOf = periodInstant(ledger, period);
    const line = budget ? lineOf(ledger, budget, categoryId, asOf, []) : null;
    const window = line ? { from: line.standing.from, to: line.standing.to } : { from: period.from, to: period.to };
    const phase = phaseOf(ledger, window.from, window.to);
    const through = lastDay(ledger, window);
    const rows =
        phase === "ahead"
            ? []
            : ledger.rows
                  .filter(
                      (row) =>
                          !row.income && row.day >= window.from && row.day <= through && contributes(row, categoryId)
                  )
                  .toSorted((a, b) => b.at - a.at);
    const spent = line
        ? line.standing.spent
        : round(
              ledger,
              rows.reduce((sum, row) => sum + row.amount, 0)
          );
    const days = phase === "ahead" ? [] : daysFrom(window.from, through);
    const perDay = spentByDay(ledger, categoryId, window.from, through);
    let running = 0;
    const daily = days.map((day) => {
        running += perDay.get(day) ?? 0;
        return round(ledger, running);
    });
    const back = (at: number, key: string) =>
        budget ? windowsBack(ledger, budget, categoryId, at) : monthsBack(ledger, categoryId, key);
    // A closed or ahead window shows the bars up to the running one; a closed one further back shows its own.
    const currentKey = periodKeyOf(ledger.today, ledger.firstDayOfMonth);
    let history = phase === "current" ? back(asOf, period.key) : back(ledger.now, currentKey);
    let selected = history.findIndex((each) => each.from === window.from);
    if (selected === -1 && phase === "closed") {
        history = back(asOf, period.key);
        selected = history.length - 1;
    }
    const total = phase === "ahead" ? 0 : spentIn(ledger, null, window.from, through);
    return {
        categoryId,
        color: category.color,
        daily,
        days,
        daysLeft: phase === "closed" ? 0 : daysBetween(phase === "ahead" ? window.from : ledger.today, window.to) + 1,
        history,
        line,
        name: category.name,
        phase,
        rows,
        selected,
        share: total > 0 ? spent / total : 0,
        spent,
        typical: typicalAcross(selected === -1 ? history : history.slice(0, selected)),
        window,
    };
}

export interface LimitPreview {
    current: BudgetWindowSpend;
    daysLeft: number;
    /** Oldest first, the open window last. */
    history: readonly BudgetWindowSpend[];
    /** Closed windows that spent more than the draft limit, out of `closed`; null below three, or with no spend. */
    over: number | null;
    closed: number;
    typical: Typical;
}

/** What a draft limit would have meant: the window it opens now, the ones before it and how often they ran over. */
export function limitPreview(
    ledger: Ledger,
    categoryId: string | null,
    draft: Pick<BudgetDraft, "amount" | "startDay" | "type">
): LimitPreview {
    const anchor = draft.startDay ?? windowAnchorDay(ledger.today, draft.type, ledger);
    const stored: StoredBudget = {
        amount: Math.abs(draft.amount),
        amountUsd: null,
        currency: ledger.currency,
        dateCreated: null,
        rollover: false,
        startDate: startOfDay(ledger, anchor),
        type: draft.type,
    };
    const history = windowsBack(ledger, stored, categoryId, ledger.now);
    const current = history.at(-1) ?? { from: ledger.today, limit: null, phase: "current", spent: 0, to: ledger.today };
    const closed = history.filter((window) => window.phase === "closed").map((window) => window.spent);
    // As on a phone: a verdict over fewer windows, or ones with nothing spent, is a sample size.
    const sampled = closed.length >= 3 && closed.some((spent) => spent > 0);
    return {
        closed: closed.length,
        current,
        daysLeft: current.phase === "current" ? daysBetween(ledger.today, current.to) + 1 : 0,
        history,
        over: sampled ? windowsOver(closed, Math.abs(draft.amount)) : null,
        typical: typicalAcross(history),
    };
}

/** A month a first-time reader would recognise: the categories that took most of it. */
export const topSpenders = (overview: BudgetsOverview, count = 3) =>
    overview.open.slice(0, count).map((line) => ({ id: line.categoryId, name: line.name }));
