import { balanceIn } from "@outlayr/money/account-overview";
import type { DisplayedBalance } from "@outlayr/money/account-overview";
import type { CurrencyCell } from "@outlayr/money/currency-totals";
import { utcDateString } from "@outlayr/money/dates";
import { convertUsdSum } from "@outlayr/money/valuation";
import type { RateTable } from "@outlayr/money/valuation";

import type { Database } from "@/db/client";
import { outsideMoves, outsidePayments, savingsGoals, transactions, transfers } from "@/db/schema";
import { goalBalanceSeries } from "@/domain/goal-balance-series";
import type { PlottedCell } from "@/domain/goal-balance-series";
import type { GoalLinePoint } from "@/domain/goal-pace-geometry";
import { startOfLocalDay } from "@/domain/local-day";
import { minorUnitsFor } from "@/domain/money";
import { goalProgress, isPayoffPlan } from "@/domain/savings-goal";
import type { GoalProgress } from "@/domain/savings-goal";

import { useAccounts, useBalanceRates, useSettledAccountCells } from "./accounts";
import type { Account } from "./accounts-core";
import { useGlobalCurrency } from "./app-meta";
import { settledAccountsCellQuery, toCurrencyCell } from "./cell-query";
import { NO_READ, useLiveQuery } from "./live-query";
import type { SavingsGoal } from "./savings-goals-core";
import { savingsGoalsQuery } from "./savings-goals-core";
import {
    settledOutsideMovesQuery,
    settledOutsidePaymentsQuery,
    settledTransfersInboundQuery,
    settledTransfersOutboundQuery,
    toTransferCell,
} from "./transfer-cells";
import { usePendingDeletes } from "./use-deferred-delete";

export interface SavingsGoalWithProgress {
    /** False when `saved` fell back to a face value, so it can't be compared with the target. */
    exact: boolean;
    goal: SavingsGoal;
    /** Whether `target` itself converted. The target's currency label follows this, not {@link exact}. */
    targetExact: boolean;
    progress: GoalProgress;
    saved: number;
    start: number;
    target: number;
}

// Every figure is valued into the display currency. `nowMs` is the screen's `useNow()` reading, not a `Date.now()` in
// the hook: pace and months left are clock-relative, and a result keyed on the data alone would freeze them past
// midnight.
export function useSavingsGoals(db: Database, nowMs: number): SavingsGoalWithProgress[] {
    const all = useLiveQuery(savingsGoals, () => savingsGoalsQuery(db));
    const accounts = useAccounts(db);
    // Bounded at `now` in SQL: a cell carries only a day key, so a later-today entry would read as money already saved.
    const settledAt = new Date(nowMs);
    const enabled = all.some((goal) => !isPayoffPlan(goal));
    const pending = usePendingDeletes();
    const cellRows = useLiveQuery(
        transactions,
        () => (enabled ? settledAccountsCellQuery(db, settledAt, pending) : NO_READ),
        [enabled, settledAt, pending],
        nowMs
    );
    const outbound = useLiveQuery(
        transfers,
        () => (enabled ? settledTransfersOutboundQuery(db, settledAt, pending) : NO_READ),
        [enabled, settledAt, pending],
        nowMs
    );
    const inbound = useLiveQuery(
        transfers,
        () => (enabled ? settledTransfersInboundQuery(db, settledAt, pending) : NO_READ),
        [enabled, settledAt, pending],
        nowMs
    );
    const outside = useLiveQuery(
        outsidePayments,
        () => (enabled ? settledOutsidePaymentsQuery(db, settledAt, pending) : NO_READ),
        [enabled, settledAt, pending],
        nowMs
    );
    const moves = useLiveQuery(
        outsideMoves,
        () => (enabled ? settledOutsideMovesQuery(db, settledAt, pending) : NO_READ),
        [enabled, settledAt, pending],
        nowMs
    );
    const displayCurrency = useGlobalCurrency(db);
    const rates = useBalanceRates(db, displayCurrency, accounts);

    const goals = all.filter((goal) => !isPayoffPlan(goal));
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
    for (const { accountId, ...row } of [...inbound, ...outside, ...moves]) {
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
        const { exact } = balance;
        const target = frozenInDisplay(goal, goal.targetAmount, goal.targetAmountUsd, displayCurrency, rates);
        const start = frozenInDisplay(goal, goal.startAmount, goal.startAmountUsd, displayCurrency, rates);
        const comparable = exact && target.exact && start.exact;
        return [
            {
                // A target that fell back to face value makes the whole comparison unsound, not just the balance.
                exact: comparable,
                goal,
                // Without a span, pace and standing come back null; the fraction and remainder still show,
                // approximate like the rest of the app until rates land.
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
}

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
    return converted == null ? { exact: false, value: face } : { exact: true, value: converted };
}

export interface SavingsGoalDetail extends SavingsGoalWithProgress {
    accountName: string;
    /** Clipped to the goal, not the account: a line starting earlier shows progress against a target nobody set yet. */
    actual: GoalLinePoint[];
}

export function useSavingsGoal(db: Database, id: string, nowMs: number): SavingsGoalDetail | null {
    const goals = useSavingsGoals(db, nowMs);
    const accounts = useAccounts(db);
    const accountId = goals.find((candidate) => candidate.goal.id === id)?.goal.accountId ?? "";
    const cells = useSettledAccountCells(db, accountId, nowMs);
    const displayCurrency = useGlobalCurrency(db);
    const rates = useBalanceRates(db, displayCurrency, accounts);

    const entry = goals.find((candidate) => candidate.goal.id === id) ?? null;
    const account = accounts.find((candidate) => candidate.id === accountId) ?? null;
    if (entry == null || account == null) {
        return null;
    }
    return savingsGoalDetail({ account, cells, displayCurrency, entry, nowMs, rates });
}

function savingsGoalDetail({
    account,
    cells,
    displayCurrency,
    entry,
    nowMs,
    rates,
}: {
    account: Account;
    cells: PlottedCell[];
    displayCurrency: string;
    entry: SavingsGoalWithProgress;
    nowMs: number;
    rates: RateTable;
}): SavingsGoalDetail {
    // The day the goal was set, not the instant, or a goal made today draws no line.
    const since = startOfLocalDay(entry.goal.dateCreated.getTime());
    const today = startOfLocalDay(nowMs);
    const history = goalBalanceSeries(cells, account, displayCurrency, rates, since).filter(
        (point) => point.time < today
    );
    // Today's point is `saved` by construction, so the chart can't disagree with the figure beside it. The frozen
    // anchor always seeds the line, even over a creation-day bucket: that bucket holds the day's FINAL balance and
    // would hide the movement between opening and now.
    const opened = since < today ? [{ time: since, value: entry.start }] : [];
    // Clamped at zero like the standing: an overdrawn account has put nothing aside.
    const actual = [...opened, ...history, { time: today, value: entry.saved }].map((point) => ({
        time: point.time,
        value: Math.max(0, point.value),
    }));
    return { ...entry, accountName: account.name, actual };
}
