import type { AccountBalanceInput } from "@outlayr/money/account-balance";
import { isPerson, toAccountKind } from "@outlayr/money/account-kind";
import { restate } from "@outlayr/money/account-overview";
import type { OverviewRow } from "@outlayr/money/account-overview";
import { valueCell } from "@outlayr/money/currency-totals";
import { utcDateString } from "@outlayr/money/dates";
import type { RateTable } from "@outlayr/money/valuation";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { Database } from "@/db/client";
import { transaction } from "@/db/transaction";
import type { PlottedCell } from "@/domain/goal-balance-series";
import { localDayKey } from "@/domain/local-day";
import { minorUnitsFor, roundToMinorUnits } from "@/domain/money";
import { goalProgress, isPayoffPlan } from "@/domain/savings-goal";
import type { GoalProgress } from "@/domain/savings-goal";

import { settledBalanceAt, settledCellsAt } from "./accounts";
import { accountsRepo } from "./accounts-core";
import type { Account } from "./accounts-core";
import type { SavingsGoal } from "./savings-goals-core";
import { GoalValuationError, savingsGoalsQuery, savingsGoalsRepo } from "./savings-goals-core";
import { loadValuationIn } from "./valuation-source";
import type { Valuation } from "./valuation-source";

export interface PayoffLine {
    /** Stated positive; null when on pace or ahead. */
    behind: number | null;
    /** Local `YYYY-MM-DD`. An ended plan draws no line and asks for nothing. */
    endedOn: string | null;
    /** 0 to 1 paid off. Null while unvalued: with no rate both sides read zero, which is not paid off. */
    fraction: number | null;
    goalId: string;
    pace: GoalProgress["pace"];
    reached: boolean;
    targetDate: Date;
    /** 0 to 1: where the date wants the fill today. Null once reached, while unvalued, or set on its target date. */
    tick: number | null;
}

export function takesPayoffPlan(account: Pick<Account, "currency" | "kind">, balance: number): boolean {
    const rounded = roundToMinorUnits(balance, account.currency);
    const kind = toAccountKind(account.kind);
    return kind === "person" ? rounded !== 0 : kind === "liability" && rounded < 0;
}

// Cells hold a day's totals, not their order, so a day's payments count before its new debt: paid off in the morning
// and used again by night still ends the plan. The day it was set counts only how it closed. Read from history, so a
// plan paid off while Debts was never opened still ends on the right day.
export function payoffEndedOn(
    plan: Pick<SavingsGoal, "dateCreated" | "startAmount">,
    account: AccountBalanceInput,
    cells: readonly PlottedCell[],
    rates: RateTable
): string | null {
    const since = localDayKey(plan.dateCreated.getTime());
    // The start's side is the debt's direction: owed climbs to zero, owed to you comes down to it.
    const direction = Math.sign(plan.startAmount);
    const byDay = new Map<string, { net: number; paid: number }>();
    for (const cell of cells) {
        const net = (cell.income ? 1 : -1) * valueCell(cell, account.currency, rates);
        const total = byDay.get(cell.plotDay) ?? { net: 0, paid: 0 };
        total.net += net;
        total.paid += Math.sign(net) === -direction ? net : 0;
        byDay.set(cell.plotDay, total);
    }
    const reached = (balance: number) => direction * roundToMinorUnits(balance, account.currency) <= 0;
    let running = account.initialBalance;
    for (const [day, { net, paid }] of [...byDay].sort(([a], [b]) => a.localeCompare(b))) {
        const lowest = running + paid;
        running += net;
        if (day > since ? reached(lowest) || reached(running) : day === since && reached(running)) {
            return day;
        }
    }
    return null;
}

export class PayoffPlansError extends Schema.TaggedError<PayoffPlansError>()("PayoffPlansError", {
    cause: Schema.Defect(),
    operation: Schema.Literals(["read-goals", "write-plan"]),
}) {
    override get message(): string {
        return `Payoff plan ${this.operation} failed`;
    }
}

const readGoals = (db: Database) =>
    Effect.tryPromise({
        catch: (cause) => new PayoffPlansError({ cause, operation: "read-goals" }),
        try: () => savingsGoalsQuery(db),
    });

const plansOn = Effect.fn("PayoffPlans.plansOn")(function* plansOn(db: Database, account: Account, now: Date) {
    const [goals, cells, { rates }] = yield* Effect.all(
        [readGoals(db), settledCellsAt(db, account.id, now), loadValuationIn(db, account.currency)],
        { concurrency: "unbounded" }
    );
    return goals
        .filter((goal) => goal.accountId === account.id && isPayoffPlan(goal))
        .map((goal) => ({ endedOn: payoffEndedOn(goal, account, cells, rates), goal }));
});

export interface OwedPlan {
    account: Account;
    goalId: string;
    owed: number;
    targetDate: Date;
}

