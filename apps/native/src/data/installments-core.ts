import { toAccountKind } from "@outlayr/money/account-kind";
import { firstOfMonth, startOfDay } from "@outlayr/money/calendar";
import { canonicalUsd } from "@outlayr/money/canonical-usd";
import { and, asc, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";

import type { Database } from "@/db/client";
import { accounts, installmentPlans, installments, outsidePayments, transactions, transfers } from "@/db/schema";
import { withTransaction } from "@/db/transaction";
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

export interface InstallmentOrderInput {
    inSameTransaction?: (transactionId: string) => Promise<void>;
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

function liabilityAccount(db: Database, accountId: string) {
    const account = getAccountById(db, accountId);
    if (!account || toAccountKind(account.kind) !== "liability") {
        throw new Error("Installments are only allowed on liability accounts");
    }
    return account;
}

function livePlan(db: Database, planId: string): InstallmentPlan {
    const [plan] = db
        .select()
        .from(installmentPlans)
        .where(and(eq(installmentPlans.id, planId), isNull(installmentPlans.deletedAt)))
        .limit(1)
        .all();
    if (!plan) {
        throw new Error("The installment order no longer exists");
    }
    return plan;
}

function liveInstallment(db: Database, installmentId: string) {
    const [found] = db
        .select({ plan: installmentPlans })
        .from(installments)
        .innerJoin(installmentPlans, eq(installmentPlans.id, installments.planId))
        .where(
            and(eq(installments.id, installmentId), isNull(installments.deletedAt), isNull(installmentPlans.deletedAt))
        )
        .limit(1)
        .all();
    if (!found) {
        throw new Error("The installment no longer exists");
    }
    return found.plan;
}

function liveFees(db: Database, installmentId: string) {
    return db
        .select({ date: transactions.date, id: transactions.id })
        .from(transactions)
        .where(and(eq(transactions.installmentId, installmentId), isNull(transactions.deletedAt)))
        .orderBy(desc(transactions.date))
        .all();
}

async function tombstoneFees(db: Database, ids: readonly string[], now: Date): Promise<void> {
    if (ids.length > 0) {
        await db
            .update(transactions)
            .set({ deletedAt: now, updatedAt: now })
            .where(and(inArray(transactions.id, [...ids]), isNull(transactions.deletedAt)));
    }
}

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
function outsideRows(
    db: Database,
    planId: string,
    currency: string,
    payments: readonly { amount: number; date: Date }[],
    now: Date
) {
    return Promise.all(
        payments.map(async ({ amount, date }) => ({
            amount,
            amountUsd: await frozenUsdAmount(db, amount, currency, date),
            date,
            id: newId(),
            planId,
            updatedAt: now,
        }))
    );
}

export const installmentsRepo = {
    async addFee(db: Database, input: InstallmentFeeInput): Promise<string> {
        if (!(input.amount > 0)) {
            throw new Error("A late fee must be positive");
        }
        const plan = liveInstallment(db, input.installmentId);
        const account = liabilityAccount(db, plan.accountId);
        const [current, ...extra] = liveFees(db, input.installmentId);
        const date = input.date ?? current?.date ?? new Date();
        const now = new Date();
        const values = {
            ...(await canonicalUsd(localRateLookup(db), {
                amount: input.amount,
                currency: account.currency,
                date,
                displayCurrency: account.currency,
            })),
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
        await withTransaction(db, async () => {
            if (current) {
                await db.update(transactions).set(values).where(eq(transactions.id, current.id));
            } else {
                const [purchase] = db
                    .select({ categoryId: transactions.categoryId, note: transactions.note })
                    .from(transactions)
                    .where(eq(transactions.id, plan.transactionId))
                    .limit(1)
                    .all();
                await db.insert(transactions).values({
                    ...values,
                    categoryId: feeCategoryFor(db, purchase?.categoryId ?? null),
                    id,
                    income: false,
                    note: translateNow("installments.fee.note", { order: orderName(translateNow, purchase ?? null) }),
                });
            }
            await tombstoneFees(
                db,
                extra.map((fee) => fee.id),
                now
            );
        });
        return id;
    },

    async createOrder(db: Database, input: InstallmentOrderInput): Promise<{ planId: string; transactionId: string }> {
        const { purchase, schedule } = input;
        const account = liabilityAccount(db, purchase.accountId);
        if (purchase.income) {
            throw new Error("An installment purchase is an expense");
        }
        if (schedule.length === 0 || schedule.some((row) => !(row.amount > 0))) {
            throw new Error("An installment order needs positive installments");
        }
        const planId = newId();
        const now = new Date();
        const upfrontRow = schedule.find((row) => row.sequence === 0);
        const paidOutside = input.installmentsPaidOutside ?? 0;
        const cuotas = schedule.filter((row) => row.sequence > 0).sort((a, b) => a.sequence - b.sequence);
        if (!(Number.isInteger(paidOutside) && paidOutside >= 0 && paidOutside <= cuotas.length)) {
            throw new Error("Installments paid outside must be a whole number within the schedule");
        }
        if (upfrontRow && input.upfront === undefined) {
            throw new Error("An upfront payment needs the account it was paid from, or null when paid outside");
        }
        const outside = await outsideRows(
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
        let upfront: Awaited<ReturnType<typeof stageTransfer>> | null = null;
        if (upfrontRow && input.upfront) {
            upfront = await stageTransfer(
                db,
                paymentTransfer(planId, account.id, account.currency, {
                    amount: upfrontRow.amount,
                    date: purchase.date,
                    source: input.upfront,
                })
            );
        }

        const purchaseId = await transactionsRepo.create(db, purchase, {
            inSameTransaction: async (transactionId) => {
                await db.insert(installmentPlans).values({
                    accountId: account.id,
                    dateCreated: now,
                    id: planId,
                    transactionId,
                    updatedAt: now,
                });
                await db.insert(installments).values(
                    schedule.map((row) => ({
                        amount: row.amount,
                        dueDate: startOfDay(row.dueDate),
                        id: newId(),
                        planId,
                        sequence: row.sequence,
                        updatedAt: now,
                    }))
                );
                if (outside.length > 0) {
                    await db.insert(outsidePayments).values(outside);
                }
                await upfront?.write();
                await input.inSameTransaction?.(transactionId);
            },
        });
        return { planId, transactionId: purchaseId };
    },

    async deleteInstallment(db: Database, id: string, now: Date = new Date()): Promise<void> {
        await db
            .update(installments)
            .set({ deletedAt: now, updatedAt: now })
            .where(and(eq(installments.id, id), isNull(installments.deletedAt)));
    },

    async deleteOutsidePayment(db: Database, id: string, now: Date = new Date()): Promise<void> {
        await db
            .update(outsidePayments)
            .set({ deletedAt: now, updatedAt: now })
            .where(and(eq(outsidePayments.id, id), isNull(outsidePayments.deletedAt)));
    },

    // Rows its payments cover stay and a partly paid one is trimmed, so the liability's balance doesn't move. An order
    // with nothing paid goes entirely, its transfers left as plain ones.
    async deletePlan(db: Database, planId: string, now: Date = new Date()): Promise<void> {
        await withTransaction(db, async () => {
            const entry = readPlans(db, now).find(({ plan }) => plan.id === planId);
            if (!entry) {
                return;
            }
            if (entry.standing.paid === 0) {
                await tombstonePlans(db, eq(installmentPlans.id, planId), now, true);
                return;
            }
            await Promise.all(
                entry.standing.rows.map(async ({ covered, row, status }) => {
                    if (status === "unpaid") {
                        await installmentsRepo.deleteInstallment(db, row.id, now);
                        return;
                    }
                    if (status !== "partial") {
                        return;
                    }
                    if (covered > row.fee) {
                        const amount = roundToMinorUnits(covered - row.fee, entry.plan.currency);
                        await installmentsRepo.updateInstallment(db, row.id, { amount }, now);
                        return;
                    }
                    await db
                        .update(transactions)
                        .set({ installmentId: null, updatedAt: now })
                        .where(and(eq(transactions.installmentId, row.id), isNull(transactions.deletedAt)));
                    await installmentsRepo.updateInstallment(db, row.id, { amount: covered }, now);
                })
            );
        });
    },

    async removeFee(db: Database, installmentId: string, now: Date = new Date()): Promise<void> {
        await tombstoneFees(
            db,
            liveFees(db, installmentId).map((fee) => fee.id),
            now
        );
    },

    async recordPayment(db: Database, input: InstallmentPaymentInput): Promise<string> {
        const plan = livePlan(db, input.planId);
        const account = liabilityAccount(db, plan.accountId);
        const { source } = input;
        if (source === null) {
            if (!(input.amount > 0)) {
                throw new Error("A payment must be positive");
            }
            const [row] = await outsideRows(db, plan.id, account.currency, [input], new Date());
            if (!row) {
                throw new Error("No outside payment to record");
            }
            await db.insert(outsidePayments).values(row);
            return row.id;
        }
        const { id, write } = await stageTransfer(
            db,
            paymentTransfer(plan.id, account.id, account.currency, { ...input, source })
        );
        await withTransaction(db, write);
        return id;
    },

    async updateInstallment(
        db: Database,
        id: string,
        patch: { amount?: number; dueDate?: Date },
        now: Date = new Date()
    ): Promise<void> {
        if (patch.amount !== undefined && !(patch.amount > 0)) {
            throw new Error("An installment must be positive");
        }
        await db
            .update(installments)
            .set({
                ...(patch.amount !== undefined && { amount: patch.amount }),
                ...(patch.dueDate !== undefined && { dueDate: startOfDay(patch.dueDate) }),
                updatedAt: now,
            })
            .where(and(eq(installments.id, id), isNull(installments.deletedAt)));
    },
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
