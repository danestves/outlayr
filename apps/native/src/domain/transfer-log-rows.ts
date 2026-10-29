import { roundMoney } from "@outlayr/money/round";

import type { Account } from "@/data/accounts-core";

import { minorUnitsFor } from "./money";
import { NO_FEES, savedRate, transferGap } from "./transfer-reconcile";

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
    fees: { amount: number; currency: string }[];
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
    unreviewed: false;
}

const UNKNOWN_ACCOUNT = "–";

function transferMove(transfer: TransferLogSource, fees: readonly TransferLogFee[] = []): TransferMove {
    const fromDecimals = minorUnitsFor(transfer.fromCurrency);
    const toDecimals = minorUnitsFor(transfer.toCurrency);
    const charged = { ...NO_FEES };
    const shown = fees.map((fee) => {
        const atDestination = fee.accountId === transfer.toAccountId;
        const side = atDestination ? "destination" : "source";
        charged[side] = roundMoney(charged[side] + fee.amount, atDestination ? toDecimals : fromDecimals);
        return { amount: fee.amount, currency: atDestination ? transfer.toCurrency : transfer.fromCurrency };
    });
    const arrived = roundMoney(transfer.toAmount - charged.destination, toDecimals);
    const sent = roundMoney(transfer.fromAmount + charged.source, fromDecimals);
    const rate =
        transfer.fromCurrency === transfer.toCurrency
            ? null
            : savedRate(transfer.fromAmount, transfer.toAmount, transfer.exchangeRate);
    const gap = rate === null ? 0 : transferGap({ arrived, fees: charged, rate, sent }, fromDecimals, toDecimals);
    return {
        arrived,
        arrivedCurrency: transfer.toCurrency,
        fees: shown,
        outside: gap < 0 ? { amount: -gap, currency: transfer.fromCurrency } : null,
        sent,
    };
}

export function toTransferLogRow(
    transfer: TransferLogSource,
    accounts: ReadonlyMap<string, TransferEnd>,
    fees?: ReadonlyMap<string, readonly TransferLogFee[]>
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
        unreviewed: false,
    };
}

export function toAccountTransferRow(
    transfer: TransferLogSource,
    accountId: string,
    accounts: ReadonlyMap<string, TransferEnd>,
    fees: ReadonlyMap<string, readonly TransferLogFee[]>
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
        moved: { arrived, arrivedCurrency: transfer.toCurrency, fees: [], outside: null, sent: arrived },
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
