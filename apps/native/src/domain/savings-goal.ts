import { roundMoney } from "@outlayr/money/round";

import { addLocalDays, daysBetween, startOfLocalDay } from "./local-day";

interface GoalPace {
    monthsLeft: number;
    perMonth: number;
}

// One day of drift is tolerated: the line moves daily, so a fixed unit calls a fresh goal behind for good.
function onPaceBand(target: number, startAmount: number, totalDays: number, decimals: number): number {
    return round(Math.max(1, Math.abs(target - startAmount) / totalDays), decimals);
}

interface GoalStanding {
    /** Positive is ahead of the line the date demands. */
    against: number;
    elapsed: number;
    expected: number;
    onPace: boolean;
}

export interface GoalProgress {
    /** 0 to 1. On a payoff plan, the share of the start balance paid off. */
    fraction: number;
    pace: GoalPace | null;
    reached: boolean;
    remaining: number;
    standing: GoalStanding | null;
}

export interface GoalSpan {
    now?: Date;
    /** The account's balance when the goal was set, frozen at that write. */
    startAmount: number;
    startDate: Date;
    targetDate: Date;
}

const MS_PER_DAY = 86_400_000;
const REQUIRED_LINE_SAMPLES = 24;

const DAYS_PER_MONTH = 30.44;

const NO_PROGRESS: GoalProgress = { fraction: 0, pace: null, reached: false, remaining: 0, standing: null };

export function isPayoffPlan(goal: { targetAmount: number }): boolean {
    return goal.targetAmount === 0;
}

export function goalProgress(saved: number, target: number, span?: GoalSpan, decimals = 2): GoalProgress {
    if (target === 0 && span !== undefined) {
        return payoffProgress(saved, span, decimals);
    }
    if (!(Number.isFinite(target) && target > 0)) {
        return NO_PROGRESS;
    }
    const held = Number.isFinite(saved) ? Math.max(0, saved) : 0;
    return progressAlong(
        held,
        0,
        target,
        span && { ...span, startAmount: normalisedStart(span.startAmount) },
        decimals
    );
}

// Not clamped like savings: a debt that grew is owed in full, and paying past zero counts as reached.
function payoffProgress(balance: number, span: GoalSpan, decimals: number): GoalProgress {
    const start = Number.isFinite(span.startAmount) ? span.startAmount : 0;
    const signed = Number.isFinite(balance) ? balance : start;
    const direction = (start || signed) > 0 ? -1 : 1;
    const from = direction * start;
    const progress = progressAlong(direction * signed, from, 0, { ...span, startAmount: from }, decimals);
    const { standing } = progress;
    return standing
        ? { ...progress, standing: { ...standing, expected: direction * standing.expected || 0 } }
        : progress;
}

function progressAlong(
    held: number,
    origin: number,
    target: number,
    span: GoalSpan | undefined,
    decimals: number
): GoalProgress {
    const remaining = Math.max(0, round(target - held, decimals));
    const reached = remaining === 0;
    // A plan set on a settled balance divides to -Infinity while still owing and clamps to no progress.
    const fraction = reached ? 1 : Math.min(1, Math.max(0, (held - origin) / (target - origin)));

    if (span === undefined) {
        return { fraction, pace: null, reached, remaining, standing: null };
    }

    return {
        fraction,
        pace: reached ? null : paceFor(remaining, span, decimals),
        reached,
        remaining,
        standing: reached ? null : standingFor(held, target, span, decimals),
    };
}

function paceFor(remaining: number, { now, targetDate }: GoalSpan, decimals: number): GoalPace {
    const from = now ?? new Date();
    const days = (targetDate.getTime() - from.getTime()) / MS_PER_DAY;
    const monthsLeft = Math.max(0, Math.floor(days / DAYS_PER_MONTH));
    return { monthsLeft, perMonth: monthsLeft === 0 ? remaining : round(remaining / monthsLeft, decimals) };
}

// A savings goal on an account in the red starts at zero, or the debt would read as an immediate lead.
function normalisedStart(startAmount: number): number {
    return Number.isFinite(startAmount) ? Math.max(0, startAmount) : 0;
}

function standingFor(
    held: number,
    target: number,
    { now, startAmount, startDate, targetDate }: GoalSpan,
    decimals: number
): GoalStanding | null {
    // Whole local days: `useNow` only ticks at midnight, on writes and on resume, so an instant-level
    // standing would drift while the screen stays open.
    const from = startOfLocalDay((now ?? new Date()).getTime());
    const opened = startOfLocalDay(startDate.getTime());
    const totalDays = daysBetween(opened, startOfLocalDay(targetDate.getTime()));
    if (totalDays <= 0) {
        return null;
    }
    const elapsed = Math.min(1, Math.max(0, daysBetween(opened, from) / totalDays));
    const expected = round(startAmount + (target - startAmount) * elapsed, decimals);
    const against = round(held - expected, decimals);
    return {
        against,
        elapsed,
        expected,
        // Against the normalised start, and `<=` so a goal set yesterday and not yet funded is still on pace.
        onPace: Math.abs(against) <= onPaceBand(target, startAmount, totalDays, decimals),
    };
}

// Sampled, not two points: the chart clips it to the plot domain and a two-point path would cut the corner.
export function goalRequiredLine(
    { startAmount, startDate, targetDate }: Pick<GoalSpan, "startAmount" | "startDate" | "targetDate">,
    target: number
): { time: number; value: number }[] {
    const opened = startOfLocalDay(startDate.getTime());
    const due = startOfLocalDay(targetDate.getTime());
    const totalDays = daysBetween(opened, due);
    if (totalDays <= 0) {
        return [{ time: due, value: target }];
    }
    const start = normalisedStart(startAmount);
    const points: { time: number; value: number }[] = [];
    const steps = Math.min(REQUIRED_LINE_SAMPLES, totalDays);
    for (let step = 0; step <= steps; step += 1) {
        const ordinal = Math.round((step * totalDays) / steps);
        points.push({
            time: addLocalDays(opened, ordinal),
            value: start + (target - start) * (ordinal / totalDays),
        });
    }
    return points;
}

function round(value: number, decimals: number): number {
    return roundMoney(value, decimals);
}
