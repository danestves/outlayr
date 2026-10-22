import type { AccountBalance } from "@outlayr/money/account-balance";
import { toAccountKind } from "@outlayr/money/account-kind";
import { summarizeOverview } from "@outlayr/money/account-overview";
import type { AccountsOverview, OverviewRow } from "@outlayr/money/account-overview";
import { startOfDay } from "@outlayr/money/calendar";
import type { RateTable } from "@outlayr/money/valuation";
import { and, desc, eq, isNull } from "drizzle-orm";
import { useMemo } from "react";

import type { Database } from "@/db/client";
import { outsideMoves, savingsGoals } from "@/db/schema";
import { debtsOverview } from "@/domain/debts";
import type { DebtsOverview } from "@/domain/debts";
import type { PlottedCell } from "@/domain/goal-balance-series";
import { isPayoffPlan } from "@/domain/savings-goal";
import type { TransferLogRow } from "@/domain/transfer-log-rows";

import { useAccounts, useOverviewOf } from "./accounts";
import type { SettledCell } from "./accounts";
import type { Account } from "./accounts-core";
import { useGlobalCurrency } from "./app-meta";
import { dueWindow, installmentsByAccount } from "./debts-due";
import type { AccountInstallments, DueWindow } from "./debts-due";
import { useInstallmentPlans } from "./installments";
import type { PlanWithStanding } from "./installments-core";
import { useLiveQuery } from "./live-query";
import { payoffEndedOn, payoffLines } from "./payoff-plans";
import type { PayoffLine } from "./payoff-plans";
import { savingsGoalsQuery } from "./savings-goals-core";
import type { SavingsGoal } from "./savings-goals-core";
import { useDeferredDelete } from "./use-deferred-delete";
import type { Valuation } from "./valuation-source";

export type DebtsScreenOverview = DebtsOverview<OverviewRow & { account: Account }> & {
    due: DueWindow | null;
    installments: ReadonlyMap<string, AccountInstallments>;
};

// `valuation.rates` has to carry every account's currency beside the display one.
function debtsIn(
    accounts: readonly Account[],
    overview: AccountsOverview | null,
    plans: readonly PlanWithStanding[],
    valuation: Valuation,
    nowMs: number
): DebtsScreenOverview {
    const byId = new Map(accounts.map((account) => [account.id, account]));
    const rows = (overview?.rows ?? []).flatMap((row) => {
        const account = byId.get(row.id);
        return account ? [{ ...row, account }] : [];
    });
    const listed = plans.filter(({ plan }) => byId.has(plan.accountId));
    return {
        ...debtsOverview(rows, valuation.displayCurrency),
        due: dueWindow(listed, nowMs, valuation.displayCurrency, valuation.rates),
        installments: installmentsByAccount(listed),
    };
}

// An account or plan pending its undo window is left out, so totals move as the row leaves.
export function useDebtsOverview(
    db: Database,
    nowMs: number
): DebtsScreenOverview & { payoff: ReadonlyMap<string, PayoffLine> } {
    const all = useAccounts(db);
    const { pendingId } = useDeferredDelete("account");
    const accounts = useMemo(() => all.filter((account) => account.id !== pendingId), [all, pendingId]);
    const displayCurrency = useGlobalCurrency(db);
    const { cells, overview, rates } = useOverviewOf(db, accounts, displayCurrency, nowMs);
    const plans = useInstallmentPlans(db, nowMs);
    const goals = useLiveQuery(savingsGoals, () => savingsGoalsQuery(db));
    const { pendingId: pendingGoalId } = useDeferredDelete("goal");
    return useMemo(() => {
        const valuation = { displayCurrency, rates };
        const live = goals.filter((goal) => goal.id !== pendingGoalId && isPayoffPlan(goal));
        return {
            ...debtsIn(accounts, overview, plans, valuation, nowMs),
            payoff: payoffLines(
                live,
                overview?.rows ?? [],
                valuation,
                nowMs,
                payoffEndings(live, accounts, cells, rates)
            ),
        };
    }, [accounts, overview, plans, goals, pendingGoalId, displayCurrency, rates, cells, nowMs]);
}

function payoffEndings(
    goals: readonly SavingsGoal[],
    accounts: readonly Account[],
    cells: readonly SettledCell[],
    rates: RateTable
): ReadonlyMap<string, string> {
    const byAccount = new Map<string, SettledCell[]>(goals.map((goal) => [goal.accountId, []]));
    for (const cell of cells) {
        if (cell.accountId !== null) {
            byAccount.get(cell.accountId)?.push(cell);
        }
    }
    const byId = new Map(accounts.map((account) => [account.id, account]));
    const endings = new Map<string, string>();
    for (const goal of goals) {
        const account = byId.get(goal.accountId);
        const endedOn = account && payoffEndedOn(goal, account, byAccount.get(goal.accountId) ?? [], rates);
        if (endedOn) {
            endings.set(goal.id, endedOn);
        }
    }
    return endings;
}

