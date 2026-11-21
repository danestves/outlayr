import { draftSchedule, paidBeforeCount } from "@outlayr/money/installment-draft";
import * as Cause from "effect/Cause";
import * as Clock from "effect/Clock";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";

import type { Account } from "@/data/accounts-core";
import { installmentsRepo, liveInstallmentsQuery } from "@/data/installments-core";
import type { InstallmentOrderInput } from "@/data/installments-core";
import type { Database } from "@/db/client";
import type { InstallmentSeed, ScannedOrder } from "@/domain/installment-scan";
import { appRuntime } from "@/lib/runtime";
import { rearmInstallmentReminders } from "@/state/surfaces-commands";

import { createRuntimeCommand } from "./atom-command";
import { queueLookup } from "./entry-commit";
import { logged } from "./entry-save";

type SeededFee = InstallmentSeed["fees"][number];

const addSeededFees = Effect.fn("InstallmentOrder.addSeededFees")(function* addSeededFees(
    db: Database,
    fees: readonly SeededFee[],
    orderPlanId: string,
    paidOutside: number,
    onFailed: () => void
) {
    const cuotas = liveInstallmentsQuery(db)
        .all()
        .filter((row) => row.planId === orderPlanId);
    yield* Effect.all(
        fees.map((fee) =>
            Effect.gen(function* addFee() {
                const cuota = cuotas.find((row) => row.sequence === fee.sequence);
                if (cuota === undefined) {
                    return;
                }
                const nowMs = yield* Clock.currentTimeMillis;
                const charged = DateTime.toDate(DateTime.makeUnsafe(Math.min(cuota.dueDate.getTime(), nowMs)));
                yield* installmentsRepo.addFee(db, { amount: fee.amount, date: charged, installmentId: cuota.id });
                if (fee.sequence <= paidOutside) {
                    yield* installmentsRepo.recordPayment(db, {
                        amount: fee.amount,
                        date: charged,
                        planId: orderPlanId,
                        source: null,
                    });
                }
            }).pipe(Effect.uninterruptible)
        ),
        { concurrency: "unbounded" }
    ).pipe(
        Effect.catchCause((cause) =>
            Effect.andThen(
                Effect.logError("Failed to save a scanned late fee", Cause.squash(cause)),
                Effect.sync(onFailed)
            )
        )
    );
});

export const placeOrder = Effect.fn("InstallmentOrder.placeOrder")(function* placeOrder<E = never>(
    db: Database,
    order: InstallmentOrderInput<E>,
    fees: readonly SeededFee[],
    callbacks: { onFeesFailed: () => void; onOrdered: () => void }
) {
    const { planId, transactionId } = yield* installmentsRepo.createOrder(db, order);
    callbacks.onOrdered();
    yield* addSeededFees(db, fees, planId, order.installmentsPaidOutside ?? 0, callbacks.onFeesFailed);
    rearmInstallmentReminders(db);
    return transactionId;
});

interface ScannedImport {
    account: Account;
    name: string;
    order: ScannedOrder;
}

const importScannedOrders = Effect.fn("InstallmentOrder.importScannedOrders")(function* importScannedOrders({
    db,
    imports,
    onFeesFailed,
    onSaved,
}: {
    db: Database;
    imports: readonly ScannedImport[];
    onFeesFailed: () => void;
    onSaved: (position: number) => void;
}) {
    for (const [position, { account, name, order }] of imports.entries()) {
        const schedule = draftSchedule(order.draft, order.price, order.purchaseDay, account.currency);
        if (schedule === null) {
            continue;
        }
        const transactionId = yield* placeOrder(
            db,
            {
                installmentsPaidOutside: paidBeforeCount(order.draft, schedule, yield* DateTime.nowAsDate),
                purchase: {
                    accountId: account.id,
                    amount: order.price,
                    categoryId: null,
                    currency: account.currency,
                    date: order.purchaseDay,
                    details: null,
                    income: false,
                    note: name,
                    unreviewed: true,
                },
                schedule,
                upfront: schedule.some((row) => row.sequence === 0) ? null : undefined,
            },
            order.fees,
            { onFeesFailed, onOrdered: () => onSaved(position) }
        );
        yield* logged("Failed to queue the merchant lookup")(queueLookup(db, transactionId));
    }
});

export const importScannedOrdersCommand = createRuntimeCommand(appRuntime, {
    execute: importScannedOrders,
    label: "installment-flow:import-scanned-orders",
});
