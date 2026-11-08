import { accountBalances } from "@outlayr/backend/confect/ledgerView";
import { accountLook } from "@outlayr/backend/confect/lib/ledgerLog";
import { localDate } from "@outlayr/backend/confect/mcpLedger";
import { toAccountKind } from "@outlayr/money/account-kind";
import type { AccountKind } from "@outlayr/money/account-kind";
import { restate } from "@outlayr/money/account-overview";
import { decimalsFor } from "@outlayr/money/currency";
import { utcDateString } from "@outlayr/money/dates";
import { roundMoney } from "@outlayr/money/round";
import { valueDatedRowsIn } from "@outlayr/money/valuation";

import { deletedAccount } from "../../../lib/account-writes";
import { endOfDay, openAccounts, startOfDay } from "../../../lib/dashboard-series-ledger";
import type { Ledger } from "../../../lib/dashboard-series-ledger";
import { accountFlows, netWorthPoints } from "../../../lib/dashboard-series-net-worth";
import type { AccountFlow } from "../../../lib/dashboard-series-net-worth";
import { addDays, daysBetween } from "../../../lib/ledger";
import type { Overview } from "../../ledger/overview";

export interface AccountRow {
    /** In the account's currency, signed as stored: a charged card is negative. */
    balance: number;
    checkedAt: number | null;
    creditLimit: number | null;
    currency: string;
    exact: boolean;
    id: string;
    initialBalance: number;
    kind: AccountKind;
    look: ReturnType<typeof accountLook>;
    name: string;
    openedDay: string;
    paymentDay: number | null;
    statementDay: number | null;
    /** The balance in the main currency. */
    value: number;
}

/** `accountBalances` keeps open accounts in `sortOrder` and one row each, so the two line up by index. */
export function accountRows(ledger: Ledger, overview: Overview): AccountRow[] {
    return openAccounts(ledger.books).flatMap((row, index) => {
        const shown = overview.balances.accounts[index];
        if (!shown || shown.name !== row.name) {
            return [];
        }
        return [
            {
                balance: shown.balance,
                checkedAt: row.checkedAt ?? null,
                creditLimit: row.creditLimit ?? null,
                currency: row.currency,
                exact: shown.exact,
                id: row.localId,
                initialBalance: row.initialBalance,
                kind: toAccountKind(row.kind),
                look: accountLook(row),
                name: row.name,
                openedDay: openedOn(ledger, row),
                paymentDay: row.paymentDay ?? null,
                statementDay: row.statementDay ?? null,
                value: shown.balanceInMainCurrency,
            },
        ];
    });
}

/** A zero opening balance has no real date, so history starts at the first movement when that is earlier. */
function openedOn(ledger: Ledger, row: Ledger["books"]["accounts"][number]) {
    const day = localDate(row.initialBalanceDate, ledger.offsetAt(row.initialBalanceDate));
    const [first] = row.initialBalance === 0 ? flowsOf(ledger, row.localId) : [];
    return first && first.day < day ? first.day : day;
}

const clockOf = ({ now, offsetAt }: Ledger) => ({ now, offsetAt });

/** The balance as if the account were open: `accountBalances` leaves archived ones out of every total. */
function heldAsOpen(ledger: Ledger, row: Ledger["books"]["accounts"][number]) {
    const books = { ...ledger.books, accounts: [{ ...row, archivedAt: null }] };
    return accountBalances(books, ledger.currency, ledger.rates, clockOf(ledger)).accounts[0];
}

export interface AccountFacts {
    /** Balance corrections, which go with the account on delete while transactions stay. */
    adjustments: number;
    /** In the account's currency. */
    balance: number;
    netAfter: number;
    plans: number;
    transactions: number;
    transfers: number;
}

/**
 * What the archive and delete dialogs state. `netAfter` is the archive figure: an archived account already left net
 * worth, and its transfers stay. Delete takes transfers with it, so it states `netAfterDelete`.
 */
