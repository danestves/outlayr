import type { ExpenseContribution } from "@outlayr/money/budget-spent";
import type { BudgetWindow } from "@outlayr/money/budget-window";
import { addDays, startOfDay } from "@outlayr/money/calendar";

import { leftPerDay } from "./budget-math";
import { EVERY_SCOPE, spendPerWindow } from "./budget-typical";
import { daysBetween } from "./local-day";

export const PRIOR_PERIODS = 6;
export const MIN_PRIOR_PERIODS = 3;
export const MIN_DELTA_OF_USUAL = 0.2;
export const MIN_DELTA_OF_TOTAL = 0.05;
export const MAX_CARDS = 3;
export const WELL_UNDER_LIMIT = 0.85;
export const USUAL_BAND = 0.1;

export interface PeriodProgress {
    closed: boolean;
    days: number;
    elapsed: number;
    window: BudgetWindow;
}

export function periodProgress(window: BudgetWindow, now: Date, closed: boolean): PeriodProgress {
    const days = Math.max(1, daysBetween(window.start.getTime(), window.end.getTime()));
    const through = daysBetween(window.start.getTime(), startOfDay(now).getTime()) + 1;
    return { closed, days, elapsed: closed ? days : Math.min(days, Math.max(1, through)), window };
}

export function forecastSpend(spent: number, { days, elapsed }: Pick<PeriodProgress, "days" | "elapsed">): number {
    return (spent / elapsed) * days;
}

export type StayUnder = { kind: "none" } | { kind: "over"; over: number } | { kind: "perDay"; perDay: number };

export function stayUnder(limit: number, spent: number, window: BudgetWindow, now: Date): StayUnder {
    const remaining = limit - spent;
    if (remaining > 0) {
        return { kind: "perDay", perDay: leftPerDay(remaining, window, now) };
    }
    return remaining < 0 ? { kind: "over", over: -remaining } : { kind: "none" };
}

export type HeadlineKind = "asUsual" | "faster" | "less" | "onTrack" | "past" | "soFar";

interface HeadlineInput {
    closed: boolean;
    forecast: number;
    limit: number | null;
    spent: number;
    usualByNow: number | null;
}

export function headlineKind({ closed, forecast, limit, spent, usualByNow }: HeadlineInput): HeadlineKind {
    if (closed) {
        return "past";
    }
    if (limit != null) {
        if (forecast > limit) {
            return "faster";
        }
        return forecast <= limit * WELL_UNDER_LIMIT ? "less" : "onTrack";
    }
    if (usualByNow == null || usualByNow <= 0) {
        return "soFar";
    }
    if (spent > usualByNow * (1 + USUAL_BAND)) {
        return "faster";
    }
    return spent < usualByNow * (1 - USUAL_BAND) ? "less" : "asUsual";
}

export function cumulativeByDay(rows: readonly ExpenseContribution[], progress: PeriodProgress): number[] {
    const { elapsed, window } = progress;
    const startMs = window.start.getTime();
    const endMs = window.end.getTime();
    const perDay = Array.from({ length: elapsed }, () => 0);
    for (const row of rows) {
        const at = row.date.getTime();
        if (at < startMs || at >= endMs) {
            continue;
        }
        const day = Math.min(elapsed - 1, daysBetween(startMs, startOfDay(row.date).getTime()));
        perDay[day] += row.amount;
    }
    let running = 0;
    return perDay.map((amount) => {
        running += amount;
        return running;
    });
}

export interface CategoryLimit {
    categoryId: string;
    limit: number;
}

export interface SubscriptionSummary {
    count: number;
    perMonth: number;
}

export type AnswerCard =
    | {
          bars: readonly number[];
          categoryId: string;
          impact: number;
          kind: "overLimit";
          limit: number;
          spent: number;
      }
    | { impact: number; kind: "subscriptions" }
    | { categoryId: string; impact: number; kind: "vsUsual"; spent: number; usual: number };

export interface AnswerInput {
    categoryLimits: readonly CategoryLimit[];
    limit: number | null;
    prior: readonly BudgetWindow[];
    rows: readonly ExpenseContribution[];
    progress: PeriodProgress;
    subscriptions: SubscriptionSummary | null;
}

