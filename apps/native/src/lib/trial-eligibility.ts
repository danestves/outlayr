import type { PurchasesPackage } from "react-native-purchases";

export function trialEligible(offer: PurchasesPackage, eligible: ReadonlySet<string>): boolean {
    return eligible.has(offer.product.identifier);
}
