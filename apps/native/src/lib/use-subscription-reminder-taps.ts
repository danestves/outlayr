import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import {
    addNotificationResponseReceivedListener,
    clearLastNotificationResponse,
    getLastNotificationResponse,
} from "expo-notifications";
import type { NotificationResponse } from "expo-notifications";
import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useEffect } from "react";

import { readPlans } from "@/data/installments-core";
import { getTransactionById } from "@/data/transactions-core";
import type { Database } from "@/db/client";
import { backfillRecurringCommand, runLedgerCommand } from "@/state/ledger-commands";

const SubscriptionTap = Schema.Struct({ charge: Schema.String, subscription: Schema.String });
const decodeReminderTap = Schema.decodeUnknownOption(
    Schema.Union([
        SubscriptionTap,
        Schema.Struct({ open: Schema.Literal("log") }),
        Schema.Struct({ date: Schema.optional(Schema.String), open: Schema.Literal("create") }),
        Schema.Struct({ open: Schema.Literal("installment"), plan: Schema.String }),
        Schema.Struct({ account: Schema.String, open: Schema.Literal("account") }),
    ])
);

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

let handled: string | null = null;

export function useSubscriptionReminderTaps(db: Database, ready: boolean): void {
    const router = useRouter();

    useEffect(() => {
        if (!ready) {
            return;
        }
        let disposed = false;
        const open = async (response: NotificationResponse | null) => {
            const parsed = decodeReminderTap(response?.notification.request.content.data);
            if (Option.isNone(parsed) || response === null) {
                return;
            }
            const tap = `${response.notification.request.identifier}@${response.notification.date}`;
            let target: Href | null = "/";
            if ("subscription" in parsed.value) {
                await runLedgerCommand(backfillRecurringCommand, { db, id: parsed.value.subscription });
                const id = announcedRowId(db, parsed.value);
                target = id === null ? null : `/transactions/${id}`;
            } else if (parsed.value.open === "installment") {
                target = installmentTarget(db, parsed.value.plan);
            } else if (parsed.value.open === "account") {
                target = `/accounts/${parsed.value.account}`;
            } else if (parsed.value.open === "create") {
                const { date } = parsed.value;
                target = date === undefined ? "/transactions/create" : `/transactions/create?date=${date}`;
            }
            if (disposed || tap === handled || target === null) {
                return;
            }
            router.navigate(target);
            handled = tap;
            clearLastNotificationResponse();
        };
        const handle = (response: NotificationResponse | null) => {
            open(response).catch((error) => {
                console.warn("[outlayr] subscription reminder tap failed", error);
            });
        };

        handle(getLastNotificationResponse());
        const subscription = addNotificationResponseReceivedListener(handle);
        return () => {
            disposed = true;
            subscription.remove();
        };
    }, [db, ready, router]);
}
