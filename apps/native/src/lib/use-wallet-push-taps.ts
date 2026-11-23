import * as Cause from "effect/Cause";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import {
    addNotificationResponseReceivedListener,
    clearLastNotificationResponse,
    DEFAULT_ACTION_IDENTIFIER,
    dismissNotificationAsync,
    getLastNotificationResponse,
} from "expo-notifications";
import type { NotificationResponse } from "expo-notifications";
import { useRouter } from "expo-router";

import { dismissDeviceWrite } from "@/data/pending-writes";
import type { Database } from "@/db/client";
import { ChargeAction } from "@/lib/charge-actions";
import { useMirror } from "@/lib/lifecycle";
import { SILENT } from "@/state/atom-command";
import { appAtomRegistry } from "@/state/atom-registry";
import { resolveWalletPushTapCommand, settleWalletPushActionCommand } from "@/state/surfaces-commands";
import { fireAtomCommand } from "@/state/use-atom-action";

import { decodeWalletPushTap } from "./notification-taps";

let handled: string | null = null;

const settling = new Set<string>();

const decodeChargeAction = Schema.decodeUnknownOption(ChargeAction);

const recordDismissal = (response: NotificationResponse | null) => {
    if (response?.actionIdentifier !== "delete") {
        return;
    }
    const parsed = decodeWalletPushTap(response.notification.request.content.data);
    if (Option.isSome(parsed)) {
        dismissDeviceWrite(parsed.value.walletWrite);
    }
};

recordDismissal(getLastNotificationResponse());
addNotificationResponseReceivedListener(recordDismissal);

export function useWalletPushTaps(db: Database, ready: boolean, actionsReady: boolean): void {
    const router = useRouter();

    useMirror([db, ready, actionsReady, router], () => {
        if (!(ready || actionsReady)) {
            return;
        }
        let disposed = false;
        const handle = (response: NotificationResponse | null) => {
            const parsed = decodeWalletPushTap(response?.notification.request.content.data);
            const id = response?.notification.request.identifier;
            if (response === null || Option.isNone(parsed) || id == null || id === handled) {
                return;
            }
            if (response.actionIdentifier === DEFAULT_ACTION_IDENTIFIER) {
                if (!ready) {
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
                return;
            }
            const action = decodeChargeAction(response.actionIdentifier);
            if (!actionsReady || Option.isNone(action)) {
                return;
            }
            if (settling.has(id)) {
                return;
            }
            settling.add(id);
            fireAtomCommand(
                appAtomRegistry,
                settleWalletPushActionCommand,
                { action: action.value, db, walletWrite: parsed.value.walletWrite },
                {
                    onFailure: (cause) => {
                        settling.delete(id);
                        console.warn("[outlayr] wallet push action failed", Cause.squash(cause));
                    },
                    onSuccess: () => {
                        settling.delete(id);
                        if (disposed || id === handled) {
                            return;
                        }
                        handled = id;
                        if (getLastNotificationResponse()?.notification.request.identifier === id) {
                            clearLastNotificationResponse();
                        }
                        void dismissNotificationAsync(id);
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
