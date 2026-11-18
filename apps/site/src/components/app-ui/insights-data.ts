import type { ExpenseContribution } from "@outlayr/money/budget-spent";
import { EVERY_SCOPE, spendPerWindow } from "@outlayr/money/budget-typical";
import type { BudgetWindow } from "@outlayr/money/budget-window";
import { addDays, startOfDay, startOfWeek } from "@outlayr/money/calendar";
import { landingDate } from "@outlayr/money/recurrence";
import { monthlySubscriptionCost } from "@outlayr/money/subscription-cost";

import { daysBetween } from "../../../../native/src/domain/local-day";
import { contributions } from "./budgets-data";
import { SUNDAY } from "./dates";
import { DEMO_CURRENCY, ROWS } from "./ledger";

const PRIOR_PERIODS = 6;
const MIN_PRIOR_PERIODS = 3;
const USUAL_BAND = 0.1;

export interface WeekProgress {
    days: number;
    elapsed: number;
    window: BudgetWindow;
}

export function weekWindow(now: Date, offset = 0): BudgetWindow {
    const start = addDays(startOfWeek(now, SUNDAY), offset * 7);
    return { end: addDays(start, 7), start };
}

export function weekProgress(now: Date): WeekProgress {
    const window = weekWindow(now);
    const days = Math.max(1, daysBetween(window.start.getTime(), window.end.getTime()));
    const through = daysBetween(window.start.getTime(), startOfDay(now).getTime()) + 1;
    return { days, elapsed: Math.min(days, Math.max(1, through)), window };
}

export type HeadlineKind = "asUsual" | "faster" | "less" | "soFar";

function headlineKind(spent: number, usualByNow: number | null): HeadlineKind {
    if (usualByNow == null || usualByNow <= 0) {
        return "soFar";
    }
    if (spent > usualByNow * (1 + USUAL_BAND)) {
        return "faster";
    }
    return spent < usualByNow * (1 - USUAL_BAND) ? "less" : "asUsual";
}

function cumulativeByDay(rows: readonly ExpenseContribution[], { elapsed, window }: WeekProgress): number[] {
    const startMs = window.start.getTime();
    const endMs = window.end.getTime();
    const perDay = Array.from({ length: elapsed }, () => 0);
    for (const row of rows) {
        const at = row.date.getTime();
        if (at >= startMs && at < endMs) {
            const day = Math.min(elapsed - 1, daysBetween(startMs, startOfDay(row.date).getTime()));
            perDay[day] = (perDay[day] ?? 0) + row.amount;
        }
    }
    let running = 0;
    return perDay.map((amount) => {
        running += amount;
        return running;
    });
}

function cutAt(window: BudgetWindow, days: number): BudgetWindow {
    const cut = addDays(window.start, days);
    return { end: cut.getTime() < window.end.getTime() ? cut : window.end, start: window.start };
}

const mean = (values: readonly number[], count: number) => values.reduce((sum, value) => sum + value, 0) / count;

export interface WeekAnswers {
    cumulative: number[];
    forecast: number;
    headline: HeadlineKind;
    progress: WeekProgress;
    spent: number;
    usualByNow: number | null;
}

export function weekAnswers(now: Date): WeekAnswers {
    const rows = contributions(now);
    const progress = weekProgress(now);
    const earliest = Math.min(...rows.map((row) => row.date.getTime()));
    const floor = startOfDay(new Date(earliest)).getTime();
    const history = Array.from({ length: PRIOR_PERIODS }, (_, index) => weekWindow(now, -1 - index)).filter(
        (window) => window.start.getTime() >= floor
    );
    const spentIn = (windows: readonly BudgetWindow[]) =>
        spendPerWindow(rows, [progress.window, ...windows]).get(EVERY_SCOPE) ?? [];
    const spent = spentIn([])[0] ?? 0;
    const hasUsual = history.length >= MIN_PRIOR_PERIODS;
    const usualByNow = hasUsual
        ? mean(spentIn(history.map((window) => cutAt(window, progress.elapsed))).slice(1), history.length)
        : null;
    const usualRest =
        usualByNow == null
            ? null
            : Math.max(
                  0,
                  mean(spentIn(history.map((window) => cutAt(window, progress.days))).slice(1), history.length) -
                      usualByNow
              );
    return {
        cumulative: cumulativeByDay(rows, progress),
        forecast: usualRest == null ? (spent / progress.elapsed) * progress.days : spent + usualRest,
        headline: headlineKind(spent, usualByNow),
        progress,
        spent,
        usualByNow,
    };
}

export interface SubscriptionItem {
    id: string;
    name: string;
    next: Date;
    perMonth: number;
}

export interface Subscriptions {
    items: SubscriptionItem[];
    next: SubscriptionItem;
    perMonth: number;
}

export function subscriptions(now: Date): Subscriptions | null {
    const items = ROWS.filter((row) => row.recurringType > 0 && !row.income).map((row) => ({
        id: row.id,
        name: row.note.trim() || row.category,
        next: landingDate(row, now),
        perMonth: Math.abs(
            monthlySubscriptionCost([row], DEMO_CURRENCY, undefined, now).find(
                (bucket) => bucket.currencyCode === DEMO_CURRENCY
            )?.amount ?? 0
        ),
    }));
    const [next] = items.toSorted((a, b) => a.next.getTime() - b.next.getTime());
    if (!next) {
        return null;
    }
    return {
        items: items.toSorted((a, b) => b.perMonth - a.perMonth),
        next,
        perMonth: items.reduce((sum, item) => sum + item.perMonth, 0),
    };
}
