import { firstOfMonth, startOfDay } from "@outlayr/money/calendar";
import { ENTRY_RATE_TYPES } from "@outlayr/money/rates";
import type { EntryRateType } from "@outlayr/money/rates";
import { roundMoney } from "@outlayr/money/round";
import { and, count, desc, eq, inArray, isNull, notInArray, or } from "drizzle-orm";

import type { Database } from "@/db/client";
import { transactions, transfers } from "@/db/schema";
import { withTransaction } from "@/db/transaction";
import { newId } from "@/domain/ids";
import { minorUnitsFor } from "@/domain/money";
import { NO_FEES, savedRate } from "@/domain/transfer-reconcile";
import type { FeeSide, TransferFees } from "@/domain/transfer-reconcile";

import { frozenUsdAmount } from "./frozen-usd";

interface TransferFeeInput {
    amount: number;
    note?: string;
}

const FEE_SIDES = ["source", "destination"] as const satisfies readonly FeeSide[];

export interface TransferInput {
    date: Date;
    exchangeRate: number | null;
    exchangeRateType: string | null;
    fees?: Partial<Record<FeeSide, TransferFeeInput>>;
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
    fees: TransferFees;
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

function feeCurrency(input: TransferInput, side: FeeSide): string {
    return side === "destination" ? input.toCurrency : input.fromCurrency;
}

function chargedFees(input: TransferInput) {
    return FEE_SIDES.flatMap((side) => {
        const fee = input.fees?.[side];
        return fee === undefined ? [] : [{ fee, side }];
    });
}

async function frozenFeesUsd(db: Database, input: TransferInput) {
    const frozen = await Promise.all(
        chargedFees(input).map(
            async ({ fee, side }) =>
                [side, await frozenUsdAmount(db, fee.amount, feeCurrency(input, side), input.date)] as const
        )
    );
    return new Map(frozen);
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

function feeColumns(input: TransferInput, side: FeeSide, fee: TransferFeeInput, amountUsd: number | null, now: Date) {
    return {
        accountId: side === "destination" ? input.toAccountId : input.fromAccountId,
        amount: fee.amount,
        amountUsd,
        currency: feeCurrency(input, side),
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
    side: FeeSide,
    fee: TransferFeeInput,
    amountUsd: number | null,
    now: Date,
    transferId: string
): Promise<void> {
    await db.insert(transactions).values({
        ...feeColumns(input, side, fee, amountUsd, now),
        categoryId: null,
        id: newId(),
        income: false,
        transferId,
    });
}

function liveFees(db: Database, transferId: string) {
    return db
        .select()
        .from(transactions)
        .where(and(eq(transactions.transferId, transferId), isNull(transactions.deletedAt)))
        .all();
}

function feeSideOf(transfer: Pick<Transfer, "toAccountId">, fee: { accountId: string | null }): FeeSide {
    return fee.accountId === transfer.toAccountId ? "destination" : "source";
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
    const fromDecimals = minorUnitsFor(transfer.fromCurrency);
    const toDecimals = minorUnitsFor(transfer.toCurrency);
    const fees = { ...NO_FEES };
    for (const fee of liveFees(db, id)) {
        const side = feeSideOf(transfer, fee);
        fees[side] = roundMoney(fees[side] + fee.amount, side === "source" ? fromDecimals : toDecimals);
    }
    return {
        arrived: roundMoney(transfer.toAmount - fees.destination, toDecimals),
        date: transfer.date,
        fees,
        fromAccountId: transfer.fromAccountId,
        fromCurrency: transfer.fromCurrency,
        id,
        note: transfer.note,
        rate: savedRate(transfer.fromAmount, transfer.toAmount, transfer.exchangeRate),
        rateType: ENTRY_RATE_TYPES.find((type) => type === transfer.exchangeRateType) ?? null,
        sent: roundMoney(transfer.fromAmount + fees.source, fromDecimals),
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
        a.fees.source === b.fees.source &&
        a.fees.destination === b.fees.destination &&
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
    const [fromAmountUsd, toAmountUsd, feesUsd] = await Promise.all([
        frozenUsdAmount(db, input.fromAmount, input.fromCurrency, input.date),
        frozenUsdAmount(db, input.toAmount, input.toCurrency, input.date),
        frozenFeesUsd(db, input),
    ]);
    const write = async () => {
        await db.insert(transfers).values({
            ...legColumns(input, fromAmountUsd, toAmountUsd, now),
            dateCreated: now,
            deletedAt: null,
            id,
        });
        await Promise.all(
            chargedFees(input).map(({ fee, side }) =>
                insertFee(db, input, side, fee, feesUsd.get(side) ?? null, now, id)
            )
        );
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
        const [freshFromUsd, freshToUsd, freshFeesUsd] = await Promise.all([
            frozenUsdAmount(db, input.fromAmount, input.fromCurrency, input.date),
            frozenUsdAmount(db, input.toAmount, input.toCurrency, input.date),
            frozenFeesUsd(db, input),
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

            // One live fee per side survives, rewritten in place: a side's own row first, else a row whose side
            // stopped charging, so a fee moved across keeps its id and the frozen USD that comes with it.
            const existing = liveFees(db, id);
            const charged = chargedFees(input);
            const kept = new Map<FeeSide, (typeof existing)[number]>();
            for (const { side } of charged) {
                const own = existing.find((fee) => feeSideOf(previous, fee) === side);
                if (own) {
                    kept.set(side, own);
                }
            }
            for (const { side } of charged) {
                const spare = existing.find((fee) => ![...kept.values()].includes(fee));
                if (!kept.has(side) && spare) {
                    kept.set(side, spare);
                }
            }
            const keptIds = [...kept.values()].map((row) => row.id);
            await db
                .update(transactions)
                .set({ deletedAt: now, updatedAt: now })
                .where(
                    and(
                        eq(transactions.transferId, id),
                        isNull(transactions.deletedAt),
                        keptIds.length > 0 ? notInArray(transactions.id, keptIds) : undefined
                    )
                );
            await Promise.all(
                charged.map(async ({ fee, side }) => {
                    const row = kept.get(side) ?? null;
                    const feeUsd =
                        carriedUsd(row, fee.amount, feeCurrency(input, side), input.date) ??
                        freshFeesUsd.get(side) ??
                        null;
                    await (row
                        ? db
                              .update(transactions)
                              .set(feeColumns(input, side, fee, feeUsd, now))
                              .where(eq(transactions.id, row.id))
                        : insertFee(db, input, side, fee, feeUsd, now, id));
                })
            );
        });
    },
};
