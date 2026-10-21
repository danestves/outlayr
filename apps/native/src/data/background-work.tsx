import { useEffect, useState } from "react";

import { useDatabase } from "@/contexts/local-data-context";
import { META_KEYS } from "@/data/app-meta-core";
import { subscribeToSettingChanges } from "@/data/database-changes";
import { usePhotoReconcile } from "@/data/use-photo-reconcile";
import { usePhotoSync } from "@/data/use-photo-sync";
import { useRecurrenceSweep } from "@/data/use-recurrence-sweep";
import { useSyncEngine } from "@/data/use-sync-engine";
import type { Database } from "@/db/client";
import { useProEntitled } from "@/hooks/use-pro-locked";
import { useCloudAuthenticated } from "@/lib/convex";
import { useEnrichmentQueue } from "@/lib/enrichment-queue";
import { syncInstallmentReminders } from "@/lib/installment-reminder-sync";
import { useDailyReminderSync } from "@/lib/reminder-sync";
import { syncSubscriptionReminders } from "@/lib/subscription-reminder-sync";
import { debounce, PUBLISH_DEBOUNCE_MS } from "@/lib/sync-cadence";
import { useSystemSync } from "@/lib/use-system-sync";

const IDLE_TIMEOUT_MS = 1000;

const DUE_REMINDER_SETTINGS = [
    "subscriptionReminders",
    "installmentReminders",
    "hideAmounts",
    "notificationOption",
    "notificationHour",
    "notificationMinute",
    META_KEYS.currency,
] as const;

let duePass: Promise<void> = Promise.resolve();

// Cuotas take the headroom the subscription notices leave, so they wait for that pass. Whole passes chain, or one
// pass's cuotas could count the queue while another's subscriptions are mid re-arm.
const reconcileDueReminders = (db: Database) => {
    duePass = duePass
        .then(() => syncSubscriptionReminders(db))
        .catch((error) => {
            console.error("Subscription reminder sync failed", error);
        })
        .then(() => syncInstallmentReminders(db))
        .catch((error) => {
            console.error("Installment reminder sync failed", error);
        });
};

export function BackgroundWork() {
    const db = useDatabase();
    const [started, setStarted] = useState(false);
    const proEntitled = useProEntitled();
    const cloudAuthenticated = useCloudAuthenticated();

    useEffect(() => {
        const handle = requestIdleCallback(
            () => {
                setStarted(true);
            },
            { timeout: IDLE_TIMEOUT_MS }
        );
        return () => {
            cancelIdleCallback(handle);
        };
    }, []);

    const ready = started ? db : null;

    useDailyReminderSync(ready);
    // The sweep moves the landing the notices are dated from, so due reminders reconcile from its callback.
    useRecurrenceSweep(ready, reconcileDueReminders);
    useEffect(() => {
        if (ready == null) {
            return;
        }
        const resync = debounce(PUBLISH_DEBOUNCE_MS, () => {
            reconcileDueReminders(ready);
        });
        const unsubscribe = subscribeToSettingChanges(ready, resync.schedule, DUE_REMINDER_SETTINGS);
        return () => {
            resync.cancel();
            unsubscribe();
        };
    }, [ready]);
    // After the sweep, so a subscription that advanced this foreground is in the table when the widgets rebuild.
    useSystemSync(ready);
    useEnrichmentQueue(ready);
    // Held down without a confirmed entitlement and session: the server refuses a lapsed customer and a missing token.
    useSyncEngine(ready, !proEntitled || !cloudAuthenticated);
    usePhotoReconcile(ready);
    // After the reconciliation: running first would upload against paths it is about to repair.
    usePhotoSync(ready, !proEntitled || !cloudAuthenticated);

    return null;
}
