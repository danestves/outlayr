import { localDate } from "@outlayr/backend/confect/mcpLedger";
import { netWorth, toAccountKind } from "@outlayr/money/account-kind";
import type { AccountKind } from "@outlayr/money/account-kind";
import { restate } from "@outlayr/money/account-overview";
import { decimalsFor } from "@outlayr/money/currency";
import { toCells, valueCell } from "@outlayr/money/currency-totals";
import type { CurrencyEntry } from "@outlayr/money/currency-totals";
import { utcDateString } from "@outlayr/money/dates";
import { roundMoney } from "@outlayr/money/round";

import type { Ledger, Scope } from "./dashboard-series-ledger";

interface Movement {
    accountId: string;
    at: number;
    entry: CurrencyEntry;
    key: string;
}

interface Holder {
    currency: string;
    id: string;
    initialBalance: number;
    kind: AccountKind;
    opened: string | null;
}

interface Movements {
    holders: readonly Holder[];
    list: readonly Movement[];
}

const movementsByLedger = new WeakMap<Ledger, Movements>();

function movementsOf(ledger: Ledger): Movements {
    const cached = movementsByLedger.get(ledger);
    if (cached) {
        return cached;
    }
    const { accounts, installmentPlans, outsideMoves, outsidePayments, transactions, transfers } = ledger.books;
    const live = accounts.filter((row) => row.deletedAt === null).toSorted((a, b) => a.sortOrder - b.sortOrder);
    const currencyOf = new Map(live.map((row) => [row.localId, row.currency]));
    const planAccount = new Map(
        installmentPlans.filter((row) => row.deletedAt === null).map((row) => [row.localId, row.accountId])
    );
    const list: Movement[] = [];
    const add = (accountId: string, leg: string, entry: CurrencyEntry & { date: Date }) => {
        const key = `${leg}|${entry.currency ?? ""}|${utcDateString(entry.date.getTime())}|${entry.income}`;
        list.push({ accountId, at: entry.date.getTime(), entry, key });
    };
    for (const row of transactions) {
        if (row.deletedAt === null && row.accountId) {
            add(row.accountId, "flow", {
                amount: row.amount,
                amountUsd: row.amountUsd,
                currency: row.currency,
                date: new Date(row.date),
                exchangeRate: row.exchangeRate,
                exchangeRateType: row.exchangeRateType,
                income: row.income,
            });
        }
    }
    for (const row of transfers) {
        if (row.deletedAt === null) {
            const date = new Date(row.date);
            add(row.fromAccountId, "outbound", {
                amount: row.fromAmount,
                amountUsd: row.fromAmountUsd,
                currency: row.fromCurrency,
                date,
                income: false,
            });
            add(row.toAccountId, "inbound", {
                amount: row.toAmount,
                amountUsd: row.toAmountUsd,
                currency: row.toCurrency,
                date,
                income: true,
            });
        }
    }
    const arrivals = [
        ...outsidePayments.map((row) => ({ accountId: planAccount.get(row.planId), row })),
        ...outsideMoves.map((row) => ({ accountId: row.accountId, row })),
    ];
    for (const { accountId, row } of arrivals) {
        const currency = accountId === undefined ? undefined : currencyOf.get(accountId);
        if (row.deletedAt === null && accountId !== undefined && currency !== undefined) {
            add(accountId, "inbound", {
                amount: row.amount,
                amountUsd: row.amountUsd,
                currency,
                date: new Date(row.date),
                income: true,
            });
        }
    }
    const prepared = {
        holders: live.map((row) => ({
            currency: row.currency,
            id: row.localId,
            initialBalance: row.initialBalance,
            kind: toAccountKind(row.kind),
            opened:
                row.initialBalance === 0
                    ? null
                    : localDate(row.initialBalanceDate, ledger.offsetAt(row.initialBalanceDate)),
        })),
        list: list.toSorted((a, b) => a.at - b.at),
    };
    movementsByLedger.set(ledger, prepared);
    return prepared;
}

export interface NetWorthPoint {
    accounts: readonly { balance: number; id: string }[];
    net: number;
}

interface Pile {
    currency: string;
    entries: CurrencyEntry[];
    value: number;
}

export function netWorthPoints(ledger: Ledger, scope: Scope, instants: readonly number[]): NetWorthPoint[] {
    const { holders, list } = movementsOf(ledger);
    const chosen = new Set(scope.accounts);
    const accounts = new Map(
        holders
            .filter((holder) => chosen.size === 0 || chosen.has(holder.id))
            .map((holder) => [holder.id, { holder, piles: new Map<string, Pile>() }])
    );
    const decimals = decimalsFor(ledger.currency);
    const results = Array.from({ length: instants.length }, (): NetWorthPoint => ({ accounts: [], net: 0 }));
    const touched = new Set<Pile>();
    let next = 0;
    const ascending = instants.map((instant, index) => ({ index, instant })).toSorted((a, b) => a.instant - b.instant);
    for (const { index, instant } of ascending) {
        for (let movement = list[next]; movement && movement.at <= instant; movement = list[next]) {
            next += 1;
            const account = accounts.get(movement.accountId);
            if (account) {
                let pile = account.piles.get(movement.key);
                if (!pile) {
                    pile = { currency: account.holder.currency, entries: [], value: 0 };
                    account.piles.set(movement.key, pile);
                }
                pile.entries.push(movement.entry);
                touched.add(pile);
            }
        }
        for (const pile of touched) {
            const [cell] = toCells(pile.entries);
            if (cell) {
                pile.value = (cell.income ? 1 : -1) * valueCell(cell, pile.currency, ledger.rates);
            }
        }
        touched.clear();
        const rateDay = utcDateString(instant);
        const day = localDate(instant, ledger.offsetAt(instant));
        const balances = [...accounts.values()].flatMap(({ holder, piles }) => {
            if (holder.opened !== null && holder.opened > day && instant < ledger.now) {
                return [];
            }
            let total = holder.initialBalance;
            for (const pile of piles.values()) {
                total += pile.value;
            }
            const { value } = restate(total, holder.currency, ledger.currency, rateDay, ledger.rates);
            return [{ balance: value, id: holder.id, kind: holder.kind }];
        });
        results[index] = {
            accounts: balances.map(({ balance, id }) => ({ balance: roundMoney(balance, decimals), id })),
            net: roundMoney(netWorth(balances).net, decimals),
        };
    }
    return results;
}
