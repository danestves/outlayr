import { balanceIn } from "@outlayr/money/account-overview";
import type { DisplayedBalance } from "@outlayr/money/account-overview";
import type { CurrencyCell } from "@outlayr/money/currency-totals";
import { utcDateString } from "@outlayr/money/dates";
import { convertUsdSum } from "@outlayr/money/valuation";
import { useMemo } from "react";

import type { Database } from "@/db/client";
import { outsidePayments, savingsGoals, transactions, transfers } from "@/db/schema";
import { goalBalanceSeries } from "@/domain/goal-balance-series";
import type { GoalLinePoint } from "@/domain/goal-pace-geometry";
import { startOfLocalDay } from "@/domain/local-day";
import { minorUnitsFor } from "@/domain/money";
import { goalProgress, isPayoffPlan } from "@/domain/savings-goal";
import type { GoalProgress } from "@/domain/savings-goal";

import { useAccounts, useBalanceRates, useSettledAccountCells } from "./accounts";
import { useGlobalCurrency } from "./app-meta";
import { settledAccountsCellQuery, toCurrencyCell } from "./cell-query";
import { useLiveQuery } from "./live-query";
import type { SavingsGoal } from "./savings-goals-core";
import { savingsGoalsQuery } from "./savings-goals-core";
import {
    settledOutsidePaymentsQuery,
    settledTransfersInboundQuery,
    settledTransfersOutboundQuery,
    toTransferCell,
} from "./transfer-cells";

export interface SavingsGoalWithProgress {
    /**
     * False when `saved` fell back to a face value in the account's own currency,
     * so it cannot be compared with the target. The pace and the standing are
     * withheld while it is.
     */
    exact: boolean;
    goal: SavingsGoal;
    /**
     * Whether `target` itself converted. Narrower than {@link exact}, which also
     * asks about the balance — a label on the target has to follow this one, or a
     * perfectly converted figure gets stamped with the wrong currency because
     * something else on the screen could not be valued.
     */
    targetExact: boolean;
    progress: GoalProgress;
    /** The account's balance, valued into the display currency. */
    saved: number;
    /** What the account held when the goal was set, valued into the display currency. */
    start: number;
    /** The target, valued into the display currency. */
    target: number;
}

const NO_ROWS: never[] = [];
const NO_READ = { all: () => NO_ROWS };

/**
 * Every savings goal with the balance behind it, valued into the ledger's display
 * currency so a goal set in one currency and an account held in another still
 * compare. The target converts through its own frozen `targetAmountUsd`, the
 * same contract every other cross-currency figure keeps.
 *
 * `nowMs` is the screen's `useNow()` reading rather than a `Date.now()` taken
 * inside the memo. Every figure here is measured against the clock — the pace,
 * the months left, the standing — and a memo keyed only on data pins all three
 * to the last write, so a screen left open across midnight keeps reporting
 * yesterday's.
 */
