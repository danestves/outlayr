import { firstOfMonth, startOfDay } from "@outlayr/money/calendar";
import { ENTRY_RATE_TYPES } from "@outlayr/money/rates";
import type { EntryRateType } from "@outlayr/money/rates";
import { roundMoney } from "@outlayr/money/round";
import { and, count, desc, eq, inArray, isNull, ne, or } from "drizzle-orm";

import type { Database } from "@/db/client";
import { transactions, transfers } from "@/db/schema";
import { withTransaction } from "@/db/transaction";
import { newId } from "@/domain/ids";
import { minorUnitsFor } from "@/domain/money";
import { savedRate } from "@/domain/transfer-reconcile";
import type { FeeSide } from "@/domain/transfer-reconcile";

import { frozenUsdAmount } from "./frozen-usd";

interface TransferFeeInput {
    amount: number;
    note?: string;
    side: FeeSide;
}

export interface TransferInput {
    date: Date;
    exchangeRate: number | null;
    exchangeRateType: string | null;
    fee?: TransferFeeInput;
    fromAccountId: string;
    fromAmount: number;
    fromCurrency: string;
    /** Absent leaves an edited transfer's link alone, so an editor that never shows it cannot unlink it. */
    installmentPlanId?: string | null;
    note?: string;
    toAccountId: string;
    toAmount: number;
    toCurrency: string;
}

export type Transfer = typeof transfers.$inferSelect;

export interface SavedTransfer {
    arrived: number;
    date: Date;
    fee: number;
    feeSide: FeeSide;
    fromAccountId: string;
    fromCurrency: string;
    id: string;
    note: string;
    rate: number | null;
    rateType: EntryRateType | null;
    sent: number;
    toAccountId: string;
    toCurrency: string;
}

function assertMovable(input: TransferInput): void {
    if (input.fromAccountId === input.toAccountId) {
        throw new Error("A transfer cannot leave and arrive at the same account");
    }
    if (!(input.fromAmount > 0 && input.toAmount > 0)) {
        throw new Error("Both transfer legs must be positive");
    }
}

function feeCurrency(input: TransferInput): string {
    return input.fee?.side === "destination" ? input.toCurrency : input.fromCurrency;
}

function legColumns(input: TransferInput, fromAmountUsd: number | null, toAmountUsd: number | null, now: Date) {
    return {
        date: input.date,
        day: startOfDay(input.date),
        exchangeRate: input.exchangeRate,
        exchangeRateType: input.exchangeRateType,
        fromAccountId: input.fromAccountId,
        fromAmount: input.fromAmount,
        fromAmountUsd,
        fromCurrency: input.fromCurrency,
        month: firstOfMonth(input.date),
        note: input.note ?? "",
        toAccountId: input.toAccountId,
        toAmount: input.toAmount,
        toAmountUsd,
        toCurrency: input.toCurrency,
        updatedAt: now,
        ...(input.installmentPlanId !== undefined && { installmentPlanId: input.installmentPlanId }),
    };
}

function feeColumns(input: TransferInput, fee: TransferFeeInput, amountUsd: number | null, now: Date) {
    return {
        accountId: fee.side === "destination" ? input.toAccountId : input.fromAccountId,
        amount: fee.amount,
        amountUsd,
        currency: feeCurrency(input),
        date: input.date,
        day: startOfDay(input.date),
        month: firstOfMonth(input.date),
        note: fee.note ?? "",
        updatedAt: now,
    };
}

function liveTransfer(db: Database, id: string): Transfer | null {
    const [row] = db
        .select()
        .from(transfers)
        .where(and(eq(transfers.id, id), isNull(transfers.deletedAt)))
        .limit(1)
        .all();
    return row ?? null;
}

async function insertFee(
    db: Database,
    input: TransferInput,
    fee: TransferFeeInput,
    amountUsd: number | null,
    now: Date,
    transferId: string
): Promise<void> {
    await db.insert(transactions).values({
        ...feeColumns(input, fee, amountUsd, now),
        categoryId: null,
        id: newId(),
        income: false,
        transferId,
    });
}

function liveFee(db: Database, transferId: string) {
    const [row] = db
        .select()
        .from(transactions)
        .where(and(eq(transactions.transferId, transferId), isNull(transactions.deletedAt)))
        .limit(1)
        .all();
    return row ?? null;
}

