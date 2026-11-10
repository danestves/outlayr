import { decimalsFor } from "@outlayr/money/currency";
import { isoDay } from "@outlayr/money/ledger-zone";
import { roundMoney } from "@outlayr/money/round";
import { goalProgress, isPayoffPlan } from "@outlayr/money/savings-goal";
import type { GoalProgress } from "@outlayr/money/savings-goal";

import type { Ledger } from "../../../lib/dashboard-series-ledger";
import { addDays } from "../../../lib/ledger";
import { accountEntries, inMain, planRows } from "../accounts/model";
import type { AccountRow } from "../accounts/model";
import type { Goal } from "../goals/model";

export type Standing = "owesYou" | "settled" | "youOwe";
export type Side = Exclude<Standing, "settled">;
export type MovementKind = "borrowed" | "boughtOnCredit" | "gotPaidBack" | "lent" | "paidBack" | "soldOnCredit";

export const DUE_DAYS = 14;
const FIRST_DAY = "0000-01-01";
const LAST_DAY = "9999-12-31";

export interface Movement {
    /** The bank account on the other side; null when the money moved outside Outlayr. */
    accountId: string | null;
    /** Signed from your side, in the person's currency: positive when the money came from them. */
    amount: number;
    /** Who owes after it, stated positive. */
    balance: number;
    day: string;
    id: string;
    kind: MovementKind;
    note: string;
    /** Null for the opening balance, which lives on the account and cannot be deleted on its own. */
    rowId: string | null;
}

export interface Tally {
    count: number;
    total: number;
}

export interface PersonFacts {
    /** Borrowed while you owe, lent while they owe you. */
    added: Tally;
    movements: Movement[];
    repaid: Tally;
    /** The side the balance sits on, or sat on last for a settled person; null when it never moved. */
    side: Side | null;
    /** When the current balance started, or the day it reached zero once settled. */
    since: string | null;
}

export interface PlanLine {
    /** Stated positive; null when on pace or ahead. */
    behind: number | null;
    /** An ended plan draws no line and asks for nothing. */
    endedOn: string | null;
    fraction: number;
    goal: Goal;
    pace: GoalProgress["pace"];
    reached: boolean;
    targetDay: string;
}

export interface DebtRow {
    account: AccountRow;
    /** Who owes, stated positive in the account's currency. A card in your favour reads negative. */
    amount: number;
    card: boolean;
    facts: PersonFacts;
    lastDay: string;
    line: PlanLine | null;
    standing: Standing;
    /** `amount` in the main currency. */
    value: number;
}

export interface DueWindow {
    count: number;
    next: { day: string; name: string; overdue: boolean };
    /** In the main currency. */
    total: number;
}

export interface DebtsModel {
    behind: DebtRow | null;
    cards: DebtRow[];
    due: DueWindow | null;
    owesYou: DebtRow[];
    settled: DebtRow[];
    totals: { cards: number; owesYou: number; youOwe: number };
    youOwe: DebtRow[];
}

const settle = (value: number, currency: string) => roundMoney(value, decimalsFor(currency)) || 0;

const localMidnight = (day: string) =>
    new Date(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)));

const dayOf = (ledger: Pick<Ledger, "offsetAt">, at: number) => isoDay(at, ledger.offsetAt(at));

/** Rounded first, so a float residue (0.10 + 0.20 - 0.30) reads as settled. */
export function standingOf(balance: number, currency: string): Standing {
    const rounded = settle(balance, currency);
    if (rounded < 0) {
        return "youOwe";
    }
    return rounded > 0 ? "owesYou" : "settled";
}

/** A person's balance drops when money leaves them, so a movement reads by which side it stood on before. */
function verbOf(before: number, value: number): MovementKind {
    if (value > 0) {
        return before < 0 ? "paidBack" : "lent";
    }
    return before > 0 ? "gotPaidBack" : "borrowed";
}

type PersonAccount = Pick<AccountRow, "currency" | "id" | "initialBalance" | "openedDay">;

