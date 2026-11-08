import { ENTRY_RATE_TYPES } from "@outlayr/money/rates";
import type { EntryRateType } from "@outlayr/money/rates";
import { roundMoney } from "@outlayr/money/round";
import { NO_FEES, savedRate } from "@outlayr/money/transfer-reconcile";
import type { FeeSide, TransferFees } from "@outlayr/money/transfer-reconcile";
import {
    carriedUsd,
    chargedFees,
    feeColumns,
    feeCurrency,
    feeSideOf,
    freezeTransfer,
    keptTransferFees,
    legColumns,
    transferRejection,
} from "@outlayr/money/transfer-row";
import type { TransferFeeInput, TransferInput } from "@outlayr/money/transfer-row";
import { and, count, desc, eq, inArray, isNull, notInArray, or } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { Database } from "@/db/client";
import { transactions, transfers } from "@/db/schema";
import { transaction } from "@/db/transaction";
import { newId } from "@/domain/ids";
import { minorUnitsFor } from "@/domain/money";

import { localRateLookup } from "./rates";

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

const TransfersOperation = Schema.Literals(["count", "create", "get", "list", "delete", "update"]);

const REJECTION_TEXT = {
    "empty-leg": "Both transfer legs must be positive",
    missing: "The transfer no longer exists",
    "same-account": "A transfer cannot leave and arrive at the same account",
} as const;

export class TransfersError extends Schema.TaggedError<TransfersError>()("TransfersError", {
    cause: Schema.optional(Schema.Defect()),
    operation: TransfersOperation,
    reason: Schema.optional(Schema.Literals(["empty-leg", "missing", "same-account"])),
}) {
    override get message(): string {
        return this.reason === undefined ? `Transfer ${this.operation} failed` : REJECTION_TEXT[this.reason];
    }
}

const query = <A>(operation: typeof TransfersOperation.Type, run: () => PromiseLike<A>) =>
    Effect.tryPromise({ catch: (cause) => new TransfersError({ cause, operation }), try: run });

const read = <A>(operation: typeof TransfersOperation.Type, run: () => A) =>
    Effect.try({ catch: (cause) => new TransfersError({ cause, operation }), try: run });

const assertMovable = Effect.fn("Transfers.assertMovable")(function* assertMovable(
    operation: typeof TransfersOperation.Type,
    input: TransferInput
) {
    const reason = transferRejection(input);
    if (reason !== null) {
        return yield* new TransfersError({ operation, reason });
    }
});

function liveTransfer(db: Database, id: string): Transfer | null {
    const [row] = db
        .select()
        .from(transfers)
        .where(and(eq(transfers.id, id), isNull(transfers.deletedAt)))
        .limit(1)
        .all();
    return row ?? null;
}

const insertFee = Effect.fn("Transfers.insertFee")(function* insertFee(
    operation: typeof TransfersOperation.Type,
    db: Database,
    input: TransferInput,
    side: FeeSide,
    fee: TransferFeeInput,
    amountUsd: number | null,
    now: Date,
    transferId: string
) {
    yield* query(operation, () =>
        db.insert(transactions).values({
            ...feeColumns(input, side, fee, amountUsd, now),
            categoryId: null,
            id: newId(),
            income: false,
            transferId,
        })
    );
});

const freezeLegs = (db: Database, operation: typeof TransfersOperation.Type, input: TransferInput) =>
    freezeTransfer(localRateLookup(db), input).pipe(
        Effect.mapError((cause) => new TransfersError({ cause, operation }))
    );

