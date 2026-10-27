import * as Cause from "effect/Cause";
import * as Option from "effect/Option";
import {
    addNotificationResponseReceivedListener,
    clearLastNotificationResponse,
    getLastNotificationResponse,
} from "expo-notifications";
import type { NotificationResponse } from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect } from "react";

import type { Database } from "@/db/client";
import { SILENT } from "@/state/atom-command";
import { appAtomRegistry } from "@/state/atom-registry";
import { resolveReminderTapCommand } from "@/state/surfaces-commands";
import { fireAtomCommand } from "@/state/use-atom-action";

import { decodeReminderTap } from "./notification-taps";

let handled: string | null = null;

export function useSubscriptionReminderTaps(db: Database, ready: boolean): void {
    const router = useRouter();

    // oxlint-disable-next-line outlayr/react-effect-budget -- subscribes to Expo's notification response listener, which has no React-side source
    useEffect(() => {
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
            fireAtomCommand(
                appAtomRegistry,
                resolveReminderTapCommand,
                { db, tap: parsed.value },
                {
                    onFailure: (cause) =>
                        console.warn("[outlayr] subscription reminder tap failed", Cause.squash(cause)),
                    onSuccess: (target) => {
                        if (disposed || tap === handled || target === null) {
                            return;
                        }
                        router.navigate(target);
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
    }, [db, ready, router]);
}
