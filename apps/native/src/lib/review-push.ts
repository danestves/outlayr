import { api } from "@outlayr/backend/convex/_generated/api";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import { getIosPushNotificationServiceEnvironmentAsync } from "expo-application";
import { Platform } from "react-native";

import { captureDeviceLabel } from "./capture-lookup";
import { cloudMutation, cloudQuery, isCloudAccount } from "./convex";
import { sharedStore } from "./shared-store";

const REVIEW_PUSH_KEY = "reviewPush";

const REVIEW_PUSH_DEVICE_KEY = "reviewPushDevice";

// The target is this install's APNs token, so the opt-out has to outlive every ledger on the phone.
const REVIEW_ALERTS_OFF_KEY = "reviewAlertsOff";

// APNs registration never settles on a phone that can't reach Apple.
const TOKEN_WAIT = Duration.seconds(10);

const clearTarget = (deviceId: string) => cloudMutation(api.reviewPush.clearTarget, { deviceId });

type Store = NonNullable<typeof sharedStore>;

// Opt-out and sign-out bump it, so a registration still waiting on APNs can't land after them.
let removals = 0;

export const reviewRemovals = (): number => removals;

export const reviewAlertsOn = (): boolean => sharedStore === null || sharedStore.get(REVIEW_ALERTS_OFF_KEY) === null;

export const setReviewAlerts = (on: boolean): void => {
    if (sharedStore === null) {
        return;
    }
    if (on) {
        sharedStore.remove(REVIEW_ALERTS_OFF_KEY);
        return;
    }
    removals += 1;
    sharedStore.set(REVIEW_ALERTS_OFF_KEY, "1");
};

const registeredElsewhere = (store: Store, address: string, deviceId: string) =>
    store.get(REVIEW_PUSH_KEY) !== address || store.get(REVIEW_PUSH_DEVICE_KEY) !== deviceId;

const clearRegistered = Effect.fn("ReviewPush.clearRegistered")(function* clearRegistered(store: Store) {
    const deviceId = store.get(REVIEW_PUSH_DEVICE_KEY);
    if (deviceId !== null) {
        yield* clearTarget(deviceId);
    }
    store.remove(REVIEW_PUSH_KEY);
    store.remove(REVIEW_PUSH_DEVICE_KEY);
});

/**
 * Registers this phone for "entries to review" after a bank sync: signed in, alerts on, notifications granted and a
 * bank still linked. Any other state clears a target it once set.
 */
export const syncReviewPush = Effect.fn("ReviewPush.sync")(
    function* syncReviewPush() {
        const started = removals;
        // Per install, not the ledger's sync id: a profile switch must not leave a second target behind.
        const deviceId = Platform.OS === "ios" ? captureDeviceLabel() : undefined;
        if (sharedStore === null || deviceId === undefined) {
            return;
        }
        const store = sharedStore;
        if (!(isCloudAccount() && reviewAlertsOn())) {
            yield* clearRegistered(store);
            return;
        }
        // On demand: importing expo-notifications starts its token side effects in every suite that reaches this file.
        const notifications = yield* Effect.tryPromise(() => import("expo-notifications"));
        if (!(yield* Effect.tryPromise(() => notifications.getPermissionsAsync())).granted) {
            yield* clearRegistered(store);
            return;
        }
        // A failed read can't tell a linked bank from none, and clearing here would unregister on every outage.
        const overview = yield* cloudQuery(api.banking.overview, {}).pipe(Effect.orElseSucceed(() => null));
        if (overview === null) {
            return;
        }
        if (overview.accounts.length === 0) {
            yield* clearRegistered(store);
            return;
        }
        const { data: token } = yield* Effect.tryPromise(() => notifications.getDevicePushTokenAsync()).pipe(
            Effect.timeout(TOKEN_WAIT)
        );
        const environment =
            (yield* Effect.tryPromise(() => getIosPushNotificationServiceEnvironmentAsync())) ??
            (__DEV__ ? "development" : "production");
        const address = `${environment}:${token}`;
        if (!registeredElsewhere(store, address, deviceId) || removals !== started) {
            return;
        }
        if (yield* cloudMutation(api.reviewPush.setTarget, { deviceId, environment, token })) {
            // One client's mutations run in order, so this clear lands after the set it undoes.
            if (removals !== started) {
                yield* clearTarget(deviceId);
                return;
            }
            store.set(REVIEW_PUSH_KEY, address);
            store.set(REVIEW_PUSH_DEVICE_KEY, deviceId);
        }
    },
    Effect.catchCause((cause) => Effect.logWarning("[outlayr] review push not synced", cause))
);

/** Before sign-out, while the session can still clear the target server side. */
export const forgetReviewPush = Effect.fn("ReviewPush.forget")(
    function* forgetReviewPush() {
        removals += 1;
        const store = sharedStore;
        if (store === null) {
            return;
        }
        const cached = store.get(REVIEW_PUSH_DEVICE_KEY);
        // The keys go first so a later account on this phone registers again instead of inheriting the old target.
        store.remove(REVIEW_PUSH_KEY);
        store.remove(REVIEW_PUSH_DEVICE_KEY);
        const installId = Platform.OS === "ios" ? captureDeviceLabel() : undefined;
        for (const deviceId of new Set([cached, installId])) {
            if (deviceId) {
                yield* clearTarget(deviceId);
            }
        }
    },
    Effect.catchCause((cause) => Effect.logWarning("[outlayr] review push target not cleared", cause))
);