// Stated in the account's own currency, for its detail: the first live plan, else the first ended one, as on Debts.
export function useAccountPayoff(
    db: Database,
    account: Account,
    balance: AccountBalance,
    cells: readonly PlottedCell[],
    rates: RateTable,
    nowMs: number
): PayoffLine | null {
    const goals = useLiveQuery(savingsGoals, () => savingsGoalsQuery(db));
    const { pendingId } = useDeferredDelete("goal");
    return useMemo(() => {
        const own = goals.filter(
            (goal) => goal.accountId === account.id && goal.id !== pendingId && isPayoffPlan(goal)
        );
        if (own.length === 0) {
            return null;
        }
        const row = {
            balance: balance.total,
            exact: balance.exact,
            id: account.id,
            kind: toAccountKind(account.kind),
            multiCurrency: false,
        };
        const endings = payoffEndings(
            own,
            [account],
            cells.map((cell) => ({ ...cell, accountId: account.id })),
            rates
        );
        const valuation = { displayCurrency: account.currency, rates };
        return payoffLines(own, [row], valuation, nowMs, endings).get(account.id) ?? null;
    }, [goals, pendingId, account, balance, cells, rates, nowMs]);
}

export interface LogOverview {
    banks: AccountsOverview | null;
    debts: DebtsScreenOverview;
}

// Valued once into `valuation`'s currency for both the bank block and the Debts row, so a write re-values once.
export function useLogOverviewIn(
    db: Database,
    valuation: Valuation,
    nowMs: number,
    excludeId: string | null = null
): LogOverview {
    const all = useAccounts(db);
    const rows = useMemo(
        () => (excludeId == null ? all : all.filter((account) => account.id !== excludeId)),
        [all, excludeId]
    );
    const { displayCurrency } = valuation;
    const { overview, rates } = useOverviewOf(db, rows, displayCurrency, nowMs);
    const plans = useInstallmentPlans(db, nowMs);
    return useMemo(
        () => ({
            banks: summarizeOverview((overview?.rows ?? []).filter((row) => row.kind !== "person")),
            debts: debtsIn(rows, overview, plans, { displayCurrency, rates }, nowMs),
        }),
        [rows, overview, plans, displayCurrency, rates, nowMs]
    );
}

function personOutsideMovesQuery(db: Database, accountId: string) {
    return db
        .select({
            amount: outsideMoves.amount,
            amountUsd: outsideMoves.amountUsd,
            date: outsideMoves.date,
            id: outsideMoves.id,
            note: outsideMoves.note,
        })
        .from(outsideMoves)
        .where(and(eq(outsideMoves.accountId, accountId), isNull(outsideMoves.deletedAt)))
        .orderBy(desc(outsideMoves.date));
}

export function useOutsideMoveRows(
    db: Database,
    person: Pick<Account, "currency" | "id" | "name"> | null,
    outside: string
): TransferLogRow[] {
    const rows = useLiveQuery(
        outsideMoves,
        () => (person === null ? { all: () => [] } : personOutsideMovesQuery(db, person.id)),
        [person?.id]
    );
    return useMemo(() => {
        if (person === null) {
            return [];
        }
        return rows.map((row): TransferLogRow => {
            const into = row.amount > 0;
            const amount = Math.abs(row.amount);
            const route = into ? `${outside} → ${person.name}` : `${person.name} → ${outside}`;
            return {
                amount,
                amountUsd: row.amountUsd === null ? null : Math.abs(row.amountUsd),
                categoryColor: null,
                categoryEmoji: null,
                categoryIcon: null,
                categoryId: null,
                categoryName: null,
                currency: person.currency,
                customColor: null,
                date: row.date,
                day: startOfDay(row.date),
                emoji: null,
                ends: null,
                exchangeRate: null,
                exchangeRateType: null,
                excludedFromTotals: false,
                feeForId: null,
                icon: null,
                id: row.id,
                imageColor: null,
                imageUri: null,
                income: into,
                installmentId: null,
                moved: { arrived: amount, arrivedCurrency: person.currency, fee: null, outside: null, sent: amount },
                note: row.note === "" ? route : row.note,
                recurringAnchorDay: null,
                recurringCoefficient: 1,
                recurringEndDate: null,
                recurringType: 0,
                sign: into ? "+" : "-",
                transferId: row.id,
            };
        });
    }, [rows, person, outside]);
}
