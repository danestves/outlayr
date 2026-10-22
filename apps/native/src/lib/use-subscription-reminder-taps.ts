import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import {
    addNotificationResponseReceivedListener,
    clearLastNotificationResponse,
    getLastNotificationResponse,
} from "expo-notifications";
import type { NotificationResponse } from "expo-notifications";
import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useEffect } from "react";
import { z } from "zod";

import { readPlans } from "@/data/installments-core";
import { backfillRecurring } from "@/data/recurrence-backfill";
import { getTransactionById } from "@/data/transactions-core";
import type { Database } from "@/db/client";

const subscriptionTapSchema = z.object({ charge: z.string(), subscription: z.string() });
const reminderTapSchema = z.union([
    subscriptionTapSchema,
    z.object({ open: z.literal("log") }),
    z.object({ date: z.string().optional(), open: z.literal("create") }),
    z.object({ open: z.literal("installment"), plan: z.string() }),
    z.object({ account: z.string(), open: z.literal("account") }),
]);

function announcedRowId(db: Database, { charge, subscription }: z.infer<typeof subscriptionTapSchema>): string | null {
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
            const parsed = reminderTapSchema.safeParse(response?.notification.request.content.data);
            if (!parsed.success || response === null) {
                return;
            }
            const tap = `${response.notification.request.identifier}@${response.notification.date}`;
            let target: Href | null = "/";
            if ("subscription" in parsed.data) {
                await backfillRecurring(db, parsed.data.subscription);
                const id = announcedRowId(db, parsed.data);
                target = id === null ? null : `/transactions/${id}`;
            } else if (parsed.data.open === "installment") {
                target = installmentTarget(db, parsed.data.plan);
            } else if (parsed.data.open === "account") {
                target = `/accounts/${parsed.data.account}`;
            } else if (parsed.data.open === "create") {
                const { date } = parsed.data;
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