export function useSavingsGoals(db: Database, nowMs: number): SavingsGoalWithProgress[] {
    const all = useLiveQuery(savingsGoals, () => savingsGoalsQuery(db));
    const goals = useMemo(() => all.filter((goal) => !isPayoffPlan(goal)), [all]);
    const accounts = useAccounts(db);
    // Bounded at `now` in SQL, not filtered afterwards: a cell carries only a day
    // key, so an entry scheduled for later today is indistinguishable from one
    // already made and would read as money already put aside.
    const settledAt = useMemo(() => new Date(nowMs), [nowMs]);
    const enabled = goals.length > 0;
    const cellRows = useLiveQuery(
        transactions,
        () => (enabled ? settledAccountsCellQuery(db, settledAt) : NO_READ),
        [enabled, settledAt],
        nowMs
    );
    const outbound = useLiveQuery(
        transfers,
        () => (enabled ? settledTransfersOutboundQuery(db, settledAt) : NO_READ),
        [enabled, settledAt],
        nowMs
    );
    const inbound = useLiveQuery(
        transfers,
        () => (enabled ? settledTransfersInboundQuery(db, settledAt) : NO_READ),
        [enabled, settledAt],
        nowMs
    );
    const outside = useLiveQuery(
        outsidePayments,
        () => (enabled ? settledOutsidePaymentsQuery(db, settledAt) : NO_READ),
        [enabled, settledAt],
        nowMs
    );
    const displayCurrency = useGlobalCurrency(db);
    const rates = useBalanceRates(db, displayCurrency, accounts);

    return useMemo(() => {
        const byAccount = new Map<string, CurrencyCell[]>();
        const push = (accountId: string | null, cell: CurrencyCell) => {
            if (accountId == null) {
                return;
            }
            const bucket = byAccount.get(accountId);
            if (bucket) {
                bucket.push(cell);
            } else {
                byAccount.set(accountId, [cell]);
            }
        };
        for (const row of cellRows) {
            push(row.accountId, toCurrencyCell(row));
        }
        for (const { accountId, ...row } of outbound) {
            push(accountId, toTransferCell(row, false));
        }
        for (const { accountId, ...row } of [...inbound, ...outside]) {
            push(accountId, toTransferCell(row, true));
        }

        const accountById = new Map(accounts.map((account) => [account.id, account]));
        const now = new Date(nowMs);

        return goals.flatMap((goal) => {
            const account = accountById.get(goal.accountId);
            if (account == null) {
                return [];
            }
            const balance = balanceIn(
                account,
                byAccount.get(account.id) ?? [],
                displayCurrency,
                rates,
                utcDateString(nowMs)
            );
            const saved = balance.value;
            // Its flag travels with it, because the balance can be left out or
            // approximate — a new device before its rates finish loading is the
            // ordinary case. That number is not the one the target is compared
            // with, so the pace and the standing built from it would be a precise
            // verdict on a comparison that was never made.
            const { exact } = balance;
            const target = frozenInDisplay(goal, goal.targetAmount, goal.targetAmountUsd, displayCurrency, rates);
            const start = frozenInDisplay(goal, goal.startAmount, goal.startAmountUsd, displayCurrency, rates);
            const comparable = exact && target.exact && start.exact;
            return [
                {
                    // `comparable`, not the balance's own flag: a target that fell
                    // back to its face value makes the whole comparison unsound,
                    // including the fraction, the remainder and the chart.
                    exact: comparable,
                    goal,
                    // The span is withheld while the figures cannot be compared, so
                    // the pace and the standing come back null and every surface
                    // already degrades to stating no verdict. The fraction and the
                    // remainder still show: an approximate balance is what the rest
                    // of the app displays in this state, and they correct themselves
                    // the moment the rates land.
                    progress: goalProgress(
                        saved,
                        target.value,
                        comparable
                            ? {
                                  now,
                                  startAmount: start.value,
                                  startDate: goal.dateCreated,
                                  targetDate: goal.targetDate,
                              }
                            : undefined,
                        minorUnitsFor(displayCurrency)
                    ),
                    saved,
                    start: start.value,
                    target: target.value,
                    targetExact: target.exact,
                },
            ];
        });
    }, [goals, accounts, cellRows, outbound, inbound, outside, displayCurrency, rates, nowMs]);
}

/**
 * A figure frozen at the goal's creation, read back in today's display currency.
 *
 * Both of the goal's own amounts travel this way — the target and the balance it
 * started from — so a goal set in bolivares and read in dollars states one
 * consistent pair rather than mixing a converted target with a face-value start.
 */
