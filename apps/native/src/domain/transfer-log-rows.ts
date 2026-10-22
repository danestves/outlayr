import { roundMoney } from "@outlayr/money/round";

import type { Account } from "@/data/accounts-core";

import { minorUnitsFor } from "./money";
import { savedRate, transferGap } from "./transfer-reconcile";

export interface TransferLogSource {
    date: Date;
    day: Date;
    exchangeRate: number | null;
    fromAccountId: string;
    fromAmount: number;
    fromAmountUsd: number | null;
    fromCurrency: string;
    id: string;
    note: string;
    toAccountId: string;
    toAmount: number;
    toAmountUsd: number | null;
    toCurrency: string;
}

export interface TransferLogFee {
    accountId: string | null;
    amount: number;
}

export type TransferEnd = Pick<Account, "customColor" | "emoji" | "icon" | "imageColor" | "imageUri" | "kind" | "name">;

export interface TransferMove {
    arrived: number;
    arrivedCurrency: string;
    fee: { amount: number; currency: string } | null;
    outside: { amount: number; currency: string } | null;
    sent: number;
}

export interface TransferLogRow {
    amount: number;
    amountUsd: number | null;
    categoryColor: null;
    categoryEmoji: null;
    categoryIcon: null;
    categoryId: null;
    categoryName: null;
    currency: string;
    customColor: null;
    date: Date;
    day: Date;
    emoji: null;
    ends: { from: TransferEnd; to: TransferEnd } | null;
    exchangeRate: null;
    exchangeRateType: null;
    excludedFromTotals: boolean;
    feeForId: null;
    icon: null;
    id: string;
    imageColor: null;
    imageUri: null;
    income: boolean;
    installmentId: null;
    moved?: TransferMove;
    note: string;
    recurringAnchorDay: number | null;
    recurringCoefficient: number;
    recurringEndDate: null;
    recurringType: number;
    sign?: "+" | "-";
    transferId: string;
}

const UNKNOWN_ACCOUNT = "—";

function transferMove(transfer: TransferLogSource, fee: TransferLogFee | undefined): TransferMove {
    const atDestination = fee !== undefined && fee.accountId === transfer.toAccountId;
    const currency = atDestination ? transfer.toCurrency : transfer.fromCurrency;
    const decimals = minorUnitsFor(currency);
    const charged = fee?.amount ?? 0;
    const arrived = atDestination ? roundMoney(transfer.toAmount - charged, decimals) : transfer.toAmount;
    const sent = atDestination ? transfer.fromAmount : roundMoney(transfer.fromAmount + charged, decimals);
    const rate =
        transfer.fromCurrency === transfer.toCurrency
            ? null
            : savedRate(transfer.fromAmount, transfer.toAmount, transfer.exchangeRate);
    const gap =
        rate === null
            ? 0
            : transferGap(
                  { arrived, fee: charged, feeSide: atDestination ? "destination" : "source", rate, sent },
                  decimals,
                  minorUnitsFor(transfer.toCurrency)
              );
    return {
        arrived,
        arrivedCurrency: transfer.toCurrency,
        fee: fee === undefined ? null : { amount: fee.amount, currency },
        outside: gap < 0 ? { amount: -gap, currency } : null,
        sent,
    };
}

export function toTransferLogRow(
    transfer: TransferLogSource,
    accounts: ReadonlyMap<string, TransferEnd>,
    fees?: ReadonlyMap<string, TransferLogFee>
): TransferLogRow {
    const from = accounts.get(transfer.fromAccountId);
    const to = accounts.get(transfer.toAccountId);
    return {
        amount: transfer.fromAmount,
        amountUsd: transfer.fromAmountUsd,
        categoryColor: null,
        categoryEmoji: null,
        categoryIcon: null,
        categoryId: null,
        categoryName: null,
        currency: transfer.fromCurrency,
        customColor: null,
        date: transfer.date,
        day: transfer.day,
        emoji: null,
        ends: from && to ? { from, to } : null,
        exchangeRate: null,
        exchangeRateType: null,
        excludedFromTotals: true,
        feeForId: null,
        icon: null,
        id: transfer.id,
        imageColor: null,
        imageUri: null,
        income: false,
        installmentId: null,
        moved: fees === undefined ? undefined : transferMove(transfer, fees.get(transfer.id)),
        note:
            transfer.note === "" ? `${from?.name ?? UNKNOWN_ACCOUNT} → ${to?.name ?? UNKNOWN_ACCOUNT}` : transfer.note,
        recurringAnchorDay: null,
        recurringCoefficient: 1,
        recurringEndDate: null,
        recurringType: 0,
        transferId: transfer.id,
    };
}

export function toAccountTransferRow(
    transfer: TransferLogSource,
    accountId: string,
    accounts: ReadonlyMap<string, TransferEnd>,
    fees: ReadonlyMap<string, TransferLogFee>
): TransferLogRow {
    const row = { ...toTransferLogRow(transfer, accounts, fees), excludedFromTotals: false };
    if (transfer.toAccountId !== accountId) {
        return { ...row, sign: "-" };
    }
    const { arrived } = transferMove(transfer, fees.get(transfer.id));
    return {
        ...row,
        amount: transfer.toAmount,
        amountUsd: transfer.toAmountUsd,
        currency: transfer.toCurrency,
        income: true,
        moved: { arrived, arrivedCurrency: transfer.toCurrency, fee: null, outside: null, sent: arrived },
        sign: "+",
    };
}

interface Recent {
    date: Date;
    day: Date;
}

/**
 * Both inputs are already newest-first, so this merges rather than re-sorts: re-sorting
 * the whole list would cost the windowing that produced it.
 */
export function mergeByRecency<T extends Recent>(left: readonly T[], right: readonly T[]): T[] {
    const merged: T[] = [];
    let l = 0;
    let r = 0;
    while (l < left.length && r < right.length) {
        const a = left[l];
        const b = right[r];
        const byDay = b.day.getTime() - a.day.getTime();
        const takeLeft = byDay === 0 ? a.date.getTime() >= b.date.getTime() : byDay < 0;
        if (takeLeft) {
            merged.push(a);
            l += 1;
        } else {
            merged.push(b);
            r += 1;
        }
    }
    return [...merged, ...left.slice(l), ...right.slice(r)];
}
