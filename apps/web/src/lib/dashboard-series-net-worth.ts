import { netWorth, toAccountKind } from "@outlayr/money/account-kind";
import type { AccountKind } from "@outlayr/money/account-kind";
import { restate } from "@outlayr/money/account-overview";
import { decimalsFor } from "@outlayr/money/currency";
import { toCells, valueCell } from "@outlayr/money/currency-totals";
import type { CurrencyEntry } from "@outlayr/money/currency-totals";
import { utcDateString } from "@outlayr/money/dates";
import { isoDay } from "@outlayr/money/ledger-zone";
import { roundMoney } from "@outlayr/money/round";

import { openAccounts } from "./dashboard-series-ledger";
import type { Ledger, Scope } from "./dashboard-series-ledger";

interface Movement {
    accountId: string;
    at: number;
    entry: CurrencyEntry;
    id: string;
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
    const { installmentPlans, outsideMoves, outsidePayments, transactions, transfers } = ledger.books;
    const live = openAccounts(ledger.books);
    const currencyOf = new Map(live.map((row) => [row.localId, row.currency]));
    const planAccount = new Map(
        installmentPlans.filter((row) => row.deletedAt === null).map((row) => [row.localId, row.accountId])
    );
    const list: Movement[] = [];
    const add = (accountId: string, leg: string, id: string, entry: CurrencyEntry & { date: Date }) => {
        const key = `${leg}|${entry.currency ?? null}|${utcDateString(entry.date.getTime())}|${entry.income}`;
        list.push({ accountId, at: entry.date.getTime(), entry, id, key });
    };
    for (const row of transactions) {
        if (row.deletedAt === null && row.accountId) {
            add(row.accountId, "flow", row.localId, {
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
            add(row.fromAccountId, "outbound", row.localId, {
                amount: row.fromAmount,
                amountUsd: row.fromAmountUsd,
                currency: row.fromCurrency,
                date,
                income: false,
            });
            add(row.toAccountId, "inbound", row.localId, {
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
            add(accountId, "inbound", row.localId, {
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
                    : isoDay(row.initialBalanceDate, ledger.offsetAt(row.initialBalanceDate)),
        })),
        list: list.toSorted((a, b) => a.at - b.at),
    };
    movementsByLedger.set(ledger, prepared);
    return prepared;
}

export interface NetWorthPoint {
    /** `balance` is in the main currency, `own` in the account's. */
    accounts: readonly { balance: number; id: string; own: number }[];
    net: number;
    owe: number;
    own: number;
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
    const results = Array.from({ length: instants.length }, (): NetWorthPoint => ({
        accounts: [],
        net: 0,
        owe: 0,
        own: 0,
    }));
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
        const day = isoDay(instant, ledger.offsetAt(instant));
        const balances = [...accounts.values()].flatMap(({ holder, piles }) => {
            if (holder.opened !== null && holder.opened > day && instant < ledger.now) {
                return [];
            }
            let total = holder.initialBalance;
            for (const pile of piles.values()) {
                total += pile.value;
            }
            const { value } = restate(total, holder.currency, ledger.currency, rateDay, ledger.rates);
            return [{ balance: value, id: holder.id, kind: holder.kind, own: total, currency: holder.currency }];
        });
        const worth = netWorth(balances);
        results[index] = {
            accounts: balances.map(({ balance, currency, id, own }) => ({
                balance: roundMoney(balance, decimals),
                id,
                own: roundMoney(own, decimalsFor(currency)),
            })),
            net: roundMoney(worth.net, decimals),
            owe: roundMoney(worth.owe, decimals),
            own: roundMoney(worth.own, decimals),
        };
    }
    return results;
}

export type FlowLeg = "flow" | "inbound" | "outbound";

export interface AccountFlow {
    at: number;
    day: string;
    /** The transaction, transfer or outside payment it came from. */
    id: string;
    leg: FlowLeg;
    /** Signed, in the account's currency. */
    value: number;
}

const legOf = (key: string): FlowLeg => {
    const leg = key.slice(0, key.indexOf("|"));
    return leg === "inbound" || leg === "outbound" ? leg : "flow";
};

export function accountFlows(ledger: Ledger, accountId: string): AccountFlow[] {
    const { holders, list } = movementsOf(ledger);
    const holder = holders.find((each) => each.id === accountId);
    if (!holder) {
        return [];
    }
    return list.flatMap((movement) => {
        const [cell] = movement.accountId === accountId ? toCells([movement.entry]) : [];
        if (!cell || movement.at > ledger.now) {
            return [];
        }
        const value = valueCell(cell, holder.currency, ledger.rates);
        return [
            {
                at: movement.at,
                id: movement.id,
                day: isoDay(movement.at, ledger.offsetAt(movement.at)),
                leg: legOf(movement.key),
                value: roundMoney(cell.income ? value : -value, decimalsFor(holder.currency)),
            },
        ];
    });
}
