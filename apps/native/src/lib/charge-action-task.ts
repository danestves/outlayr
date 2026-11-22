import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { DEFAULT_ACTION_IDENTIFIER, dismissNotificationAsync, registerTaskAsync } from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";

import { persistDismissal } from "./dismissed-writes";

export const CHARGE_ACTION_TASK = "outlayr-detected-charge-action";

const WalletData = Schema.Struct({ walletWrite: Schema.String });

const decodeWalletData = Schema.decodeUnknownOption(WalletData);
const decodeWalletJson = Schema.decodeUnknownOption(Schema.fromJsonString(WalletData));

const ChargeActionPayload = Schema.Struct({
    actionIdentifier: Schema.String,
    notification: Schema.Struct({
        request: Schema.Struct({
            content: Schema.Struct({
                data: Schema.optional(Schema.Unknown),
                dataString: Schema.optional(Schema.String),
            }),
            identifier: Schema.String,
        }),
    }),
});
type ChargeActionPayload = typeof ChargeActionPayload.Type;
type WalletContent = ChargeActionPayload["notification"]["request"]["content"];

const decodePayload = Schema.decodeUnknownOption(ChargeActionPayload);

function walletWriteOf(content: WalletContent): string | null {
    if (content.data !== undefined) {
        const direct = Option.getOrNull(decodeWalletData(content.data));
        if (direct !== null) {
            return direct.walletWrite;
        }
    }
    if (content.dataString !== undefined) {
        return Option.getOrNull(decodeWalletJson(content.dataString))?.walletWrite ?? null;
    }
    return null;
}

TaskManager.defineTask(CHARGE_ACTION_TASK, async ({ data, error }) => {
    if (error !== null) {
        return;
    }
    const payload = Option.getOrNull(decodePayload(data));
    if (payload === null || payload.actionIdentifier === DEFAULT_ACTION_IDENTIFIER) {
        return;
    }
    try {
        if (payload.actionIdentifier === "delete") {
            const walletWrite = walletWriteOf(payload.notification.request.content);
            if (walletWrite !== null) {
                persistDismissal(walletWrite);
            }
        }
        await dismissNotificationAsync(payload.notification.request.identifier);
    } catch (cause) {
        console.warn("[outlayr] charge action failed", cause);
    }
});

if (Platform.OS === "android") {
    registerTaskAsync(CHARGE_ACTION_TASK).catch((cause) => {
        console.warn("[outlayr] charge action task failed to register", cause);
    });
}