export interface Answers {
    cards: AnswerCard[];
    cumulative: number[];
    forecast: number | null;
    headline: HeadlineKind;
    spent: number;
    usualByNow: number | null;
}

function mean(values: readonly number[], count: number): number {
    return values.reduce((sum, value) => sum + value, 0) / count;
}

function cutAt(window: BudgetWindow, days: number): BudgetWindow {
    const cut = addDays(window.start, days);
    return { end: cut.getTime() < window.end.getTime() ? cut : window.end, start: window.start };
}

function completeHistory(prior: readonly BudgetWindow[], rows: readonly ExpenseContribution[]): BudgetWindow[] {
    let earliest = Number.POSITIVE_INFINITY;
    for (const row of rows) {
        earliest = Math.min(earliest, row.date.getTime());
    }
    const floor = startOfDay(new Date(earliest)).getTime();
    return prior.filter((window) => window.start.getTime() >= floor);
}

export function buildAnswers(input: AnswerInput): Answers {
    const { categoryLimits, limit, prior, rows, progress, subscriptions } = input;
    const history = completeHistory(prior, rows);
    const hasUsual = history.length >= MIN_PRIOR_PERIODS;
    const full = spendPerWindow(rows, [progress.window, ...history]);
    const toDate = spendPerWindow(rows, [progress.window, ...history.map((window) => cutAt(window, progress.elapsed))]);

    const usualOf = (scope: string): number => mean((toDate.get(scope) ?? []).slice(1), Math.max(1, history.length));
    const spent = full.get(EVERY_SCOPE)?.[0] ?? 0;
    const usualByNow = hasUsual ? usualOf(EVERY_SCOPE) : null;
    const forecast = progress.closed ? null : forecastSpend(spent, progress);
    const headline = headlineKind({ closed: progress.closed, forecast: forecast ?? spent, limit, spent, usualByNow });

    const barSpend = spendPerWindow(rows, [progress.window, ...prior.slice(0, PRIOR_PERIODS - 1)]);
    const candidates: AnswerCard[] = [];

    for (const { categoryId, limit: categoryLimit } of categoryLimits) {
        const categorySpent = barSpend.get(categoryId)?.[0] ?? 0;
        if (categorySpent > categoryLimit) {
            const series = barSpend.get(categoryId) ?? [];
            const bars = Array.from(
                { length: Math.min(PRIOR_PERIODS, 1 + prior.length) },
                (_, index) => series[index] ?? 0
            ).reverse();
            candidates.push({
                bars,
                categoryId,
                impact: categorySpent - categoryLimit,
                kind: "overLimit",
                limit: categoryLimit,
                spent: categorySpent,
            });
        }
    }

    if (subscriptions && subscriptions.count > 0) {
        candidates.push({ impact: subscriptions.perMonth, kind: "subscriptions" });
    }

    if (usualByNow != null) {
        const limited = new Set(categoryLimits.map((entry) => entry.categoryId));
        const topLevel = new Set<string>();
        for (const row of rows) {
            const id = row.parentId ?? row.categoryId;
            if (id != null && !limited.has(id)) {
                topLevel.add(id);
            }
        }
        for (const categoryId of topLevel) {
            const active = (full.get(categoryId) ?? []).slice(1).filter((amount) => amount > 0).length;
            const usual = usualOf(categoryId);
            const categorySpent = toDate.get(categoryId)?.[0] ?? 0;
            const gap = Math.abs(categorySpent - usual);
            if (
                active >= MIN_PRIOR_PERIODS &&
                usual > 0 &&
                gap >= usual * MIN_DELTA_OF_USUAL &&
                gap >= usualByNow * MIN_DELTA_OF_TOTAL
            ) {
                candidates.push({ categoryId, impact: gap, kind: "vsUsual", spent: categorySpent, usual });
            }
        }
    }

    return {
        cards: candidates.sort((a, b) => b.impact - a.impact).slice(0, MAX_CARDS),
        cumulative: cumulativeByDay(rows, progress),
        forecast,
        headline,
        spent,
        usualByNow,
    };
}