export function accountFacts(ledger: Ledger, accountId: string): AccountFacts {
    const { accounts, installmentPlans, outsideMoves, transactions, transfers } = ledger.books;
    const onAccount = (entry: { accountId?: string | null; deletedAt: number | null }) =>
        entry.deletedAt === null && entry.accountId === accountId;
    const row = accounts.find((each) => each.localId === accountId);
    const held = row && heldAsOpen(ledger, row);
    const [now] = netWorthPoints(ledger, { accounts: [] }, [ledger.now]);
    const counted = row && (row.archivedAt ?? null) === null ? (held?.balanceInMainCurrency ?? 0) : 0;
    return {
        adjustments: outsideMoves.filter(onAccount).length,
        balance: held?.balance ?? 0,
        netAfter: roundMoney((now?.net ?? 0) - counted, decimalsFor(ledger.currency)),
        plans: installmentPlans.filter(onAccount).length,
        transactions: transactions.filter(onAccount).length,
        transfers: transfers.filter(
            (move) => move.deletedAt === null && (move.fromAccountId === accountId || move.toAccountId === accountId)
        ).length,
    };
}

/** Net worth once the delete lands: the account's transfers and fees also leave the accounts on the other side. */
export function netAfterDelete(ledger: Ledger, account: Ledger["books"]["accounts"][number]) {
    const { books } = ledger;
    const changes = new Map(
        deletedAccount(books, account, ledger.now).map((row) => [`${row.table}|${row.localId}`, row])
    );
    const applied = <Row extends { deletedAt: number | null; localId: string }>(table: string, rows: readonly Row[]) =>
        rows.map((row) => {
            const change = changes.get(`${table}|${row.localId}`);
            return change ? { ...row, ...change.fields, deletedAt: change.deletedAt } : row;
        });
    const after = {
        ...books,
        accounts: applied("accounts", books.accounts),
        installmentPlans: applied("installmentPlans", books.installmentPlans),
        outsideMoves: applied("outsideMoves", books.outsideMoves),
        outsidePayments: applied("outsidePayments", books.outsidePayments),
        transactions: applied("transactions", books.transactions),
        transfers: applied("transfers", books.transfers),
    };
    const [point] = netWorthPoints({ ...ledger, books: after }, { accounts: [] }, [ledger.now]);
    return roundMoney(point?.net ?? 0, decimalsFor(ledger.currency));
}

export interface ArchivedRow {
    archivedDay: string;
    balance: number;
    currency: string;
    id: string;
    lastDay: string | null;
    look: ReturnType<typeof accountLook>;
    name: string;
}

/** Newest archive first. Its last entry comes from the raw books: archived accounts have no flows. */
export function archivedRows(ledger: Ledger): ArchivedRow[] {
    const shelved = ledger.books.accounts.filter((row) => row.deletedAt === null && (row.archivedAt ?? null) !== null);
    if (shelved.length === 0) {
        return [];
    }
    const lastAt = new Map<string, number>();
    const saw = (id: string | null | undefined, at: number) => {
        if (id && at > (lastAt.get(id) ?? 0)) {
            lastAt.set(id, at);
        }
    };
    for (const entry of [...ledger.books.transactions, ...ledger.books.outsideMoves]) {
        if (entry.deletedAt === null && entry.date <= ledger.now) {
            saw(entry.accountId, entry.date);
        }
    }
    for (const move of ledger.books.transfers) {
        if (move.deletedAt === null && move.date <= ledger.now) {
            saw(move.fromAccountId, move.date);
            saw(move.toAccountId, move.date);
        }
    }
    const dayOf = (at: number) => localDate(at, ledger.offsetAt(at));
    return shelved
        .toSorted((a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0))
        .map((row) => {
            const last = lastAt.get(row.localId);
            return {
                archivedDay: dayOf(row.archivedAt ?? ledger.now),
                balance: heldAsOpen(ledger, row)?.balance ?? 0,
                currency: row.currency,
                id: row.localId,
                lastDay: last === undefined ? null : dayOf(last),
                look: accountLook(row),
                name: row.name,
            };
        });
}

export type AccountSort = "balance" | "order";

export function storedSort(ledger: Ledger): AccountSort {
    const byHand = ledger.books.appMeta.find((row) => row.key === "accountsByHand")?.value === "true";
    return byHand ? "order" : "balance";
}

