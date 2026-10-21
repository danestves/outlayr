import { accountBalance } from "@outlayr/money/account-balance";
import type { AccountBalance } from "@outlayr/money/account-balance";
import { isPerson } from "@outlayr/money/account-kind";
import { accountsOverview, balanceIn } from "@outlayr/money/account-overview";
import type { AccountCellRow, DisplayedBalance, AccountsOverview } from "@outlayr/money/account-overview";
import { utcDateString } from "@outlayr/money/dates";
import type { RateTable } from "@outlayr/money/valuation";
import { isNull } from "drizzle-orm";
import { useMemo } from "react";

import type { Database } from "@/db/client";
import { accounts, outsidePayments, transactions, transfers } from "@/db/schema";
import type { PlottedCell } from "@/domain/goal-balance-series";
import { roundToMinorUnits } from "@/domain/money";
import { netWorthSeries } from "@/domain/net-worth-series";
import type { NetWorthSeriesPoint } from "@/domain/net-worth-series";

import type { Account } from "./accounts-core";
import { settledAccountCellQuery, settledAccountsCellQuery, toCurrencyCell } from "./cell-query";
import type { CellRow } from "./cell-query";
import { useLiveQuery } from "./live-query";
import { useDecoratedRows } from "./transactions";
import type { TransactionWithCategory } from "./transactions";
import { accountTransactionsQuery } from "./transactions-core";
import {
    settledOutsidePaymentQuery,
    settledOutsidePaymentsQuery,
    settledTransferInboundQuery,
    settledTransferOutboundQuery,
    settledTransfersInboundQuery,
    settledTransfersOutboundQuery,
    toTransferCell,
} from "./transfer-cells";
import { useValuation, useValuationIn } from "./use-valuation";
import { loadValuationIn } from "./valuation-source";
import type { Valuation } from "./valuation-source";

/** Live accounts in manual order, tombstones excluded. */
export function useAccounts(db: Database): Account[] {
    // SAFETY: drizzle types a select builder per column map; `useLiveQuery`
    // takes the erased one and the table argument pins the row type back.
    return useLiveQuery(accounts, () =>
        db.select().from(accounts).where(isNull(accounts.deletedAt)).orderBy(accounts.sortOrder)
    ) as Account[];
}

/**
 * {@link useAccounts} without people.
 * A reader that only resolves an id keeps `useAccounts`, since an entry or a
 * transfer can point at a person.
 */
export function useBankAccounts(db: Database): Account[] {
    const all = useAccounts(db);
    return useMemo(() => all.filter((account) => !isPerson(account)), [all]);
}

/** Every person on the ledger, in manual order. */
export function usePeople(db: Database): Account[] {
    const all = useAccounts(db);
    return useMemo(() => all.filter(isPerson), [all]);
}

/**
 * Rates for `code` and for every account's own currency: a balance is summed in
 * its account's currency and restated into the display one, so it needs both.
 */
export function useBalanceRates(db: Database, code: string, accountRows: readonly Account[]): RateTable {
    const currencies = useMemo(() => [...new Set(accountRows.map((account) => account.currency))], [accountRows]);
    return useValuationIn(db, code, currencies).rates;
}

export function useSettledAccountCells(db: Database, accountId: string, nowMs: number): PlottedCell[] {
    // Bounded in SQL for the reason `settledAccountsCellQuery` documents: a cell
    // keeps only a day key, so a row dated later today cannot be told from one
    // already made once it is grouped.
    const settledAt = useMemo(() => new Date(nowMs), [nowMs]);
    const rows = useLiveQuery(
        transactions,
        () => settledAccountCellQuery(db, accountId, settledAt),
        [accountId, settledAt],
        nowMs
    );
    const outbound = useLiveQuery(
        transfers,
        () => settledTransferOutboundQuery(db, accountId, settledAt),
        [accountId, settledAt],
        nowMs
    );
    const inbound = useLiveQuery(
        transfers,
        () => settledTransferInboundQuery(db, accountId, settledAt),
        [accountId, settledAt],
        nowMs
    );
    const outside = useLiveQuery(
        outsidePayments,
        () => settledOutsidePaymentQuery(db, accountId, settledAt),
        [accountId, settledAt],
        nowMs
    );
    return useMemo(() => plottedCells(rows, outbound, inbound, outside), [rows, outbound, inbound, outside]);
}

