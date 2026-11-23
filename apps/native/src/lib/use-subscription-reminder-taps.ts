import { REMINDER_ANALYTICS_AT_MS } from "@outlayr/backend/confect/legal";
import * as Cause from "effect/Cause";
import * as Option from "effect/Option";
import {
    addNotificationResponseReceivedListener,
    clearLastNotificationResponse,
    getLastNotificationResponse,
} from "expo-notifications";
import type { NotificationResponse } from "expo-notifications";
import { useRouter } from "expo-router";

import type { Database } from "@/db/client";
import { useMirror } from "@/lib/lifecycle";
import { SILENT } from "@/state/atom-command";
import { appAtomRegistry } from "@/state/atom-registry";
import { resolveReminderTapCommand } from "@/state/surfaces-commands";
import { fireAtomCommand } from "@/state/use-atom-action";

import { decodeReminderTap } from "./notification-taps";
import { posthog } from "./posthog";

let handled: string | null = null;

export function useSubscriptionReminderTaps(db: Database, ready: boolean): void {
    const router = useRouter();

    useMirror([db, ready, router], () => {
        if (!ready) {
            return;
        }
        let disposed = false;
        const handle = (response: NotificationResponse | null) => {
            const parsed = decodeReminderTap(response?.notification.request.content.data);
            if (Option.isNone(parsed) || response === null) {
                return;
            }
            const tap = `${response.notification.request.identifier}@${response.notification.date}`;
            const decoded = parsed.value;
            fireAtomCommand(
                appAtomRegistry,
                resolveReminderTapCommand,
                { db, tap: decoded },
                {
                    onFailure: (cause) =>
                        console.warn("[outlayr] subscription reminder tap failed", Cause.squash(cause)),
                    onSuccess: (target) => {
                        if (disposed || tap === handled || target === null) {
                            return;
                        }
                        router.navigate(target);
                        const reported = Date.now() >= REMINDER_ANALYTICS_AT_MS;
                        if (reported && "open" in decoded && decoded.open === "create" && decoded.kind !== undefined) {
                            posthog?.capture("notification_opened", { kind: decoded.kind });
                        }
                        handled = tap;
                        clearLastNotificationResponse();
                    },
                },
                SILENT
            );
        };

        handle(getLastNotificationResponse());
        const subscription = addNotificationResponseReceivedListener(handle);
        return () => {
            disposed = true;
            subscription.remove();
        };
    });
}
