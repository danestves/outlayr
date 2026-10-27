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
import { resolveWalletPushTapCommand } from "@/state/surfaces-commands";
import { fireAtomCommand } from "@/state/use-atom-action";

import { decodeWalletPushTap } from "./notification-taps";

let handled: string | null = null;

export function useWalletPushTaps(db: Database, ready: boolean): void {
    const router = useRouter();

    // oxlint-disable-next-line outlayr/react-effect-budget -- subscribes to Expo's notification response listener, which has no React-side source
    useEffect(() => {
        if (!ready) {
            return;
        }
        let disposed = false;
        const handle = (response: NotificationResponse | null) => {
            const parsed = decodeWalletPushTap(response?.notification.request.content.data);
            const id = response?.notification.request.identifier;
            if (Option.isNone(parsed) || id == null || id === handled) {
                return;
            }
            fireAtomCommand(
                appAtomRegistry,
                resolveWalletPushTapCommand,
                { db, tap: parsed.value },
                {
                    onFailure: (cause) => console.warn("[outlayr] wallet push tap failed", Cause.squash(cause)),
                    onSuccess: (target) => {
                        if (disposed || id === handled || target === null) {
                            return;
                        }
                        router.navigate(target);
                        handled = id;
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
