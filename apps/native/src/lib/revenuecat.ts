import { env } from "@outlayr/env/native";
import { Platform } from "react-native";
import Purchases, { INTRO_ELIGIBILITY_STATUS, LOG_LEVEL } from "react-native-purchases";
import type { CustomerInfo, PurchasesPackage } from "react-native-purchases";
import { z } from "zod";

import { duringHandoff } from "@/lib/app-handoff";
import type { AccountProfile } from "@/lib/auth-session";

const API_KEY = Platform.select({
    android: env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
    ios: env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
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

export async function refreshProEntitlement(): Promise<boolean> {
    return hasProEntitlement(await Purchases.getCustomerInfo());
}

/** Null with no active subscription, which includes the one-time lifetime purchase. */
export async function managementUrl(): Promise<string | null> {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.managementURL;
}

export async function identifyUser(userId: string): Promise<boolean> {
    const { customerInfo } = await Purchases.logIn(userId);
    return hasProEntitlement(customerInfo);
}

export async function setCustomerProfile({ email, name }: AccountProfile): Promise<void> {
    await Promise.all([Purchases.setEmail(email), Purchases.setDisplayName(name.trim() || null)]);
}

export async function logOutUser(): Promise<boolean> {
    if (await Purchases.isAnonymous()) {
        return refreshProEntitlement();
    }
    return hasProEntitlement(await Purchases.logOut());
}

export async function getPackages(): Promise<PurchasesPackage[]> {
    const { current } = await Purchases.getOfferings();
    return current?.availablePackages ?? [];
}

export async function eligibleForTrial(productIds: readonly string[]): Promise<Set<string>> {
    if (productIds.length === 0) {
        return new Set();
    }
    const byProduct = await Purchases.checkTrialOrIntroductoryPriceEligibility([...productIds]);
    return new Set(
        Object.entries(byProduct)
            .filter(([, value]) => value.status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE)
            .map(([productId]) => productId)
    );
}

export async function purchaseAndCheckPro(pack: PurchasesPackage): Promise<boolean> {
    const { customerInfo } = await duringHandoff(() => Purchases.purchasePackage(pack));
    return hasProEntitlement(customerInfo);
}

export async function restoreAndCheckPro(): Promise<boolean> {
    return hasProEntitlement(await Purchases.restorePurchases());
}

export const purchaseCancelled = z.object({ userCancelled: z.literal(true) });