type PlottedRow = Omit<CellRow, "income"> & { plotDay: string };

/** One account's entries, transfer legs and outside payments as cells, each kept on the local day it is drawn on. */
function plottedCells(
    rows: readonly (CellRow & { plotDay: string })[],
    outbound: readonly PlottedRow[],
    inbound: readonly PlottedRow[],
    outside: readonly PlottedRow[]
): PlottedCell[] {
    // `plotDay` says where a row is DRAWN; `dateKey` stays the day it was
    // valued at, which is the date its rate is looked up under.
    return [
        ...rows.map(({ plotDay, ...row }) => ({ ...toCurrencyCell(row), plotDay })),
        ...outbound.map(({ plotDay, ...row }) => ({ ...toTransferCell(row, false), plotDay })),
        ...[...inbound, ...outside].map(({ plotDay, ...row }) => ({ ...toTransferCell(row, true), plotDay })),
    ];
}

/** {@link useSettledAccountCells}, read once at `now`. */
export async function settledCellsAt(db: Database, accountId: string, now: Date): Promise<PlottedCell[]> {
    const [rows, outbound, inbound, outside] = await Promise.all([
        settledAccountCellQuery(db, accountId, now),
        settledTransferOutboundQuery(db, accountId, now),
        settledTransferInboundQuery(db, accountId, now),
        settledOutsidePaymentQuery(db, accountId, now),
    ]);
    return plottedCells(rows, outbound, inbound, outside);
}

/**
 * The account's derived balance, valued into its own currency. Rates are
 * loaded for that currency, so two rows in different currencies each carry
 * their own subscription.
 */
export function useAccountBalanceDetails(
    db: Database,
    account: Pick<Account, "id" | "currency" | "initialBalance">,
    nowMs: number
): { balance: AccountBalance; cells: PlottedCell[]; rates: RateTable } {
    const cells = useSettledAccountCells(db, account.id, nowMs);
    const { rates } = useValuationIn(db, account.currency);
    const balance = useMemo(() => accountBalance(account, cells, rates), [account, cells, rates]);
    return useMemo(() => ({ balance, cells, rates }), [balance, cells, rates]);
}

/** The account's derived balance, valued into its own currency. */
export function useAccountBalance(
    db: Database,
    account: Pick<Account, "id" | "currency" | "initialBalance">,
    nowMs: number
): AccountBalance {
    return useAccountBalanceDetails(db, account, nowMs).balance;
}

/** Every settled entry, transfer leg and outside payment as one list of cells, read once per caller. */
function useSettledCells(db: Database, settledAt: Date): SettledCell[] {
    const clock = settledAt.getTime();
    const cellRows = useLiveQuery(transactions, () => settledAccountsCellQuery(db, settledAt), [settledAt], clock);
    const outbound = useLiveQuery(transfers, () => settledTransfersOutboundQuery(db, settledAt), [settledAt], clock);
    const inbound = useLiveQuery(transfers, () => settledTransfersInboundQuery(db, settledAt), [settledAt], clock);
    const outside = useLiveQuery(outsidePayments, () => settledOutsidePaymentsQuery(db, settledAt), [settledAt], clock);
    return useMemo(
        () => [
            ...cellRows.map(({ accountId, plotDay, ...row }) => ({ ...toCurrencyCell(row), accountId, plotDay })),
            ...outbound.map(({ accountId, plotDay, ...row }) => ({
                ...toTransferCell(row, false),
                accountId,
                plotDay,
            })),
            ...[...inbound, ...outside].map(({ accountId, plotDay, ...row }) => ({
                ...toTransferCell(row, true),
                accountId,
                plotDay,
            })),
        ],
        [cellRows, outbound, inbound, outside]
    );
}

/** A cell of any account, with the local day it is drawn on. */
export type SettledCell = AccountCellRow & PlottedCell;

/**
 * `rows` valued into `displayCurrency`, with the per-account rows.
 * Hands back the rates it valued with, which carry every row's currency, and
 * the cells, so a caller can value more figures on those accounts without
 * reading them again.
 */