function liveFees(db: Database, transferId: string) {
    return db
        .select()
        .from(transactions)
        .where(and(eq(transactions.transferId, transferId), isNull(transactions.deletedAt)))
        .all();
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

export function touchesAccount(accountId: string) {
    return or(eq(transfers.fromAccountId, accountId), eq(transfers.toAccountId, accountId));
}

/** Statements only: `withTransactionAsync` does not nest, so the account delete supplies the transaction. */
export const tombstoneTransfersTouchingAccount = Effect.fn("Transfers.tombstoneTouchingAccount")(
    function* tombstoneTransfersTouchingAccount(db: Database, accountId: string, now: Date) {
        const doomed = db
            .select({ id: transfers.id })
            .from(transfers)
            .where(and(isNull(transfers.deletedAt), touchesAccount(accountId)));
        yield* query("delete", () =>
            db
                .update(transactions)
                .set({ deletedAt: now, updatedAt: now })
                .where(and(isNull(transactions.deletedAt), inArray(transactions.transferId, doomed)))
        );
        yield* query("delete", () =>
            db
                .update(transfers)
                .set({ deletedAt: now, updatedAt: now })
                .where(and(isNull(transfers.deletedAt), touchesAccount(accountId)))
        );
    }
);

/** Statements only, like {@link tombstoneTransfersTouchingAccount}; run `write` inside the caller's transaction. */
export const stageTransfer = Effect.fn("Transfers.stageTransfer")(function* stageTransfer(
    db: Database,
    input: TransferInput
) {
    yield* assertMovable("create", input);
    const now = new Date();
    const id = newId();
    const { feesUsd, fromAmountUsd, toAmountUsd } = yield* freezeLegs(db, "create", input);
    const write = Effect.gen(function* write() {
        yield* query("create", () =>
            db.insert(transfers).values({
                ...legColumns(input, fromAmountUsd, toAmountUsd, now),
                dateCreated: now,
                deletedAt: null,
                id,
            })
        );
        for (const { fee, side } of chargedFees(input)) {
            yield* insertFee("create", db, input, side, fee, feesUsd.get(side) ?? null, now, id);
        }
    });
    return { id, write };
});

export const transfersRepo = {
    countForAccount: Effect.fn("Transfers.countForAccount")(function* countForAccount(db: Database, accountId: string) {
        const [row] = yield* query("count", () =>
            db
                .select({ total: count() })
                .from(transfers)
                .where(and(isNull(transfers.deletedAt), touchesAccount(accountId)))
        );
        return row?.total ?? 0;
    }),
    create: Effect.fn("Transfers.create")(function* create(db: Database, input: TransferInput) {
        const { id, write } = yield* stageTransfer(db, input);
        yield* transaction(db, write, (cause) => new TransfersError({ cause, operation: "create" }));
        return id;
    }),
    getById: Effect.fn("Transfers.getById")(function* getById(db: Database, id: string) {
        const [row] = yield* query("get", () => db.select().from(transfers).where(eq(transfers.id, id)).limit(1));
        return row ?? null;
    }),
    listActive: Effect.fn("Transfers.listActive")(function* listActive(db: Database) {
        return yield* query("list", () =>
            db.select().from(transfers).where(isNull(transfers.deletedAt)).orderBy(transfers.date)
        );
    }),
    softDelete: Effect.fn("Transfers.softDelete")(function* softDelete(
        db: Database,
        id: string,
        now: Date = new Date()
    ) {
        yield* transaction(
            db,
            Effect.gen(function* write() {
                yield* query("delete", () =>
                    db
                        .update(transfers)
                        .set({ deletedAt: now, updatedAt: now })
                        .where(and(eq(transfers.id, id), isNull(transfers.deletedAt)))
                );
                yield* query("delete", () =>
                    db
                        .update(transactions)
                        .set({ deletedAt: now, updatedAt: now })
                        .where(and(eq(transactions.transferId, id), isNull(transactions.deletedAt)))
                );
            }),
            (cause) => new TransfersError({ cause, operation: "delete" })
        );
    }),
    update: Effect.fn("Transfers.update")(function* update(db: Database, id: string, input: TransferInput) {
        yield* assertMovable("update", input);
        if (!(yield* read("update", () => liveTransfer(db, id)))) {
            return yield* new TransfersError({ operation: "update", reason: "missing" });
        }
        const now = new Date();
        const {
            feesUsd: freshFeesUsd,
            fromAmountUsd: freshFromUsd,
            toAmountUsd: freshToUsd,
        } = yield* freezeLegs(db, "update", input);

        yield* transaction(
            db,
            Effect.gen(function* write() {
                const previous = yield* read("update", () => liveTransfer(db, id));
                if (!previous) {
                    return yield* new TransfersError({ operation: "update", reason: "missing" });
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
                yield* query("update", () =>
                    db
                        .update(transfers)
                        .set(legColumns(input, fromUsd ?? freshFromUsd, toUsd ?? freshToUsd, now))
                        .where(and(eq(transfers.id, id), isNull(transfers.deletedAt)))
                );

                const existing = yield* read("update", () => liveFees(db, id));
                const charged = chargedFees(input);
                const kept = keptTransferFees(previous, existing, charged);
                const keptIds = [...kept.values()].map((row) => row.id);
                yield* query("update", () =>
                    db
                        .update(transactions)
                        .set({ deletedAt: now, updatedAt: now })
                        .where(
                            and(
                                eq(transactions.transferId, id),
                                isNull(transactions.deletedAt),
                                keptIds.length > 0 ? notInArray(transactions.id, keptIds) : undefined
                            )
                        )
                );
                for (const { fee, side } of charged) {
                    const row = kept.get(side) ?? null;
                    const feeUsd =
                        carriedUsd(row, fee.amount, feeCurrency(input, side), input.date) ??
                        freshFeesUsd.get(side) ??
                        null;
                    yield* row
                        ? query("update", () =>
                              db
                                  .update(transactions)
                                  .set(feeColumns(input, side, fee, feeUsd, now))
                                  .where(eq(transactions.id, row.id))
                          )
                        : insertFee("update", db, input, side, fee, feeUsd, now, id);
                }
            }),
            (cause) => new TransfersError({ cause, operation: "update" })
        );
    }),
};
