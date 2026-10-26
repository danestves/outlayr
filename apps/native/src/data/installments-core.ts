import { toAccountKind } from "@outlayr/money/account-kind";
import { firstOfMonth, startOfDay } from "@outlayr/money/calendar";
import { canonicalUsd } from "@outlayr/money/canonical-usd";
import { and, asc, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { Database } from "@/db/client";
import { accounts, installmentPlans, installments, outsidePayments, transactions, transfers } from "@/db/schema";
import { transaction } from "@/db/transaction";
import { newId } from "@/domain/ids";
import { orderName, planStanding } from "@/domain/installments";
import type { InstallmentStanding, PlanStanding, ScheduledInstallment } from "@/domain/installments";
import { roundToMinorUnits } from "@/domain/money";
import { translateNow } from "@/i18n/runtime";

import { getAccountById } from "./accounts-core";
import { feeCategoryFor } from "./card-fees-core";
import { frozenUsdAmount } from "./frozen-usd";
import { tombstonePlans } from "./installment-cascade";
import { localRateLookup } from "./rates";
import { transactionsRepo } from "./transactions-core";
import type { TransactionInput } from "./transactions-core";
import { stageTransfer } from "./transfers-core";

export type InstallmentPlan = typeof installmentPlans.$inferSelect;
export type Installment = typeof installments.$inferSelect;

// `amount` is what ARRIVES on the liability, in its currency; `fromAmount` is what left the source, in its own.
export interface PaymentSource {
    exchangeRate: number | null;
    exchangeRateType: string | null;
    fromAccountId: string;
    fromAmount: number;
    fromCurrency: string;
    note?: string;
}

export interface InstallmentOrderInput<E = never> {
    inSameTransaction?: (transactionId: string) => Effect.Effect<void, E>;
    /** Installments 1..k paid before the order was recorded, each on its due date (today at the latest). */
    installmentsPaidOutside?: number;
    purchase: TransactionInput & { accountId: string };
    schedule: readonly ScheduledInstallment[];
    /** Required with an upfront row (sequence 0): its source account, or null when paid outside Outlayr. */
    upfront?: PaymentSource | null;
}

export interface InstallmentFeeInput {
    amount: number;
    date?: Date;
    installmentId: string;
}

export interface InstallmentPaymentInput {
    /** In the plan's currency. */
    amount: number;
    date: Date;
    planId: string;
    /** `null` records it as paid outside Outlayr: nothing leaves an account. */
    source: PaymentSource | null;
}

const InstallmentsOperation = Schema.Literals([
    "add-fee",
    "create-order",
    "delete-installment",
    "delete-outside-payment",
    "delete-plan",
    "remove-fee",
    "record-payment",
    "update-installment",
]);

const InstallmentRejection = Schema.Literals([
    "bad-paid-outside",
    "empty-schedule",
    "fee-not-positive",
    "installment-missing",
    "installment-not-positive",
    "missing-upfront-source",
    "no-outside-row",
    "not-expense",
    "not-liability",
    "payment-not-positive",
    "plan-missing",
]);

const REJECTION_TEXT: Record<typeof InstallmentRejection.Type, string> = {
    "bad-paid-outside": "Installments paid outside must be a whole number within the schedule",
    "empty-schedule": "An installment order needs positive installments",
    "fee-not-positive": "A late fee must be positive",
    "installment-missing": "The installment no longer exists",
    "installment-not-positive": "An installment must be positive",
    "missing-upfront-source": "An upfront payment needs the account it was paid from, or null when paid outside",
    "no-outside-row": "No outside payment to record",
    "not-expense": "An installment purchase is an expense",
    "not-liability": "Installments are only allowed on liability accounts",
    "payment-not-positive": "A payment must be positive",
    "plan-missing": "The installment order no longer exists",
};

export class InstallmentsError extends Schema.TaggedError<InstallmentsError>()("InstallmentsError", {
    cause: Schema.optional(Schema.Defect()),
    operation: InstallmentsOperation,
    reason: Schema.optional(InstallmentRejection),
}) {
    override get message(): string {
        return this.reason === undefined ? `Installments ${this.operation} failed` : REJECTION_TEXT[this.reason];
    }
}

const query = <A>(operation: typeof InstallmentsOperation.Type, run: () => PromiseLike<A>) =>
    Effect.tryPromise({ catch: (cause) => new InstallmentsError({ cause, operation }), try: run });

const read = <A>(operation: typeof InstallmentsOperation.Type, run: () => A) =>
    Effect.try({ catch: (cause) => new InstallmentsError({ cause, operation }), try: run });

const liabilityAccount = Effect.fn("Installments.liabilityAccount")(function* liabilityAccount(
    operation: typeof InstallmentsOperation.Type,
    db: Database,
    accountId: string
) {
    const account = yield* read(operation, () => getAccountById(db, accountId));
    if (!account || toAccountKind(account.kind) !== "liability") {
        return yield* new InstallmentsError({ operation, reason: "not-liability" });
    }
    return account;
});

const livePlan = Effect.fn("Installments.livePlan")(function* livePlan(
    operation: typeof InstallmentsOperation.Type,
    db: Database,
    planId: string
) {
    const [plan] = yield* read(operation, () =>
        db
            .select()
            .from(installmentPlans)
            .where(and(eq(installmentPlans.id, planId), isNull(installmentPlans.deletedAt)))
            .limit(1)
            .all()
    );
    if (!plan) {
        return yield* new InstallmentsError({ operation, reason: "plan-missing" });
    }
    return plan;
});

const liveInstallment = Effect.fn("Installments.liveInstallment")(function* liveInstallment(
    operation: typeof InstallmentsOperation.Type,
    db: Database,
    installmentId: string
) {
    const [found] = yield* read(operation, () =>
        db
            .select({ plan: installmentPlans })
            .from(installments)
            .innerJoin(installmentPlans, eq(installmentPlans.id, installments.planId))
            .where(
                and(
                    eq(installments.id, installmentId),
                    isNull(installments.deletedAt),
                    isNull(installmentPlans.deletedAt)
                )
            )
            .limit(1)
            .all()
    );
    if (!found) {
        return yield* new InstallmentsError({ operation, reason: "installment-missing" });
    }
    return found.plan;
});

function liveFees(db: Database, installmentId: string) {
    return db
        .select({ date: transactions.date, id: transactions.id })
        .from(transactions)
        .where(and(eq(transactions.installmentId, installmentId), isNull(transactions.deletedAt)))
        .orderBy(desc(transactions.date))
        .all();
}

const tombstoneFees = Effect.fn("Installments.tombstoneFees")(function* tombstoneFees(
    operation: typeof InstallmentsOperation.Type,
    db: Database,
    ids: readonly string[],
    now: Date
) {
    if (ids.length > 0) {
        yield* query(operation, () =>
            db
                .update(transactions)
                .set({ deletedAt: now, updatedAt: now })
                .where(and(inArray(transactions.id, [...ids]), isNull(transactions.deletedAt)))
        );
    }
});

function paymentTransfer(
    planId: string,
    accountId: string,
    currency: string,
    payment: {
        amount: number;
        date: Date;
        source: PaymentSource;
    }
) {
    return {
        date: payment.date,
        exchangeRate: payment.source.exchangeRate,
        exchangeRateType: payment.source.exchangeRateType,
        fromAccountId: payment.source.fromAccountId,
        fromAmount: payment.source.fromAmount,
        fromCurrency: payment.source.fromCurrency,
        installmentPlanId: planId,
        note: payment.source.note,
        toAccountId: accountId,
        toAmount: payment.amount,
        toCurrency: currency,
    };
}

// Valued before any transaction opens, as `stageTransfer` does.
const outsideRows = (
    db: Database,
    planId: string,
    currency: string,
    payments: readonly { amount: number; date: Date }[],
    now: Date
) =>
    Effect.all(
        payments.map(({ amount, date }) =>
            frozenUsdAmount(db, amount, currency, date).pipe(
                Effect.map((amountUsd) => ({
                    amount,
                    amountUsd,
                    date,
                    id: newId(),
                    planId,
                    updatedAt: now,
                }))
            )
        ),
        { concurrency: "unbounded" }
    );

const deleteInstallment = Effect.fn("Installments.deleteInstallment")(function* deleteInstallment(
    db: Database,
    id: string,
    now: Date = new Date()
) {
    yield* query("delete-installment", () =>
        db
            .update(installments)
            .set({ deletedAt: now, updatedAt: now })
            .where(and(eq(installments.id, id), isNull(installments.deletedAt)))
    );
});

const updateInstallment = Effect.fn("Installments.updateInstallment")(function* updateInstallment(
    db: Database,
    id: string,
    patch: { amount?: number; dueDate?: Date },
    now: Date = new Date()
) {
    if (patch.amount !== undefined && !(patch.amount > 0)) {
        return yield* new InstallmentsError({ operation: "update-installment", reason: "installment-not-positive" });
    }
    yield* query("update-installment", () =>
        db
            .update(installments)
            .set({
                ...(patch.amount !== undefined && { amount: patch.amount }),
                ...(patch.dueDate !== undefined && { dueDate: startOfDay(patch.dueDate) }),
                updatedAt: now,
            })
            .where(and(eq(installments.id, id), isNull(installments.deletedAt)))
    );
});

export const installmentsRepo = {
    addFee: Effect.fn("Installments.addFee")(function* addFee(db: Database, input: InstallmentFeeInput) {
        if (!(input.amount > 0)) {
            return yield* new InstallmentsError({ operation: "add-fee", reason: "fee-not-positive" });
        }
        const plan = yield* liveInstallment("add-fee", db, input.installmentId);
        const account = yield* liabilityAccount("add-fee", db, plan.accountId);
        const [current, ...extra] = yield* read("add-fee", () => liveFees(db, input.installmentId));
        const date = input.date ?? current?.date ?? new Date();
        const now = new Date();
        const values = {
            ...(yield* query("add-fee", () =>
                canonicalUsd(localRateLookup(db), {
                    amount: input.amount,
                    currency: account.currency,
                    date,
                    displayCurrency: account.currency,
                })
            )),
            accountId: account.id,
            amount: input.amount,
            currency: account.currency,
            date,
            day: startOfDay(date),
            installmentId: input.installmentId,
            month: firstOfMonth(date),
            updatedAt: now,
        };
        const id = current?.id ?? newId();
        yield* transaction(
            db,
            Effect.gen(function* write() {
                if (current) {
                    yield* query("add-fee", () =>
                        db.update(transactions).set(values).where(eq(transactions.id, current.id))
                    );
                } else {
                    const [purchase] = yield* read("add-fee", () =>
                        db
                            .select({ categoryId: transactions.categoryId, note: transactions.note })
                            .from(transactions)
                            .where(eq(transactions.id, plan.transactionId))
                            .limit(1)
                            .all()
                    );
                    const categoryId = yield* read("add-fee", () => feeCategoryFor(db, purchase?.categoryId ?? null));
                    yield* query("add-fee", () =>
                        db.insert(transactions).values({
                            ...values,
                            categoryId,
                            id,
                            income: false,
                            note: translateNow("installments.fee.note", {
                                order: orderName(translateNow, purchase ?? null),
                            }),
                        })
                    );
                }
                yield* tombstoneFees(
                    "add-fee",
                    db,
                    extra.map((fee) => fee.id),
                    now
                );
            }),
            (cause) => new InstallmentsError({ cause, operation: "add-fee" })
        );
        return id;
    }),

    createOrder: Effect.fn("Installments.createOrder")(function* createOrder<E = never>(
        db: Database,
        input: InstallmentOrderInput<E>
    ) {
        const { purchase, schedule } = input;
        const account = yield* liabilityAccount("create-order", db, purchase.accountId);
        if (purchase.income) {
            return yield* new InstallmentsError({ operation: "create-order", reason: "not-expense" });
        }
        if (schedule.length === 0 || schedule.some((row) => !(row.amount > 0))) {
            return yield* new InstallmentsError({ operation: "create-order", reason: "empty-schedule" });
        }
        const planId = newId();
        const now = new Date();
        const upfrontRow = schedule.find((row) => row.sequence === 0);
        const paidOutside = input.installmentsPaidOutside ?? 0;
        const cuotas = schedule.filter((row) => row.sequence > 0).sort((a, b) => a.sequence - b.sequence);
        if (!(Number.isInteger(paidOutside) && paidOutside >= 0 && paidOutside <= cuotas.length)) {
            return yield* new InstallmentsError({ operation: "create-order", reason: "bad-paid-outside" });
        }
        if (upfrontRow && input.upfront === undefined) {
            return yield* new InstallmentsError({ operation: "create-order", reason: "missing-upfront-source" });
        }
        const outside = yield* outsideRows(
            db,
            planId,
            account.currency,
            [
                ...(upfrontRow && input.upfront === null ? [{ amount: upfrontRow.amount, date: purchase.date }] : []),
                ...cuotas.slice(0, paidOutside).map((row) => ({
                    amount: row.amount,
                    date: new Date(Math.min(startOfDay(row.dueDate).getTime(), now.getTime())),
                })),
            ],
            now
        );
        const upfront =
            upfrontRow && input.upfront
                ? yield* stageTransfer(
                      db,
                      paymentTransfer(planId, account.id, account.currency, {
                          amount: upfrontRow.amount,
                          date: purchase.date,
                          source: input.upfront,
                      })
                  )
                : null;

        const purchaseId = yield* transactionsRepo.create(db, purchase, {
            inSameTransaction: Effect.fn("Installments.createOrderRows")(function* createOrderRows(transactionId) {
                yield* query("create-order", () =>
                    db.insert(installmentPlans).values({
                        accountId: account.id,
                        dateCreated: now,
                        id: planId,
                        transactionId,
                        updatedAt: now,
                    })
                );
                yield* query("create-order", () =>
                    db.insert(installments).values(
                        schedule.map((row) => ({
                            amount: row.amount,
                            dueDate: startOfDay(row.dueDate),
                            id: newId(),
                            planId,
                            sequence: row.sequence,
                            updatedAt: now,
                        }))
                    )
                );
                if (outside.length > 0) {
                    yield* query("create-order", () => db.insert(outsidePayments).values(outside));
                }
                if (upfront) {
                    yield* upfront.write;
                }
                if (input.inSameTransaction) {
                    yield* input.inSameTransaction(transactionId);
                }
            }),
        });
        return { planId, transactionId: purchaseId };
    }),

    deleteInstallment,

    deleteOutsidePayment: Effect.fn("Installments.deleteOutsidePayment")(function* deleteOutsidePayment(
        db: Database,
        id: string,
        now: Date = new Date()
    ) {
        yield* query("delete-outside-payment", () =>
            db
                .update(outsidePayments)
                .set({ deletedAt: now, updatedAt: now })
                .where(and(eq(outsidePayments.id, id), isNull(outsidePayments.deletedAt)))
        );
    }),

    // Rows its payments cover stay and a partly paid one is trimmed, so the liability's balance doesn't move. An order
    // with nothing paid goes entirely, its transfers left as plain ones.
    deletePlan: Effect.fn("Installments.deletePlan")(function* deletePlan(
        db: Database,
        planId: string,
        now: Date = new Date()
    ) {
        yield* transaction(
            db,
            Effect.gen(function* write() {
                const entry = (yield* read("delete-plan", () => readPlans(db, now))).find(
                    ({ plan }) => plan.id === planId
                );
                if (!entry) {
                    return;
                }
                if (entry.standing.paid === 0) {
                    yield* tombstonePlans(db, eq(installmentPlans.id, planId), now, true);
                    return;
                }
                yield* Effect.all(
                    entry.standing.rows.map(({ covered, row, status }) =>
                        Effect.gen(function* trim() {
                            if (status === "unpaid") {
                                yield* deleteInstallment(db, row.id, now);
                                return;
                            }
                            if (status !== "partial") {
                                return;
                            }
                            if (covered > row.fee) {
                                const amount = roundToMinorUnits(covered - row.fee, entry.plan.currency);
                                yield* updateInstallment(db, row.id, { amount }, now);
                                return;
                            }
                            yield* query("delete-plan", () =>
                                db
                                    .update(transactions)
                                    .set({ installmentId: null, updatedAt: now })
                                    .where(and(eq(transactions.installmentId, row.id), isNull(transactions.deletedAt)))
                            );
                            yield* updateInstallment(db, row.id, { amount: covered }, now);
                        })
                    ),
                    { concurrency: "unbounded", discard: true }
                );
            }),
            (cause) => new InstallmentsError({ cause, operation: "delete-plan" })
        );
    }),

    removeFee: Effect.fn("Installments.removeFee")(function* removeFee(
        db: Database,
        installmentId: string,
        now: Date = new Date()
    ) {
        const fees = yield* read("remove-fee", () => liveFees(db, installmentId));
        yield* tombstoneFees(
            "remove-fee",
            db,
            fees.map((fee) => fee.id),
            now
        );
    }),

    recordPayment: Effect.fn("Installments.recordPayment")(function* recordPayment(
        db: Database,
        input: InstallmentPaymentInput
    ) {
        const plan = yield* livePlan("record-payment", db, input.planId);
        const account = yield* liabilityAccount("record-payment", db, plan.accountId);
        const { source } = input;
        if (source === null) {
            if (!(input.amount > 0)) {
                return yield* new InstallmentsError({ operation: "record-payment", reason: "payment-not-positive" });
            }
            const [row] = yield* outsideRows(db, plan.id, account.currency, [input], new Date());
            if (!row) {
                return yield* new InstallmentsError({ operation: "record-payment", reason: "no-outside-row" });
            }
            yield* query("record-payment", () => db.insert(outsidePayments).values(row));
            return row.id;
        }
        const { id, write } = yield* stageTransfer(
            db,
            paymentTransfer(plan.id, account.id, account.currency, { ...input, source })
        );
        yield* transaction(db, write, (cause) => new InstallmentsError({ cause, operation: "record-payment" }));
        return id;
    }),

    updateInstallment,
};

export function livePlansQuery(db: Database, accountId?: string) {
    return db
        .select({
            accountId: installmentPlans.accountId,
            currency: accounts.currency,
            dateCreated: installmentPlans.dateCreated,
            id: installmentPlans.id,
            transactionId: installmentPlans.transactionId,
        })
        .from(installmentPlans)
        .innerJoin(accounts, eq(accounts.id, installmentPlans.accountId))
        .where(
            and(
                isNull(installmentPlans.deletedAt),
                accountId === undefined ? undefined : eq(installmentPlans.accountId, accountId)
            )
        )
        .orderBy(asc(installmentPlans.dateCreated));
}

export function liveInstallmentsQuery(db: Database) {
    return db
        .select({
            amount: installments.amount,
            dueDate: installments.dueDate,
            id: installments.id,
            planId: installments.planId,
            sequence: installments.sequence,
        })
        .from(installments)
        .where(isNull(installments.deletedAt));
}

// Only transfers still arriving on the order's account count, so one re-pointed in the editor stops paying it.
export function planPaymentsQuery(db: Database) {
    return db
        .select({ paid: sql<number>`sum(${transfers.toAmount})`, planId: installmentPlans.id })
        .from(transfers)
        .innerJoin(
            installmentPlans,
            and(
                eq(installmentPlans.id, transfers.installmentPlanId),
                eq(installmentPlans.accountId, transfers.toAccountId)
            )
        )
        .where(and(isNull(transfers.deletedAt), isNotNull(transfers.installmentPlanId)))
        .groupBy(installmentPlans.id);
}

export function planFeesQuery(db: Database) {
    return db
        .select({ fee: sql<number>`sum(${transactions.amount})`, installmentId: installments.id })
        .from(transactions)
        .innerJoin(installments, eq(installments.id, transactions.installmentId))
        .innerJoin(installmentPlans, eq(installmentPlans.id, installments.planId))
        .innerJoin(accounts, eq(accounts.id, installmentPlans.accountId))
        .where(
            and(
                isNotNull(transactions.installmentId),
                isNull(transactions.deletedAt),
                eq(transactions.income, false),
                eq(transactions.accountId, installmentPlans.accountId),
                eq(transactions.currency, accounts.currency)
            )
        )
        .groupBy(installments.id);
}

export function lastFeeAmount(db: Database, accountId: string): number | null {
    const [fee] = db
        .select({ amount: transactions.amount })
        .from(transactions)
        .where(
            and(
                eq(transactions.accountId, accountId),
                isNotNull(transactions.installmentId),
                isNull(transactions.deletedAt)
            )
        )
        .orderBy(desc(transactions.date))
        .limit(1)
        .all();
    return fee?.amount ?? null;
}

export function liveOutsidePaymentsQuery(db: Database) {
    return db
        .select({
            amount: outsidePayments.amount,
            date: outsidePayments.date,
            id: outsidePayments.id,
            planId: outsidePayments.planId,
        })
        .from(outsidePayments)
        .where(isNull(outsidePayments.deletedAt))
        .orderBy(asc(outsidePayments.date));
}

export function planPurchasesQuery(db: Database) {
    return db
        .select({ amount: transactions.amount, date: transactions.date, id: transactions.id, note: transactions.note })
        .from(transactions)
        .innerJoin(installmentPlans, eq(installmentPlans.transactionId, transactions.id))
        .where(isNull(installmentPlans.deletedAt));
}

type RowOf<Query extends (db: Database) => { all: () => unknown[] }> = ReturnType<ReturnType<Query>["all"]>[number];
export type PlanRow = RowOf<typeof livePlansQuery>;
type StoredInstallmentRow = RowOf<typeof liveInstallmentsQuery>;
export type InstallmentRow = StoredInstallmentRow & { fee: number };
type FeeRow = RowOf<typeof planFeesQuery>;
type PaymentRow = RowOf<typeof planPaymentsQuery>;
export type OutsidePaymentRow = RowOf<typeof liveOutsidePaymentsQuery>;
export type PurchaseRow = RowOf<typeof planPurchasesQuery>;

export interface PlanWithStanding {
    outsidePayments: OutsidePaymentRow[];
    plan: PlanRow;
    /** Null only while the purchase entry is missing on this device, e.g. mid-sync. */
    purchase: PurchaseRow | null;
    standing: PlanStanding<InstallmentRow>;
}

export interface UpcomingInstallment {
    accountId: string;
    currency: string;
    planId: string;
    purchase: PurchaseRow | null;
    standing: InstallmentStanding<InstallmentRow>;
}

export function assemblePlans(
    reads: {
        fees: readonly FeeRow[];
        installments: readonly StoredInstallmentRow[];
        outside: readonly OutsidePaymentRow[];
        payments: readonly PaymentRow[];
        plans: readonly PlanRow[];
        purchases: readonly PurchaseRow[];
    },
    today: Date
): PlanWithStanding[] {
    const feeByRow = new Map(reads.fees.map((row) => [row.installmentId, row.fee]));
    const rowsByPlan = new Map<string, InstallmentRow[]>();
    for (const row of reads.installments) {
        rowsByPlan.set(row.planId, [...(rowsByPlan.get(row.planId) ?? []), { ...row, fee: feeByRow.get(row.id) ?? 0 }]);
    }
    const outsideByPlan = new Map<string, OutsidePaymentRow[]>();
    for (const row of reads.outside) {
        outsideByPlan.set(row.planId, [...(outsideByPlan.get(row.planId) ?? []), row]);
    }
    const paidByPlan = new Map(reads.payments.map((row) => [row.planId, row.paid]));
    const purchases = new Map(reads.purchases.map((row) => [row.id, row]));
    return reads.plans.map((plan) => {
        const outside = outsideByPlan.get(plan.id) ?? [];
        const paid = outside.reduce((total, row) => total + row.amount, paidByPlan.get(plan.id) ?? 0);
        return {
            outsidePayments: outside,
            plan,
            purchase: purchases.get(plan.transactionId) ?? null,
            standing: planStanding(rowsByPlan.get(plan.id) ?? [], paid, today, plan.currency),
        };
    });
}

// Overdue rows are included: a due-soon list that hid a missed payment would be the wrong kind of calm.
export function upcomingInstallments(plans: readonly PlanWithStanding[], through: Date): UpcomingInstallment[] {
    const throughMs = startOfDay(through).getTime();
    return plans
        .flatMap(({ plan, purchase, standing }) =>
            standing.rows
                .filter((row) => row.status !== "paid" && row.row.dueDate.getTime() <= throughMs)
                .map((row) => ({
                    accountId: plan.accountId,
                    currency: plan.currency,
                    planId: plan.id,
                    purchase,
                    standing: row,
                }))
        )
        .sort((a, b) => a.standing.row.dueDate.getTime() - b.standing.row.dueDate.getTime());
}

export function readPlans(db: Database, today: Date, accountId?: string): PlanWithStanding[] {
    return assemblePlans(
        {
            fees: planFeesQuery(db).all(),
            installments: liveInstallmentsQuery(db).all(),
            outside: liveOutsidePaymentsQuery(db).all(),
            payments: planPaymentsQuery(db).all(),
            plans: livePlansQuery(db, accountId).all(),
            purchases: planPurchasesQuery(db).all(),
        },
        today
    );
}