export const sortRows = (rows: readonly AccountRow[], sort: AccountSort) =>
    sort === "order" ? [...rows] : rows.toSorted((a, b) => b.value - a.value);

export interface AccountGroups {
    assets: AccountRow[];
    cards: AccountRow[];
}

/** People are debts, listed on their own page; their balances still count toward net worth. */
export function groupRows(rows: readonly AccountRow[]): AccountGroups {
    return {
        assets: rows.filter((row) => row.kind === "asset"),
        cards: rows.filter((row) => row.kind === "liability"),
    };
}

export const STALE_AFTER_DAYS = 7;

export type CheckedAge = { days: number; state: "daysAgo" | "stale" } | { state: "never" | "today" | "yesterday" };

/** Counts local calendar days, so a check at 23:50 reads "yesterday" ten minutes into the next day. */
export function checkedAge(checkedAt: number | null, ledger: Pick<Ledger, "offsetAt" | "today">): CheckedAge {
    if (checkedAt === null) {
        return { state: "never" };
    }
    const days = daysBetween(localDate(checkedAt, ledger.offsetAt(checkedAt)), ledger.today);
    if (days <= 0) {
        return { state: "today" };
    }
    if (days === 1) {
        return { state: "yesterday" };
    }
    return { days, state: days > STALE_AFTER_DAYS ? "stale" : "daysAgo" };
}

export interface StatementCycle {
    closedOn: string;
    dueOn: string;
    nextCloseOn: string;
}

const pad = (value: number) => String(value).padStart(2, "0");

/** The day in that month, or its last day when the month is shorter. `month` may run past 0 to 11. */
function onDay(year: number, month: number, day: number) {
    const first = new Date(Date.UTC(year, month, 1));
    const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    return `${first.getUTCFullYear()}-${pad(first.getUTCMonth() + 1)}-${pad(Math.min(day, last))}`;
}

const yearMonth = (day: string) => [Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1] as const;

export function statementCycle(statementDay: number, paymentDay: number, today: string): StatementCycle {
    const [year, month] = yearMonth(today);
    const thisMonth = onDay(year, month, statementDay);
    const closedOn = thisMonth < today ? thisMonth : onDay(year, month - 1, statementDay);
    const [closeYear, closeMonth] = yearMonth(closedOn);
    const sameMonth = onDay(closeYear, closeMonth, paymentDay);
    return {
        closedOn,
        dueOn: sameMonth > closedOn ? sameMonth : onDay(closeYear, closeMonth + 1, paymentDay),
        nextCloseOn: onDay(closeYear, closeMonth + 1, statementDay),
    };
}

export interface CardStatement {
    cycle: StatementCycle;
    /** Null when the card opened after the last close, or when installments could be billed later. */
    due: number | null;
    overdue: boolean;
    /** Charged since the last close, stated positive. */
    since: number;
}

/**
 * What the last statement asks for: the debt at the close, less what came in since. Native also subtracts
 * installments billed after the due date, which the web has no schedule for, so a card with plans shows no amount.
 */
export function cardStatement(
    row: Pick<AccountRow, "currency" | "initialBalance" | "openedDay" | "paymentDay" | "statementDay">,
    flows: readonly Pick<AccountFlow, "day" | "value">[],
    today: string,
    hasPlans: boolean
): CardStatement | null {
    if (row.statementDay === null || row.paymentDay === null) {
        return null;
    }
    const cycle = statementCycle(row.statementDay, row.paymentDay, today);
    const decimals = decimalsFor(row.currency);
    let atClose = row.initialBalance;
    let inSince = 0;
    let since = 0;
    for (const flow of flows) {
        if (flow.day <= cycle.closedOn) {
            atClose += flow.value;
        } else if (flow.value > 0) {
            inSince += flow.value;
        } else {
            since -= flow.value;
        }
    }
    const due =
        hasPlans || row.openedDay > cycle.closedOn ? null : roundMoney(Math.max(0, -atClose - inSince), decimals) || 0;
    return {
        cycle,
        due,
        overdue: due !== null && due > 0 && cycle.dueOn < today,
        since: roundMoney(since, decimals),
    };
}

