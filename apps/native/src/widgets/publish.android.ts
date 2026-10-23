import { AndroidImportance, setNotificationChannelAsync } from "expo-notifications";

import { buildWalletPush } from "@/data/wallet-push";
import { translateNow } from "@/i18n/runtime";
import { purchaseListener } from "@/lib/purchase-listener";
import type { publishWidgets as iosPublishWidgets } from "@/widgets/publish";

const PUSH_CHANNEL = "purchases";

/** A sibling, not an early return, so the widget layouts stay out of the Android bundle. */
export const publishWidgets: typeof iosPublishWidgets = async (db) => {
    if (!purchaseListener) {
        return;
    }
    try {
        purchaseListener.setSnapshot(JSON.stringify(await buildWalletPush(db)));
        await setNotificationChannelAsync(PUSH_CHANNEL, {
            importance: AndroidImportance.DEFAULT,
            name: translateNow("settings.wallet.pushChannel"),
        });
    } catch (error) {
        console.warn("[outlayr] wallet push build failed", error);
    }
};
