import * as Effect from "effect/Effect";
import { AndroidImportance, setNotificationChannelAsync } from "expo-notifications";

import { buildWalletPush } from "@/data/wallet-push";
import { translateNow } from "@/i18n/runtime";
import { purchaseListener } from "@/lib/purchase-listener";
import { warnAndContinue } from "@/lib/warn-and-continue";
import type { publishWidgets as iosPublishWidgets } from "@/widgets/publish";

const PUSH_CHANNEL = "purchases";

/** A sibling, not an early return, so the widget layouts stay out of the Android bundle. */
export const publishWidgets: typeof iosPublishWidgets = Effect.fn("Widgets.publish")(function* publishWidgets(db) {
    if (!purchaseListener) {
        return;
    }
    const listener = purchaseListener;
    yield* Effect.gen(function* publish() {
        const push = yield* buildWalletPush(db);
        listener.setSnapshot(JSON.stringify(push));
        yield* Effect.tryPromise(() =>
            setNotificationChannelAsync(PUSH_CHANNEL, {
                importance: AndroidImportance.DEFAULT,
                name: translateNow("settings.wallet.pushChannel"),
            })
        );
    }).pipe(warnAndContinue("[outlayr] wallet push build failed"));
});