export interface PeriodFlows {
    cameIn: number;
    entriesIn: number;
    entriesOut: number;
    moved: number;
    transfers: number;
    wentOut: number;
}

export function periodFlows(flows: readonly AccountFlow[], from: string, to: string, currency: string): PeriodFlows {
    const totals = { cameIn: 0, entriesIn: 0, entriesOut: 0, moved: 0, transfers: 0, wentOut: 0 };
    for (const flow of flows) {
        if (flow.day < from || flow.day > to) {
            continue;
        }
        if (flow.leg !== "flow") {
            totals.moved += flow.value;
            totals.transfers += 1;
        } else if (flow.value >= 0) {
            totals.cameIn += flow.value;
            totals.entriesIn += 1;
        } else {
            totals.wentOut -= flow.value;
            totals.entriesOut += 1;
        }
    }
    const decimals = decimalsFor(currency);
    return {
        ...totals,
        cameIn: roundMoney(totals.cameIn, decimals),
        moved: roundMoney(totals.moved, decimals),
        wentOut: roundMoney(totals.wentOut, decimals),
    };
}

const flowsMemo = new WeakMap<Ledger, Map<string, AccountFlow[]>>();

export function flowsOf(ledger: Ledger, accountId: string) {
    const memo = flowsMemo.get(ledger) ?? new Map<string, AccountFlow[]>();
    flowsMemo.set(ledger, memo);
    const kept = memo.get(accountId);
    if (kept) {
        return kept;
    }
    const flows = accountFlows(ledger, accountId);
    memo.set(accountId, flows);
    return flows;
}

export const hasPlans = (ledger: Ledger, accountId: string) =>
    ledger.books.installmentPlans.some((plan) => plan.deletedAt === null && plan.accountId === accountId);

/** An amount in another currency restated at today's rate, flagged when no rate covers today. */
export function inMain(ledger: Ledger, amount: number, currency: string) {
    const restated = restate(amount, currency, ledger.currency, utcDateString(ledger.now), ledger.rates);
    return { exact: restated.exact, value: roundMoney(restated.value, decimalsFor(ledger.currency)) };
}

export interface CreditLine {
    available: number;
    exact: boolean;
    limit: number;
}

/** Cards without a limit add nothing; an overdrawn line reads as zero available, not negative. */
export function creditLine(ledger: Ledger, cards: readonly AccountRow[]): CreditLine | null {
    const limited = cards.filter((row) => row.creditLimit !== null);
    if (limited.length === 0) {
        return null;
    }
    let available = 0;
    let limit = 0;
    let exact = true;
    for (const row of limited) {
        const line = row.creditLimit ?? 0;
        const free = inMain(ledger, Math.max(0, line + row.balance), row.currency);
        const whole = inMain(ledger, line, row.currency);
        available += free.value;
        limit += whole.value;
        exact &&= free.exact && whole.exact;
    }
    const decimals = decimalsFor(ledger.currency);
    return { available: roundMoney(available, decimals), exact, limit: roundMoney(limit, decimals) };
}

/** Balances in each account's own currency at the start of `from` and now, for the period column. */
export function changeSince(ledger: Ledger, from: string) {
    const [start, now] = netWorthPoints(ledger, { accounts: [] }, [startOfDay(ledger, from) - 1, ledger.now]);
    const before = new Map(start?.accounts.map((each) => [each.id, each.own]));
    return new Map(
        now?.accounts.map((each) => {
            const currency = ledger.accounts.get(each.id)?.currency ?? ledger.currency;
            return [each.id, roundMoney(each.own - (before.get(each.id) ?? 0), decimalsFor(currency))];
        })
    );
}

/** Daily balances in each account's own currency over the last `days`, oldest first. */
export function recentBalances(ledger: Ledger, days: number) {
    const instants = Array.from({ length: days + 1 }, (_, index) =>
        Math.min(ledger.now, endOfDay(ledger, addDays(ledger.today, index - days)))
    );
    const points = netWorthPoints(ledger, { accounts: [] }, instants);
    const lines = new Map<string, number[]>();
    for (const point of points) {
        for (const each of point.accounts) {
            const line = lines.get(each.id);
            if (line) {
                line.push(each.own);
            } else {
                lines.set(each.id, [each.own]);
            }
        }
    }
    return lines;
}