function frozenInDisplay(
    goal: SavingsGoal,
    face: number,
    usd: number | null,
    displayCurrency: string,
    rates: Parameters<typeof convertUsdSum>[3]
): DisplayedBalance {
    if (goal.currency === displayCurrency) {
        return { exact: true, value: face };
    }
    if (usd == null) {
        return { exact: false, value: face };
    }
    const converted = convertUsdSum(usd, utcDateString(goal.dateCreated.getTime()), displayCurrency, rates);
    // A fallback to the face value is a figure in the GOAL's currency wearing the
    // display one's label, which is the same lie the balance can tell — so it has
    // to reach `exact` by the same route.
    return converted == null ? { exact: false, value: face } : { exact: true, value: converted };
}

export interface SavingsGoalDetail extends SavingsGoalWithProgress {
    accountName: string;
    /**
     * The account's own balance over the goal's span, oldest first and valued in
     * the display currency. Empty until the account has a day of history.
     *
     * Clipped to the goal rather than the account: the chart measures this goal,
     * and a line that started before the goal did would show progress against a
     * target nobody had set yet.
     */
    actual: GoalLinePoint[];
}

/**
 * One goal, with the line the detail screen draws.
 *
 * `accountBalanceSeries` walks a bounded recent window, so a goal older than
 * that window has a line that begins mid-span. That is why the required line is
 * anchored on the goal's frozen `startAmount` and not on the first point here —
 * the anchor has to outlive the history.
 */
export function useSavingsGoal(db: Database, id: string, nowMs: number): SavingsGoalDetail | null {
    const goals = useSavingsGoals(db, nowMs);
    const entry = goals.find((candidate) => candidate.goal.id === id) ?? null;
    const accounts = useAccounts(db);
    const account = accounts.find((candidate) => candidate.id === entry?.goal.accountId) ?? null;
    const cells = useSettledAccountCells(db, account?.id ?? "", nowMs);
    const displayCurrency = useGlobalCurrency(db);
    const rates = useBalanceRates(db, displayCurrency, accounts);

    return useMemo(() => {
        if (entry == null || account == null) {
            return null;
        }
        // The day the goal was set, not the instant, or a goal made today would
        // draw no line at all.
        const since = startOfLocalDay(entry.goal.dateCreated.getTime());
        const today = startOfLocalDay(nowMs);
        // The buckets keep their own UTC stamps: they are grouped by UTC day, and
        // relabelling them as local days moves a row into a bucket it is not in.
        // Outside UTC that lands a transaction made this afternoon under tomorrow's
        // key, where the head can no longer see it.
        // Bucketed on the reader's own days, because the cells now are: outside UTC
        // a UTC bucket names a day the entry did not happen on, and drawing it at
        // that day's midnight can place a deposit before itself.
        const history = goalBalanceSeries(cells, account, displayCurrency, rates, since).filter(
            (point) => point.time < today
        );
        // Today is stated once, at the local boundary the standing is measured at,
        // and with the balance the standing measures. The head is therefore `saved`
        // by construction rather than by two walks agreeing — which is the property
        // every disagreement between this chart and the figure beside it came from.
        // Seeded with the frozen anchor, so the line begins where the goal did.
        // Without it a goal opened at 500 and reduced to 400 a week later draws a
        // flat 400 from that week onward, hiding the drop that put it behind — and
        // one with no movement since draws nothing but today's dot.
        // Always, when the goal predates today — including when a creation-day
        // bucket exists. That bucket holds the day's FINAL balance, so letting it
        // stand in for the anchor would start the line at what the goal fell to
        // rather than what it opened at, hiding the movement between them. Two
        // points on the same day is exactly that movement, drawn.
        const opened = since < today ? [{ time: since, value: entry.start }] : [];
        // Clamped at zero, like the standing and the required line: an overdrawn
        // account has put nothing aside, and a line dipping below the axis would
        // draw a shortfall larger than the one every figure beside it reports.
        const actual = [...opened, ...history, { time: today, value: entry.saved }].map((point) => ({
            time: point.time,
            value: Math.max(0, point.value),
        }));
        return { ...entry, accountName: account.name, actual };
    }, [entry, account, cells, displayCurrency, rates, nowMs]);
}