const USD_DECIMALS = 6;

function carriedUsd(
    previous: { amount: number; amountUsd: number | null; currency: string | null; date: Date } | null,
    amount: number,
    currency: string,
    date: Date
): number | undefined {
    if (
        previous === null ||
        previous.amountUsd === null ||
        !(previous.amount > 0) ||
        previous.currency !== currency ||
        previous.date.getTime() !== date.getTime()
    ) {
        return undefined;
    }
    return previous.amount === amount
        ? previous.amountUsd
        : roundMoney((previous.amountUsd * amount) / previous.amount, USD_DECIMALS);
}

export function savedTransfer(db: Database, id: string): SavedTransfer | null {
    const transfer = liveTransfer(db, id);
    if (!transfer) {
        return null;
    }
    const fee = liveFee(db, id);
    const feeSide: FeeSide = fee?.accountId === transfer.toAccountId ? "destination" : "source";
    const feeAmount = fee?.amount ?? 0;
    return {
        arrived:
            feeSide === "destination"
                ? roundMoney(transfer.toAmount - feeAmount, minorUnitsFor(transfer.toCurrency))
                : transfer.toAmount,
        date: transfer.date,
        fee: feeAmount,
        feeSide,
        fromAccountId: transfer.fromAccountId,
        fromCurrency: transfer.fromCurrency,
        id,
        note: transfer.note,
        rate: savedRate(transfer.fromAmount, transfer.toAmount, transfer.exchangeRate),
        rateType: ENTRY_RATE_TYPES.find((type) => type === transfer.exchangeRateType) ?? null,
        sent:
            feeSide === "source"
                ? roundMoney(transfer.fromAmount + feeAmount, minorUnitsFor(transfer.fromCurrency))
                : transfer.fromAmount,
        toAccountId: transfer.toAccountId,
        toCurrency: transfer.toCurrency,
    };
}

export function sameSavedTransfer(a: SavedTransfer, b: SavedTransfer): boolean {
    return (
        a.id === b.id &&
        a.date.getTime() === b.date.getTime() &&
        a.sent === b.sent &&
        a.arrived === b.arrived &&
        a.fee === b.fee &&
        a.feeSide === b.feeSide &&
        a.fromAccountId === b.fromAccountId &&
        a.fromCurrency === b.fromCurrency &&
        a.toAccountId === b.toAccountId &&
        a.toCurrency === b.toCurrency &&
        a.rate === b.rate &&
        a.rateType === b.rateType &&
        a.note === b.note
    );
}

export function lastTransfer(db: Database): SavedTransfer | null {
    const [row] = db
        .select({ id: transfers.id })
        .from(transfers)
        .where(isNull(transfers.deletedAt))
        .orderBy(desc(transfers.dateCreated))
        .limit(1)
        .all();
    return row === undefined ? null : savedTransfer(db, row.id);
}

function touchesAccount(accountId: string) {
    return or(eq(transfers.fromAccountId, accountId), eq(transfers.toAccountId, accountId));
}

/** Statements only: `withTransactionAsync` does not nest, so the account delete supplies the transaction. */
export async function tombstoneTransfersTouchingAccount(db: Database, accountId: string, now: Date): Promise<void> {
    const doomed = db
        .select({ id: transfers.id })
        .from(transfers)
        .where(and(isNull(transfers.deletedAt), touchesAccount(accountId)));
    await db
        .update(transactions)
        .set({ deletedAt: now, updatedAt: now })
        .where(and(isNull(transactions.deletedAt), inArray(transactions.transferId, doomed)));
    await db
        .update(transfers)
        .set({ deletedAt: now, updatedAt: now })
        .where(and(isNull(transfers.deletedAt), touchesAccount(accountId)));
}

/** Statements only, like {@link tombstoneTransfersTouchingAccount}; run `write` inside the caller's transaction. */
export async function stageTransfer(
    db: Database,
    input: TransferInput
): Promise<{ id: string; write: () => Promise<void> }> {
    assertMovable(input);
    const now = new Date();
    const id = newId();
    const [fromAmountUsd, toAmountUsd, feeUsd] = await Promise.all([
        frozenUsdAmount(db, input.fromAmount, input.fromCurrency, input.date),
        frozenUsdAmount(db, input.toAmount, input.toCurrency, input.date),
        input.fee ? frozenUsdAmount(db, input.fee.amount, feeCurrency(input), input.date) : Promise.resolve(null),
    ]);
    const write = async () => {
        await db.insert(transfers).values({
            ...legColumns(input, fromAmountUsd, toAmountUsd, now),
            dateCreated: now,
            deletedAt: null,
            id,
        });
        if (input.fee) {
            await insertFee(db, input, input.fee, feeUsd, now, id);
        }
    };
    return { id, write };
}

