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
import { accounts, outsideMoves, outsidePayments, transactions, transfers } from "@/db/schema";
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
    settledOutsideMoveQuery,
    settledOutsideMovesQuery,
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

export function useAccounts(db: Database): Account[] {
    // SAFETY: `useLiveQuery` takes the erased select builder; the table argument pins the row type back.
    return useLiveQuery(accounts, () =>
        db.select().from(accounts).where(isNull(accounts.deletedAt)).orderBy(accounts.sortOrder)
    ) as Account[];
}

// Readers that only resolve an id keep `useAccounts`: an entry or a transfer can point at a person.
export function useBankAccounts(db: Database): Account[] {
    const all = useAccounts(db);
    return useMemo(() => all.filter((account) => !isPerson(account)), [all]);
}

export function usePeople(db: Database): Account[] {
    const all = useAccounts(db);
    return useMemo(() => all.filter(isPerson), [all]);
}

export function useBalanceRates(db: Database, code: string, accountRows: readonly Account[]): RateTable {
    const currencies = useMemo(() => [...new Set(accountRows.map((account) => account.currency))], [accountRows]);
    return useValuationIn(db, code, currencies).rates;
}

export function useSettledAccountCells(db: Database, accountId: string, nowMs: number): PlottedCell[] {
    // Bounded in SQL (see `settledAccountsCellQuery`): a grouped cell keeps only its day key.
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
    const moves = useLiveQuery(
        outsideMoves,
        () => settledOutsideMoveQuery(db, accountId, settledAt),
        [accountId, settledAt],
        nowMs
    );
    return useMemo(
        () => plottedCells(rows, outbound, inbound, [...outside, ...moves]),
        [rows, outbound, inbound, outside, moves]
    );
}

type PlottedRow = Omit<CellRow, "income"> & { plotDay: string };

function plottedCells(
    rows: readonly (CellRow & { plotDay: string })[],
    outbound: readonly PlottedRow[],
    inbound: readonly PlottedRow[],
    outside: readonly PlottedRow[]
): PlottedCell[] {
    // `plotDay` is where a row is drawn; `dateKey` stays the day its rate is looked up under.
    return [
        ...rows.map(({ plotDay, ...row }) => ({ ...toCurrencyCell(row), plotDay })),
        ...outbound.map(({ plotDay, ...row }) => ({ ...toTransferCell(row, false), plotDay })),
        ...[...inbound, ...outside].map(({ plotDay, ...row }) => ({ ...toTransferCell(row, true), plotDay })),
    ];
}

export async function settledCellsAt(db: Database, accountId: string, now: Date): Promise<PlottedCell[]> {
    const [rows, outbound, inbound, outside, moves] = await Promise.all([
        settledAccountCellQuery(db, accountId, now),
        settledTransferOutboundQuery(db, accountId, now),
        settledTransferInboundQuery(db, accountId, now),
        settledOutsidePaymentQuery(db, accountId, now),
        settledOutsideMoveQuery(db, accountId, now),
    ]);
    return plottedCells(rows, outbound, inbound, [...outside, ...moves]);
}

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

export function useAccountBalance(
    db: Database,
    account: Pick<Account, "id" | "currency" | "initialBalance">,
    nowMs: number
): AccountBalance {
    return useAccountBalanceDetails(db, account, nowMs).balance;
}

function useSettledCells(db: Database, settledAt: Date): SettledCell[] {
    const clock = settledAt.getTime();
    const cellRows = useLiveQuery(transactions, () => settledAccountsCellQuery(db, settledAt), [settledAt], clock);
    const outbound = useLiveQuery(transfers, () => settledTransfersOutboundQuery(db, settledAt), [settledAt], clock);
    const inbound = useLiveQuery(transfers, () => settledTransfersInboundQuery(db, settledAt), [settledAt], clock);
    const outside = useLiveQuery(outsidePayments, () => settledOutsidePaymentsQuery(db, settledAt), [settledAt], clock);
    const moves = useLiveQuery(outsideMoves, () => settledOutsideMovesQuery(db, settledAt), [settledAt], clock);
    return useMemo(
        () => [
            ...cellRows.map(({ accountId, plotDay, ...row }) => ({ ...toCurrencyCell(row), accountId, plotDay })),
            ...outbound.map(({ accountId, plotDay, ...row }) => ({
                ...toTransferCell(row, false),
                accountId,
                plotDay,
            })),
            ...[...inbound, ...outside, ...moves].map(({ accountId, plotDay, ...row }) => ({
                ...toTransferCell(row, true),
                accountId,
                plotDay,
            })),
        ],
        [cellRows, outbound, inbound, outside, moves]
    );
}

export type SettledCell = AccountCellRow & PlottedCell;

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
    overview: AccountsOverview | null;
    series: NetWorthSeriesPoint[];
}

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

export function useNetWorth(db: Database, nowMs: number): NetWorth {
    return useNetWorthIn(db, useValuation(db), nowMs);
}

export function useAccountTransactions(db: Database, accountId: string): TransactionWithCategory[] {
    const data = useLiveQuery(transactions, () => accountTransactionsQuery(db, accountId), [accountId]);
    return useDecoratedRows(db, data);
}

// Not the `useNow()`-bounded hooks: those miss a row scheduled earlier today until the next tick, and a goal's
// start anchor is frozen once written, so it needs the balance at this instant.
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
