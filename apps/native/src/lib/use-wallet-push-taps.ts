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

import { cardStillAsks, drainPendingWrites, fileWaitingPurchases, pendingWriteTxId } from "@/data/pending-writes-core";
import { getTransactionById } from "@/data/transactions-core";
import type { Database } from "@/db/client";

import { claimPendingWrites, releasePendingWrites } from "./widget-bridge";

const walletPushSchema = z.object({
    card: z.string().optional(),
    pickCard: z.boolean().optional(),
    walletWrite: z.string(),
});

let handled: string | null = null;

export function useWalletPushTaps(db: Database, ready: boolean): void {
    const router = useRouter();

    useEffect(() => {
        if (!ready) {
            return;
        }
        let disposed = false;
        const open = async (response: NotificationResponse | null) => {
            const parsed = walletPushSchema.safeParse(response?.notification.request.content.data);
            const id = response?.notification.request.identifier;
            if (!parsed.success || id == null || id === handled) {
                return;
            }
            const settle = async () => {
                await drainPendingWrites(db, claimPendingWrites, releasePendingWrites).catch((error) => {
                    console.warn("[outlayr] pending writes failed to apply", error);
                });
                await fileWaitingPurchases(db).catch((error) => {
                    console.warn("[outlayr] waiting purchases failed to file", error);
                });
                return pendingWriteTxId(db, parsed.data.walletWrite);
            };
            const txId = (await settle()) ?? (await settle());
            const { card, pickCard } = parsed.data;
            const unattached = txId !== null && getTransactionById(db, txId)?.accountId == null;
            const asks = pickCard === true && unattached && (card === undefined || (await cardStillAsks(db, card)));
            let target: Href | null = null;
            if (asks) {
                target = "/settings/integrations";
            } else if (txId) {
                target = `/transactions/${txId}`;
            }
            if (disposed || id === handled || target === null) {
                return;
            }
            router.navigate(target);
            handled = id;
            clearLastNotificationResponse();
        };
        const handle = (response: NotificationResponse | null) => {
            open(response).catch((error) => {
                console.warn("[outlayr] wallet push tap failed", error);
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