export const transfersRepo = {
    async countForAccount(db: Database, accountId: string): Promise<number> {
        const [row] = await db
            .select({ total: count() })
            .from(transfers)
            .where(and(isNull(transfers.deletedAt), touchesAccount(accountId)));
        return row?.total ?? 0;
    },
    /**
     * Each leg freezes at its own market rate, so an off-market transfer moves net worth by the spread: receiving
     * 6000 Bs for $100 when the market pays 5550 is $8.11 earned.
     */
    async create(db: Database, input: TransferInput): Promise<string> {
        const { id, write } = await stageTransfer(db, input);
        await withTransaction(db, write);
        return id;
    },
    async getById(db: Database, id: string): Promise<Transfer | null> {
        const [row] = await db.select().from(transfers).where(eq(transfers.id, id)).limit(1);
        return row ?? null;
    },
    async listActive(db: Database): Promise<Transfer[]> {
        return await db.select().from(transfers).where(isNull(transfers.deletedAt)).orderBy(transfers.date);
    },
    async softDelete(db: Database, id: string, now: Date = new Date()): Promise<void> {
        await withTransaction(db, async () => {
            await db
                .update(transfers)
                .set({ deletedAt: now, updatedAt: now })
                .where(and(eq(transfers.id, id), isNull(transfers.deletedAt)));
            await db
                .update(transactions)
                .set({ deletedAt: now, updatedAt: now })
                .where(and(eq(transactions.transferId, id), isNull(transactions.deletedAt)));
        });
    },
    async update(db: Database, id: string, input: TransferInput): Promise<void> {
        assertMovable(input);
        if (!liveTransfer(db, id)) {
            throw new Error("The transfer no longer exists");
        }
        const now = new Date();
        const [freshFromUsd, freshToUsd, freshFeeUsd] = await Promise.all([
            frozenUsdAmount(db, input.fromAmount, input.fromCurrency, input.date),
            frozenUsdAmount(db, input.toAmount, input.toCurrency, input.date),
            input.fee ? frozenUsdAmount(db, input.fee.amount, feeCurrency(input), input.date) : Promise.resolve(null),
        ]);

        await withTransaction(db, async () => {
            const previous = liveTransfer(db, id);
            if (!previous) {
                throw new Error("The transfer no longer exists");
            }
            const fromUsd = carriedUsd(
                {
                    amount: previous.fromAmount,
                    amountUsd: previous.fromAmountUsd,
                    currency: previous.fromCurrency,
                    date: previous.date,
                },
                input.fromAmount,
                input.fromCurrency,
                input.date
            );
            const toUsd = carriedUsd(
                {
                    amount: previous.toAmount,
                    amountUsd: previous.toAmountUsd,
                    currency: previous.toCurrency,
                    date: previous.date,
                },
                input.toAmount,
                input.toCurrency,
                input.date
            );
            await db
                .update(transfers)
                .set(legColumns(input, fromUsd ?? freshFromUsd, toUsd ?? freshToUsd, now))
                .where(and(eq(transfers.id, id), isNull(transfers.deletedAt)));

            const kept = input.fee ? liveFee(db, id) : null;
            await db
                .update(transactions)
                .set({ deletedAt: now, updatedAt: now })
                .where(
                    and(
                        eq(transactions.transferId, id),
                        isNull(transactions.deletedAt),
                        kept ? ne(transactions.id, kept.id) : undefined
                    )
                );
            if (!input.fee) {
                return;
            }
            const feeUsd = carriedUsd(kept, input.fee.amount, feeCurrency(input), input.date) ?? freshFeeUsd;
            await (kept
                ? db
                      .update(transactions)
                      .set(feeColumns(input, input.fee, feeUsd, now))
                      .where(eq(transactions.id, kept.id))
                : insertFee(db, input, input.fee, feeUsd, now, id));
        });
    },
};
