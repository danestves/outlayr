import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { Platform } from "react-native";
import Purchases, { INTRO_ELIGIBILITY_STATUS, LOG_LEVEL } from "react-native-purchases";
import type { CustomerInfo, PurchasesPackage } from "react-native-purchases";

import { ENV } from "@/env";
import { duringHandoff } from "@/lib/app-handoff";
import type { AccountProfile } from "@/lib/auth-session";

const API_KEY = Platform.select({
    android: ENV.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
    ios: ENV.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
});
export const PRO_ENTITLEMENT_ID = "pro";

let configured = false;

type CustomerInfoListener = (customerInfo: CustomerInfo) => void;

export function hasProEntitlement(customerInfo: CustomerInfo | null): boolean {
    return customerInfo?.entitlements.active[PRO_ENTITLEMENT_ID] !== undefined;
}

export function configureRevenueCat(): boolean {
    if (configured) {
        return true;
    }
    if (!API_KEY) {
        return false;
    }
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.WARN : LOG_LEVEL.ERROR);
    Purchases.configure({ apiKey: API_KEY });
    configured = true;
    return true;
}

export function onCustomerInfoUpdated(listener: CustomerInfoListener): () => void {
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
        Purchases.removeCustomerInfoUpdateListener(listener);
    };
}

export class PurchasesError extends Schema.TaggedError<PurchasesError>()("PurchasesError", {
    cause: Schema.Defect(),
}) {
    // oxlint-disable-next-line class-methods-use-this -- one cause, no attribute: the message has nothing on the instance to read
    override get message(): string {
        return "RevenueCat could not complete the request";
    }
}

const sdkCall = <A>(run: () => Promise<A>) =>
    Effect.tryPromise({ catch: (cause) => new PurchasesError({ cause }), try: run });

export const refreshProEntitlement = Effect.fn("RevenueCat.refreshProEntitlement")(function* refreshProEntitlement() {
    return hasProEntitlement(yield* sdkCall(() => Purchases.getCustomerInfo()));
});

/** Null with no active subscription, which includes the one-time lifetime purchase. */
export const managementUrl = Effect.fn("RevenueCat.managementUrl")(function* managementUrl() {
    const customerInfo = yield* sdkCall(() => Purchases.getCustomerInfo());
    return customerInfo.managementURL;
});

export const identifyUser = Effect.fn("RevenueCat.identifyUser")(function* identifyUser(userId: string) {
    const { customerInfo } = yield* sdkCall(() => Purchases.logIn(userId));
    return hasProEntitlement(customerInfo);
});

export const setCustomerProfile = Effect.fn("RevenueCat.setCustomerProfile")(function* setCustomerProfile({
    email,
    name,
}: AccountProfile) {
    yield* Effect.all(
        [sdkCall(() => Purchases.setEmail(email)), sdkCall(() => Purchases.setDisplayName(name.trim() || null))],
        { concurrency: "unbounded", discard: true }
    );
});

export const logOutUser = Effect.fn("RevenueCat.logOutUser")(function* logOutUser() {
    if (yield* sdkCall(() => Purchases.isAnonymous())) {
        return yield* refreshProEntitlement();
    }
    return hasProEntitlement(yield* sdkCall(() => Purchases.logOut()));
});

export const getPackages = Effect.fn("RevenueCat.getPackages")(function* getPackages() {
    const { current } = yield* sdkCall(() => Purchases.getOfferings());
    return current?.availablePackages ?? [];
});

export const eligibleForTrial = Effect.fn("RevenueCat.eligibleForTrial")(function* eligibleForTrial(
    productIds: readonly string[]
) {
    if (productIds.length === 0) {
        return new Set<string>();
    }
    const byProduct = yield* sdkCall(() => Purchases.checkTrialOrIntroductoryPriceEligibility([...productIds]));
    return new Set(
        Object.entries(byProduct)
            .filter(([, value]) => value.status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE)
            .map(([productId]) => productId)
    );
});

export const purchaseAndCheckPro = Effect.fn("RevenueCat.purchaseAndCheckPro")(function* purchaseAndCheckPro(
    pack: PurchasesPackage
) {
    const { customerInfo } = yield* duringHandoff(sdkCall(() => Purchases.purchasePackage(pack)));
    return hasProEntitlement(customerInfo);
});

export const restoreAndCheckPro = Effect.fn("RevenueCat.restoreAndCheckPro")(function* restoreAndCheckPro() {
    return hasProEntitlement(yield* sdkCall(() => Purchases.restorePurchases()));
});

export const purchaseCancelled = Schema.Struct({ userCancelled: Schema.Literal(true) });