/** Newest first, each with the balance it left behind. */
export function movementsOf(ledger: Ledger, person: PersonAccount): Movement[] {
    const { currency } = person;
    const notes = new Map(
        [...ledger.books.transfers, ...ledger.books.outsideMoves].map((row) => [row.localId, row.note ?? ""])
    );
    const flows = accountEntries(ledger, person.id, FIRST_DAY, LAST_DAY).toReversed();
    const out: Movement[] = [];
    let running = 0;
    const push = (movement: Omit<Movement, "amount" | "balance" | "kind">, value: number, kind?: MovementKind) => {
        const before = settle(running, currency);
        running += value;
        out.push({
            ...movement,
            amount: settle(-value, currency),
            balance: Math.abs(settle(running, currency)),
            kind: kind ?? verbOf(before, value),
        });
    };
    if (person.initialBalance !== 0) {
        push({ accountId: null, day: person.openedDay, id: "opening", note: "", rowId: null }, person.initialBalance);
    }
    for (const flow of flows) {
        const onCredit = flow.kind === "entry" && !flow.outside;
        let credit: MovementKind | undefined;
        if (onCredit) {
            credit = flow.value > 0 ? "soldOnCredit" : "boughtOnCredit";
        }
        push(
            {
                accountId: flow.other,
                day: flow.day,
                id: flow.id,
                note: notes.get(flow.rowId) ?? flow.title,
                rowId: flow.rowId,
            },
            flow.value,
            credit
        );
    }
    return out.toReversed();
}

export function personFacts(movements: readonly Movement[], currency: string): PersonFacts {
    let side: Side | null = null;
    let since: string | null = null;
    let before = 0;
    const plus: Tally = { count: 0, total: 0 };
    const minus: Tally = { count: 0, total: 0 };
    for (const movement of movements.toReversed()) {
        const after = settle(before - movement.amount, currency);
        if (before === 0 && after !== 0) {
            since = movement.day;
        } else if (before !== 0 && after === 0) {
            since = movement.day;
        }
        if (after !== 0) {
            side = after < 0 ? "youOwe" : "owesYou";
        }
        const tally = movement.amount > 0 ? plus : minus;
        tally.count += 1;
        tally.total += Math.abs(movement.amount);
        before = after;
    }
    const round = (tally: Tally) => ({ count: tally.count, total: settle(tally.total, currency) });
    return {
        added: round(side === "owesYou" ? minus : plus),
        movements: [...movements],
        repaid: round(side === "owesYou" ? plus : minus),
        side,
        since,
    };
}

/**
 * The day a plan was paid off, read from history so it ends on the right day even if Debts was never opened. A day's
 * payments count before its new debt: paid off in the morning and borrowed again by night still ends it. The day it
 * was set counts only how it closed.
 */
export function payoffEndedOn(
    start: number,
    startDay: string,
    movements: readonly Pick<Movement, "amount" | "day">[],
    currency: string
): string | null {
    const direction = Math.sign(start);
    const byDay = new Map<string, { net: number; paid: number }>();
    for (const { amount, day } of movements) {
        const value = -amount;
        const total = byDay.get(day) ?? { net: 0, paid: 0 };
        total.net += value;
        total.paid += Math.sign(value) === -direction ? value : 0;
        byDay.set(day, total);
    }
    const reached = (balance: number) => direction * settle(balance, currency) <= 0;
    let running = 0;
    for (const [day, { net, paid }] of [...byDay].toSorted(([a], [b]) => a.localeCompare(b))) {
        const lowest = running + paid;
        running += net;
        if (day > startDay ? reached(lowest) || reached(running) : day === startDay && reached(running)) {
            return day;
        }
    }
    return null;
}

export const plansOf = (ledger: Ledger, accountId: string) =>
    ledger.books.savingsGoals.filter(
        (goal) => goal.deletedAt === null && goal.accountId === accountId && isPayoffPlan(goal)
    );

/** The live plan, else the latest one that ended. Read in the account's own currency, so a rate never moves it. */
export function planLine(ledger: Ledger, row: AccountRow, movements: readonly Movement[]): PlanLine | null {
    const decimals = decimalsFor(row.currency);
    const lines = plansOf(ledger, row.id)
        .toSorted((a, b) => b.dateCreated - a.dateCreated)
        .flatMap((goal): PlanLine[] => {
            if (goal.targetDate === null) {
                return [];
            }
            const startDay = dayOf(ledger, goal.dateCreated);
            const targetDay = dayOf(ledger, goal.targetDate);
            const start = goal.startAmount ?? 0;
            const progress = goalProgress(
                row.balance,
                0,
                {
                    now: localMidnight(ledger.today),
                    startAmount: start,
                    startDate: localMidnight(startDay),
                    targetDate: localMidnight(targetDay),
                },
                decimals
            );
            const { standing } = progress;
            return [
                {
                    behind: standing && !standing.onPace && standing.against < 0 ? -standing.against : null,
                    endedOn: payoffEndedOn(start, startDay, movements, row.currency),
                    fraction: progress.fraction,
                    goal,
                    pace: progress.pace,
                    reached: progress.reached,
                    targetDay,
                },
            ];
        });
    return lines.find((line) => line.endedOn === null) ?? lines[0] ?? null;
}