export type WorthRange = "all" | "month" | "quarter" | "sixMonths" | "year";

const MONTHS_IN: Record<"sixMonths" | "year", number> = { sixMonths: 6, year: 12 };
const MONTH_DAYS = 30;
const QUARTER_WEEKS = 13;
const WEEK = 7;

const monthEnd = (today: string, back: number) => {
    const [year, month] = yearMonth(today);
    const last = new Date(Date.UTC(year, month - back + 1, 0));
    return last.toISOString().slice(0, 10);
};

export const monthsBetween = (from: string, to: string) => {
    const [fromYear, fromMonth] = yearMonth(from);
    const [toYear, toMonth] = yearMonth(to);
    return (toYear - fromYear) * 12 + toMonth - fromMonth;
};

/** The days a range samples, oldest first; monthly ranges end each month and finish on today. */
export function rangeDays(ledger: Ledger, range: WorthRange) {
    if (range === "month") {
        return Array.from({ length: MONTH_DAYS + 1 }, (_, index) => addDays(ledger.today, index - MONTH_DAYS));
    }
    if (range === "quarter") {
        return Array.from({ length: QUARTER_WEEKS + 1 }, (_, index) =>
            addDays(ledger.today, (index - QUARTER_WEEKS) * WEEK)
        );
    }
    const [opened] = openAccounts(ledger.books)
        .map((row) => openedOn(ledger, row))
        .toSorted();
    const months =
        range === "all" ? Math.max(1, monthsBetween(opened ?? ledger.today, ledger.today)) + 1 : MONTHS_IN[range];
    return Array.from({ length: months }, (_, index) =>
        index === months - 1 ? ledger.today : monthEnd(ledger.today, months - 1 - index)
    );
}

/** Net worth, what is owned and what is owed at the end of each day, in the main currency. */
export function worthSeries(ledger: Ledger, days: readonly string[]) {
    const points = netWorthPoints(
        ledger,
        { accounts: [] },
        days.map((day) => Math.min(ledger.now, endOfDay(ledger, day)))
    );
    return points.map((point, index) => ({ ...point, day: days[index] ?? ledger.today }));
}

export const monthStart = (today: string) => `${today.slice(0, 8)}01`;

export interface CurrencyShare {
    code: string;
    exact: boolean;
    value: number;
}

/** What each currency adds to net worth, largest first; a card's debt pulls its currency down. */
export function byCurrency(ledger: Ledger, rows: readonly AccountRow[]): CurrencyShare[] {
    const totals = new Map<string, CurrencyShare>();
    for (const row of rows) {
        const kept = totals.get(row.currency) ?? { code: row.currency, exact: true, value: 0 };
        totals.set(row.currency, {
            ...kept,
            exact: kept.exact && row.exact,
            value: kept.value + row.value,
        });
    }
    const decimals = decimalsFor(ledger.currency);
    return [...totals.values()]
        .map((share) => ({ ...share, value: roundMoney(share.value, decimals) }))
        .toSorted((a, b) => b.value - a.value);
}

const FLIP_BELOW = 0.01;

export interface Rate {
    exact: boolean;
    from: string;
    rate: number;
    to: string;
}

/** Today's rate for each foreign currency, quoted the way that keeps four decimals meaningful. */
export function ratesFor(ledger: Ledger, codes: readonly string[]): Rate[] {
    return [...new Set(codes)]
        .filter((code) => code !== ledger.currency)
        .map((code) => {
            const { exact, value } = restate(1, code, ledger.currency, utcDateString(ledger.now), ledger.rates);
            return value > 0 && value < FLIP_BELOW
                ? { exact, from: ledger.currency, rate: 1 / value, to: code }
                : { exact, from: code, rate: value, to: ledger.currency };
        });
}

