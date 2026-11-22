import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { setNotificationCategoryAsync } from "expo-notifications";
import { Platform } from "react-native";

import { translateNow } from "@/i18n/runtime";

export const DETECTED_CHARGE_CATEGORY = "detected-charge";

const opensAppToForeground = Platform.OS === "android";

export const ChargeAction = Schema.Literals(["confirm", "delete"]);
export type ChargeAction = typeof ChargeAction.Type;

export const registerChargeActions = Effect.tryPromise(() =>
    setNotificationCategoryAsync(DETECTED_CHARGE_CATEGORY, [
        {
            buttonTitle: translateNow("settings.wallet.pushConfirm"),
            identifier: "confirm",
            options: { opensAppToForeground },
        },
        {
            buttonTitle: translateNow("common.delete"),
            identifier: "delete",
            options: { isAuthenticationRequired: true, isDestructive: true, opensAppToForeground },
        },
    ])
);