/** A person with any balance, or a card or loan that is owed, can take a payoff plan. */
export function takesPayoffPlan(row: Pick<AccountRow, "balance" | "currency" | "kind">) {
    const rounded = settle(row.balance, row.currency);
    return row.kind === "person" ? rounded !== 0 : row.kind === "liability" && rounded < 0;
}

/** What a plan set today to `targetDay` would ask, read the way a saved plan reads its pace. */
export function planAsk(balance: number, today: string, targetDay: string, currency: string) {
    const now = localMidnight(today);
    const { pace } = goalProgress(
        balance,
        0,
        { now, startAmount: balance, startDate: now, targetDate: localMidnight(targetDay) },
        decimalsFor(currency)
    );
    return pace;
}

export function dueWindow(ledger: Ledger): DueWindow | null {
    const through = addDays(ledger.today, DUE_DAYS);
    const names = new Map(ledger.books.accounts.map((row) => [row.localId, row.name]));
    const due = planRows(ledger)
        .flatMap((plan) =>
            plan.rows
                .filter((row) => row.remaining > 0 && row.day <= through)
                .map((row) => ({ ...row, accountId: plan.accountId, currency: plan.currency }))
        )
        .toSorted((a, b) => a.day.localeCompare(b.day));
    const [next] = due;
    if (!next) {
        return null;
    }
    const total = due.reduce((sum, row) => sum + inMain(ledger, row.remaining, row.currency).value, 0);
    return {
        count: due.length,
        next: { day: next.day, name: names.get(next.accountId) ?? "", overdue: next.day < ledger.today },
        total: settle(total, ledger.currency),
    };
}

function debtRow(ledger: Ledger, account: AccountRow): DebtRow {
    const movements = movementsOf(ledger, account);
    const card = account.kind === "liability";
    const standing = standingOf(account.balance, account.currency);
    return {
        account,
        amount: card ? settle(-account.balance, account.currency) : Math.abs(settle(account.balance, account.currency)),
        card,
        facts: personFacts(movements, account.currency),
        lastDay: movements[0]?.day ?? account.openedDay,
        line: planLine(ledger, account, movements),
        standing,
        value: card ? settle(-account.value, ledger.currency) : Math.abs(settle(account.value, ledger.currency)),
    };
}

const largestFirst = (a: DebtRow, b: DebtRow) => b.value - a.value;

export function debtsModel(ledger: Ledger, rows: readonly AccountRow[]): DebtsModel {
    const people = rows.filter((row) => row.kind === "person").map((row) => debtRow(ledger, row));
    const cards = rows
        .filter((row) => row.kind === "liability")
        .map((row) => debtRow(ledger, row))
        .toSorted(largestFirst);
    const owesYou = people.filter((row) => row.standing === "owesYou").toSorted(largestFirst);
    const youOwe = people.filter((row) => row.standing === "youOwe").toSorted(largestFirst);
    const settled = people
        .filter((row) => row.standing === "settled")
        .toSorted((a, b) => b.lastDay.localeCompare(a.lastDay));
    const sum = (list: readonly DebtRow[]) =>
        settle(
            list.reduce((total, row) => total + Math.max(0, row.value), 0),
            ledger.currency
        );
    const behind = [...youOwe, ...owesYou]
        .filter((row) => row.line?.endedOn === null && row.line.behind !== null)
        .toSorted((a, b) => (b.line?.behind ?? 0) - (a.line?.behind ?? 0));
    return {
        behind: behind[0] ?? null,
        cards,
        due: dueWindow(ledger),
        owesYou,
        settled,
        totals: { cards: sum(cards), owesYou: sum(owesYou), youOwe: sum(youOwe) },
        youOwe,
    };
}
