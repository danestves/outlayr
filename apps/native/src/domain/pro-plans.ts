import { decimalsFor } from "@outlayr/money/currency";
import { roundMoney } from "@outlayr/money/round";
import type { PurchasesPackage } from "react-native-purchases";

import { trialEligible } from "@/lib/trial-eligibility";

export interface Plan {
    kind: PlanKind;
    offer: PurchasesPackage;
    perMonth: string | null;
    priceString: string;
    savingsPercent: number | null;
    trialDays: number | null;
}

const ORDER = ["annual", "monthly", "lifetime"] as const;

export type PlanKind = (typeof ORDER)[number];

function kindOf(packageType: string): PlanKind | null {
    const lowered = packageType.toLowerCase();
    return ORDER.find((kind) => kind === lowered) ?? null;
}

const DAYS_PER_UNIT = new Map<string, number>([
    ["DAY", 1],
    ["WEEK", 7],
]);

function trialDaysOf(offer: PurchasesPackage, eligible: ReadonlySet<string>): number | null {
    const intro = offer.product.introPrice;
    if (intro === null || intro.price > 0 || !trialEligible(offer, eligible)) {
        return null;
    }
    const perUnit = DAYS_PER_UNIT.get(intro.periodUnit.toUpperCase());
    return perUnit === undefined ? null : perUnit * intro.periodNumberOfUnits;
}

function savingsAgainstMonthly(annual: PurchasesPackage, monthly: PurchasesPackage | undefined): number | null {
    if (monthly === undefined) {
        return null;
    }
    const twelveMonths = monthly.product.price * 12;
    if (twelveMonths <= 0) {
        return null;
    }
    const saved = Math.round((1 - annual.product.price / twelveMonths) * 100);
    return saved > 0 ? saved : null;
}

export function readPlans(
    packages: readonly PurchasesPackage[],
    eligibleForTrial: ReadonlySet<string> = new Set()
): Plan[] {
    const byKind = new Map<PlanKind, PurchasesPackage>();
    for (const offer of packages) {
        const kind = kindOf(offer.packageType);
        if (kind !== null && !byKind.has(kind)) {
            byKind.set(kind, offer);
        }
    }

    const monthly = byKind.get("monthly");
    return ORDER.flatMap((kind) => {
        const offer = byKind.get(kind);
        if (offer === undefined) {
            return [];
        }
        return [
            {
                kind,
                offer,
                perMonth: offer.product.pricePerMonthString,
                priceString: offer.product.priceString,
                savingsPercent: kind === "annual" ? savingsAgainstMonthly(offer, monthly) : null,
                trialDays: trialDaysOf(offer, eligibleForTrial),
            },
        ];
    });
}

export interface ProCost {
    currency: string;
    monthly: number;
}

export function heldPlan(plans: readonly Plan[], productId: string | null): Plan | null {
    if (productId === null) {
        return null;
    }
    return plans.find((plan) => plan.kind !== "lifetime" && plan.offer.product.identifier === productId) ?? null;
}

export function monthlyCost({ kind, offer }: Plan): ProCost {
    const { currencyCode, price } = offer.product;
    return {
        currency: currencyCode,
        monthly: kind === "annual" ? roundMoney(price / 12, decimalsFor(currencyCode)) : price,
    };
}