export const owedPayoffPlans = Effect.fn("PayoffPlans.owedPayoffPlans")(function* owedPayoffPlans(
    db: Database,
    now: Date = new Date()
) {
    const [goals, rows] = yield* Effect.all([readGoals(db), accountsRepo.listActive(db)], {
        concurrency: "unbounded",
    });
    const planned = new Set(goals.filter(isPayoffPlan).map((goal) => goal.accountId));
    const owed = yield* Effect.all(
        rows
            .filter((row) => isPerson(row) && planned.has(row.id))
            .map((row) =>
                Effect.gen(function* owedBy() {
                    const plans = yield* plansOn(db, row, now);
                    const live = plans.find((plan) => plan.endedOn === null);
                    if (live === undefined) {
                        return null;
                    }
                    const balance = yield* settledBalanceAt(db, row, yield* loadValuationIn(db, row.currency), now);
                    return balance.exact && balance.value < 0
                        ? { account: row, goalId: live.goal.id, owed: -balance.value, targetDate: live.goal.targetDate }
                        : null;
                })
            ),
        { concurrency: "unbounded" }
    );
    return owed.filter((plan) => plan !== null);
});

// A new plan anchors on the balance now, in the account's own currency, so the share paid doesn't move with the rate.
// Null with nothing written when the balance isn't a debt; fails with {@link GoalValuationError} when unvalued.
export const setPayoffPlan = Effect.fn("PayoffPlans.setPayoffPlan")(function* setPayoffPlan(
    db: Database,
    account: Account,
    targetDate: Date,
    now: Date = new Date()
) {
    const plans = yield* plansOn(db, account, now);
    const live = plans.find((plan) => plan.endedOn === null);
    if (live !== undefined) {
        yield* savingsGoalsRepo.update(db, live.goal.id, { targetDate });
        return live.goal.id;
    }
    const balance = yield* settledBalanceAt(db, account, yield* loadValuationIn(db, account.currency), now);
    if (!balance.exact) {
        return yield* new GoalValuationError();
    }
    if (!takesPayoffPlan(account, balance.value)) {
        return null;
    }
    let id = "";
    yield* transaction(
        db,
        Effect.gen(function* write() {
            yield* Effect.all(
                plans.map(({ goal }) => savingsGoalsRepo.remove(db, goal.id, now)),
                { concurrency: "unbounded", discard: true }
            );
            id = yield* savingsGoalsRepo.create(db, {
                accountId: account.id,
                currency: account.currency,
                name: account.name,
                startAmount: balance.value,
                targetAmount: 0,
                targetDate,
            });
        }),
        (cause) => new PayoffPlansError({ cause, operation: "write-plan" })
    );
    return id;
});

// What the free cap counts. Read on demand, not subscribed: only each account's history says whether its plan ended.
export const livePayoffPlanCount = Effect.fn("PayoffPlans.livePayoffPlanCount")(function* livePayoffPlanCount(
    db: Database,
    exceptAccountId: string | null,
    now: Date = new Date()
) {
    const [goals, rows] = yield* Effect.all([readGoals(db), accountsRepo.listActive(db)], {
        concurrency: "unbounded",
    });
    const planned = new Set(
        goals.filter((goal) => isPayoffPlan(goal) && goal.accountId !== exceptAccountId).map((goal) => goal.accountId)
    );
    const live = yield* Effect.all(
        rows
            .filter((row) => planned.has(row.id))
            .map((row) =>
                plansOn(db, row, now).pipe(Effect.map((plans) => plans.filter((plan) => plan.endedOn === null).length))
            ),
        { concurrency: "unbounded" }
    );
    return live.reduce((sum, count) => sum + count, 0);
});

// The first live plan per account, else the first ended one. The start is restated at today's rate like `rows`, not
// through its frozen USD, so a debt in a moving currency reads paid only when it was.
export function payoffLines(
    goals: readonly SavingsGoal[],
    rows: readonly OverviewRow[],
    { displayCurrency, rates }: Valuation,
    nowMs: number,
    endings: ReadonlyMap<string, string> = new Map()
): ReadonlyMap<string, PayoffLine> {
    const byId = new Map(rows.map((row) => [row.id, row]));
    const today = utcDateString(nowMs);
    const now = new Date(nowMs);
    const lines = new Map<string, PayoffLine>();
    for (const goal of goals) {
        const row = byId.get(goal.accountId);
        const endedOn = endings.get(goal.id) ?? null;
        const held = row && lines.get(row.id);
        if (row === undefined || !isPayoffPlan(goal) || (held && (held.endedOn === null || endedOn !== null))) {
            continue;
        }
        const start = restate(goal.startAmount, goal.currency, displayCurrency, today, rates);
        const progress = goalProgress(
            row.balance,
            0,
            { now, startAmount: start.value, startDate: goal.dateCreated, targetDate: goal.targetDate },
            minorUnitsFor(displayCurrency)
        );
        const valued = row.exact && start.exact;
        const standing = valued ? progress.standing : null;
        lines.set(row.id, {
            behind: standing && !standing.onPace && standing.against < 0 ? -standing.against : null,
            endedOn,
            fraction: valued ? progress.fraction : null,
            goalId: goal.id,
            pace: valued ? progress.pace : null,
            reached: valued && progress.reached,
            targetDate: goal.targetDate,
            tick: standing?.elapsed ?? null,
        });
    }
    return lines;
}
