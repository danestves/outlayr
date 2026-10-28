import type { PurchasesPackage } from "react-native-purchases";
import { describe, expect, it } from "vite-plus/test";

import { readPlans } from "./pro-plans";

interface FakeOffer {
    intro?: { price: number; periodNumberOfUnits: number; periodUnit: string };
    perMonth?: string | null;
    price: number;
    type: string;
}

function offer({ type, price, perMonth = null, intro }: FakeOffer): PurchasesPackage {
    // SAFETY: `readPlans` reads only `packageType` and the four product fields set here.
    return {
        identifier: type,
        packageType: type,
        product: {
            identifier: type,
            introPrice: intro ?? null,
            price,
            pricePerMonthString: perMonth,
            priceString: `$${price.toFixed(2)}`,
        },
    } as unknown as PurchasesPackage;
}

const ANNUAL = offer({
    intro: { periodNumberOfUnits: 7, periodUnit: "DAY", price: 0 },
    perMonth: "$4.17",
    price: 49.99,
    type: "ANNUAL",
});
const MONTHLY = offer({ price: 7.99, type: "MONTHLY" });
const LIFETIME = offer({ price: 129.99, type: "LIFETIME" });

describe("readPlans", () => {
    it("orders yearly, monthly, lifetime whatever order the offering returned", () => {
        const plans = readPlans([LIFETIME, MONTHLY, ANNUAL]);
        expect(plans.map((plan) => plan.kind)).toStrictEqual(["annual", "monthly", "lifetime"]);
    });

    it("renders only the packages the offering actually carries", () => {
        expect(readPlans([MONTHLY]).map((plan) => plan.kind)).toStrictEqual(["monthly"]);
        expect(readPlans([])).toStrictEqual([]);
    });

    it("drops package types the sheet has no row for", () => {
        expect(readPlans([offer({ price: 24.99, type: "SIX_MONTH" }), MONTHLY]).map((p) => p.kind)).toStrictEqual([
            "monthly",
        ]);
    });

    it("prices the yearly saving against twelve months of the monthly plan", () => {
        const [annual] = readPlans([ANNUAL, MONTHLY], new Set(["ANNUAL"]));
        expect(annual?.savingsPercent).toBe(48);
    });

    it("claims no saving when there is no monthly plan to beat", () => {
        const [annual] = readPlans([ANNUAL]);
        expect(annual?.savingsPercent).toBeNull();
    });

    it("claims no saving when the yearly plan is not actually cheaper", () => {
        const [annual] = readPlans([offer({ price: 120, type: "ANNUAL" }), offer({ price: 7.99, type: "MONTHLY" })]);
        expect(annual?.savingsPercent).toBeNull();
    });

    it("reads a free intro period as a trial, in days", () => {
        expect(readPlans([ANNUAL], new Set(["ANNUAL"]))[0]?.trialDays).toBe(7);
        const weekly = offer({
            intro: { periodNumberOfUnits: 2, periodUnit: "WEEK", price: 0 },
            price: 49.99,
            type: "ANNUAL",
        });
        expect(readPlans([weekly], new Set(["ANNUAL"]))[0]?.trialDays).toBe(14);
    });

    it("claims a trial only for a product the store confirmed as eligible", () => {
        expect(readPlans([ANNUAL], new Set(["MONTHLY"]))[0]?.trialDays).toBeNull();
        expect(readPlans([ANNUAL])[0]?.trialDays).toBeNull();
    });

    it("claims no trial for a period it cannot state exactly in days", () => {
        const monthly = offer({
            intro: { periodNumberOfUnits: 1, periodUnit: "MONTH", price: 0 },
            price: 49.99,
            type: "ANNUAL",
        });
        expect(readPlans([monthly], new Set(["ANNUAL"]))[0]?.trialDays).toBeNull();
    });

    it("does not call a discounted intro period free", () => {
        const discounted = offer({
            intro: { periodNumberOfUnits: 7, periodUnit: "DAY", price: 0.99 },
            price: 49.99,
            type: "ANNUAL",
        });
        expect(readPlans([discounted], new Set(["ANNUAL"]))[0]?.trialDays).toBeNull();
    });
});