/** Daily or monthly balances of one account in its own currency, aligned with `days`. */
export function accountSeries(ledger: Ledger, accountId: string, days: readonly string[]) {
    return worthSeries(ledger, days).map((point) => ({
        day: point.day,
        value: point.accounts.find((each) => each.id === accountId)?.own ?? 0,
    }));
}

export type EntryKind = "entry" | "inbound" | "outbound";

export interface AccountEntry {
    at: number;
    categoryId: string | null;
    day: string;
    id: string;
    kind: EntryKind;
    /** Signed, in the main currency as booked; null for an outside payment, which keeps no booked rate. */
    main: number | null;
    /** The other account of a transfer. */
    other: string | null;
    title: string;
    /** Signed, in the account's currency. */
    value: number;
}

const receivedMemo = new WeakMap<Ledger, Map<string, number>>();

/** What each transfer booked on arrival, in the main currency; `LedgerTransfer.amount` is the sent leg. */
function receivedOf(ledger: Ledger) {
    const kept = receivedMemo.get(ledger);
    if (kept) {
        return kept;
    }
    const rows = ledger.books.transfers.filter((row) => row.deletedAt === null);
    const values = valueDatedRowsIn(
        rows.map((row) => ({
            amount: row.toAmount,
            amountUsd: row.toAmountUsd,
            currency: row.toCurrency,
            date: new Date(row.date),
        })),
        ledger.currency,
        ledger.rates
    );
    const received = new Map(rows.map((row, index) => [row.localId, values[index] ?? 0]));
    receivedMemo.set(ledger, received);
    return received;
}

/** What moved this account between two days, newest first; transfers name the other side. */
export function accountEntries(ledger: Ledger, accountId: string, from: string, to: string): AccountEntry[] {
    const rows = new Map(ledger.rows.map((row) => [row.id, row]));
    const transfers = new Map(ledger.transfers.map((transfer) => [transfer.id, transfer]));
    return flowsOf(ledger, accountId)
        .filter((flow) => flow.day >= from && flow.day <= to)
        .map((flow): AccountEntry => {
            const row = rows.get(flow.id);
            const transfer = transfers.get(flow.id);
            const booked = row?.amount ?? (flow.leg === "inbound" ? receivedOf(ledger).get(flow.id) : transfer?.amount);
            let other: string | null = null;
            if (transfer) {
                other = flow.leg === "outbound" ? transfer.toId : transfer.fromId;
            }
            return {
                at: flow.at,
                categoryId: row?.topId ?? null,
                day: flow.day,
                id: `${flow.leg}-${flow.id}`,
                kind: flow.leg === "flow" ? "entry" : flow.leg,
                main:
                    booked === undefined
                        ? null
                        : roundMoney(Math.sign(flow.value) * Math.abs(booked), decimalsFor(ledger.currency)),
                other,
                title: row?.note ?? "",
                value: flow.value,
            };
        })
        .toSorted((a, b) => b.at - a.at);
}

export interface CategoryShare {
    color: string;
    id: string;
    name: string;
    value: number;
}

/** Spending charged to this account by top category, in the main currency, largest first. */
export function spentByCategory(ledger: Ledger, accountId: string, from: string, to: string): CategoryShare[] {
    const totals = new Map<string, number>();
    for (const row of ledger.rows) {
        if (row.accountId === accountId && !row.income && row.feeFor === null && row.day >= from && row.day <= to) {
            totals.set(row.topId, (totals.get(row.topId) ?? 0) + row.amount);
        }
    }
    const decimals = decimalsFor(ledger.currency);
    return [...totals]
        .flatMap(([id, value]) => {
            const category = ledger.categories.get(id);
            return category && value > 0 ? [{ ...category, value: roundMoney(value, decimals) }] : [];
        })
        .toSorted((a, b) => b.value - a.value);
}

/** The one account every transfer in the list went to or came from, or null when they differ. */
export function onlyCounterpart(entries: readonly Pick<AccountEntry, "kind" | "other">[]) {
    const moves = entries.filter((entry) => entry.kind !== "entry");
    const [first] = moves;
    const same = first && moves.every((entry) => entry.other === first.other && entry.kind === first.kind);
    return same && first.other ? { id: first.other, outbound: first.kind === "outbound" } : null;
}