export function useOverviewOf(db: Database, rows: readonly Account[], displayCurrency: string, nowMs: number) {
    const settledAt = useMemo(() => new Date(nowMs), [nowMs]);
    const cells = useSettledCells(db, settledAt);
    const rates = useBalanceRates(db, displayCurrency, rows);
    const overview = useMemo(
        () => accountsOverview(rows, cells, displayCurrency, rates, settledAt),
        [rows, cells, displayCurrency, rates, settledAt]
    );
    return { cells, overview, rates };
}

export interface NetWorth {
    /** Every account today, people and liabilities included, for a split such as the debts line. */
    overview: AccountsOverview | null;
    series: NetWorthSeriesPoint[];
}

/**
 * Net worth over the recent window and every account today, valued into
 * `valuation`'s currency from one read of the cells the Log's block reads, so
 * the line's last point and the accounts card agree by construction once the
 * people the card leaves out are added back: net worth counts them by sign.
 */
function useNetWorthIn(db: Database, valuation: Valuation, nowMs: number): NetWorth {
    const rows = useAccounts(db);
    const settledAt = useMemo(() => new Date(nowMs), [nowMs]);
    const cells = useSettledCells(db, settledAt);
    const { displayCurrency } = valuation;
    const rates = useBalanceRates(db, displayCurrency, rows);
    const series = useMemo(() => {
        const byAccount = new Map<string, PlottedCell[]>();
        for (const { accountId, ...cell } of cells) {
            if (accountId == null) {
                continue;
            }
            const bucket = byAccount.get(accountId);
            if (bucket) {
                bucket.push(cell);
            } else {
                byAccount.set(accountId, [cell]);
            }
        }
        return netWorthSeries(rows, byAccount, rates, settledAt, displayCurrency);
    }, [rows, cells, rates, settledAt, displayCurrency]);
    const overview = useMemo(
        () => accountsOverview(rows, cells, displayCurrency, rates, settledAt),
        [rows, cells, displayCurrency, rates, settledAt]
    );
    return useMemo(() => ({ overview, series }), [overview, series]);
}

/** {@link useNetWorthIn} for the ledger's own display currency. */
export function useNetWorth(db: Database, nowMs: number): NetWorth {
    return useNetWorthIn(db, useValuation(db), nowMs);
}

export function useAccountTransactions(db: Database, accountId: string): TransactionWithCategory[] {
    const data = useLiveQuery(transactions, () => accountTransactionsQuery(db, accountId), [accountId]);
    return useDecoratedRows(db, data);
}

/**
 * One account's settled balance read at `now`, straight from the database.
 *
 * The hooks above are bounded by `useNow()`, which ticks at local midnight, on a
 * ledger write and on resume — so a row scheduled for 15:00 today is still
 * excluded at 15:01, because its arrival is not itself a write. That staleness
 * is harmless where a balance is merely displayed: it corrects itself at the
 * next tick, and the goal standing is measured in whole days anyway.
 *
 * It is not harmless where a balance is FROZEN. A goal's start anchor is written
 * once and read forever, so it has to be the balance at the instant it was
 * taken, not at the last time the app happened to look.
 */
export async function settledBalanceAt(
    db: Database,
    account: Account,
    valuation: Valuation,
    now: Date
): Promise<DisplayedBalance> {
    const [cells, { rates }] = await Promise.all([
        settledCellsAt(db, account.id, now),
        loadValuationIn(db, valuation.displayCurrency, [account.currency]),
    ]);
    const { exact, value } = balanceIn(account, cells, valuation.displayCurrency, rates, utcDateString(now.getTime()));
    return { exact, value };
}

export async function openingForBalance(
    db: Database,
    accountId: string,
    balance: number,
    currency: string,
    now: Date
): Promise<number> {
    const [cells, { rates }] = await Promise.all([settledCellsAt(db, accountId, now), loadValuationIn(db, currency)]);
    const flow = accountBalance({ currency, initialBalance: 0 }, cells, rates).total;
    return roundToMinorUnits(balance - flow, currency);
}
