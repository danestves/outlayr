import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import type { Href } from "expo-router";

import { readPlans } from "@/data/installments-core";
import { cardStillAsks, drainPendingWrites, fileWaitingPurchases, pendingWriteTxId } from "@/data/pending-writes-core";
import { backfillRecurring } from "@/data/recurrence-backfill";
import { getTransactionById } from "@/data/transactions-core";
import type { Database } from "@/db/client";

import { warnAndContinue } from "./warn-and-continue";
import { claimPendingWrites, releasePendingWrites } from "./widget-bridge";

const SubscriptionTap = Schema.Struct({ charge: Schema.String, subscription: Schema.String });
const ReminderTap = Schema.Union([
    SubscriptionTap,
    Schema.Struct({ open: Schema.Literal("log") }),
    Schema.Struct({ date: Schema.optional(Schema.String), open: Schema.Literal("create") }),
    Schema.Struct({ open: Schema.Literal("installment"), plan: Schema.String }),
    Schema.Struct({ account: Schema.String, open: Schema.Literal("account") }),
]);
const WalletPushTap = Schema.Struct({
    card: Schema.optional(Schema.String),
    pickCard: Schema.optional(Schema.Boolean),
    walletWrite: Schema.String,
});

export type ReminderTap = typeof ReminderTap.Type;
export type WalletPushTap = typeof WalletPushTap.Type;

export const decodeReminderTap = Schema.decodeUnknownOption(ReminderTap);
export const decodeWalletPushTap = Schema.decodeUnknownOption(WalletPushTap);

function announcedRowId(db: Database, { charge, subscription }: typeof SubscriptionTap.Type): string | null {
    const landed = getTransactionById(db, charge);
    if (landed !== null && landed.deletedAt === null) {
        return charge;
    }
    const carrier = getTransactionById(db, subscription);
    const pending = carrier !== null && carrier.deletedAt === null && carrier.recurringType > RECURRING_TYPE.none;
    return pending ? subscription : null;
}

function installmentTarget(db: Database, planId: string): Href | null {
    const entry = readPlans(db, new Date()).find(({ plan }) => plan.id === planId);
    if (entry === undefined) {
        return null;
    }
    return entry.standing.next === null
        ? { params: { planId }, pathname: "/installments/[planId]" }
        : { params: { all: "0", planId }, pathname: "/installments/pay" };
}

export const resolveReminderTap = Effect.fn("NotificationTaps.resolveReminder")(function* resolveReminderTap(
    db: Database,
    tap: ReminderTap
) {
    let target: Href | null = "/";
    if ("subscription" in tap) {
        yield* backfillRecurring(db, tap.subscription);
        const id = announcedRowId(db, tap);
        target = id === null ? null : `/transactions/${id}`;
    } else if (tap.open === "installment") {
        target = installmentTarget(db, tap.plan);
    } else if (tap.open === "account") {
        target = `/accounts/${tap.account}`;
    } else if (tap.open === "create") {
        target = tap.date === undefined ? "/transactions/create" : `/transactions/create?date=${tap.date}`;
    }
    return target;
});

const settleWalletWrites = (db: Database, walletWrite: string) =>
    drainPendingWrites(db, claimPendingWrites, releasePendingWrites).pipe(
        warnAndContinue("[outlayr] pending writes failed to apply"),
        Effect.andThen(fileWaitingPurchases(db).pipe(warnAndContinue("[outlayr] waiting purchases failed to file"))),
        Effect.andThen(pendingWriteTxId(db, walletWrite))
    );

export const resolveWalletPushTap = Effect.fn("NotificationTaps.resolveWalletPush")(function* resolveWalletPushTap(
    db: Database,
    tap: WalletPushTap
) {
    const txId = (yield* settleWalletWrites(db, tap.walletWrite)) ?? (yield* settleWalletWrites(db, tap.walletWrite));
    const { card, pickCard } = tap;
    const unattached = txId !== null && getTransactionById(db, txId)?.accountId == null;
    const asks = pickCard === true && unattached && (card === undefined || (yield* cardStillAsks(db, card)));
    let target: Href | null = null;
    if (asks) {
        target = "/settings/integrations";
    } else if (txId) {
        target = `/transactions/${txId}`;
    }
    return target;
});
