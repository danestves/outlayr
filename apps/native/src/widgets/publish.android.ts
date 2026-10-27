import * as Effect from "effect/Effect";
import { AndroidImportance, setNotificationChannelAsync } from "expo-notifications";

import { buildWalletPush } from "@/data/wallet-push";
import { translateNow } from "@/i18n/runtime";
import { purchaseListener } from "@/lib/purchase-listener";
import { warnAndContinue } from "@/lib/warn-and-continue";
import type { publishWidgets as iosPublishWidgets } from "@/widgets/publish";

import EntriesWidget from "./glance/entries";
import OverviewWidget from "./glance/overview";
import { buildAndroidWidgetProps } from "./glance/props";
import TodayWidget from "./glance/today";
import TrendsWidget from "./glance/trends";
import WalletWidget from "./glance/wallet";

const PUSH_CHANNEL = "purchases";

export const publishWidgets: typeof iosPublishWidgets = Effect.fn("Widgets.publish")(function* publishWidgets(db) {
    yield* Effect.gen(function* publish() {
        const props = yield* buildAndroidWidgetProps(db, new Date());
        yield* Effect.sync(() => {
            WalletWidget.updateSnapshot(props.Wallet);
            TodayWidget.updateSnapshot(props.Today);
            OverviewWidget.updateSnapshot(props.Overview);
            EntriesWidget.updateSnapshot(props.Entries);
            TrendsWidget.updateSnapshot(props.Trends);
        });
    }).pipe(warnAndContinue("[outlayr] widget publish failed"));

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
