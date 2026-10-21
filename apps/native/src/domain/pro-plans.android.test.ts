import { describe, expect, it } from "@jest/globals";
import type { PurchasesPackage } from "react-native-purchases";

import { readPlans } from "./pro-plans";

const ANNUAL_WITH_FREE_WEEK = {
    identifier: "ANNUAL",
    packageType: "ANNUAL",
    product: {
        defaultOption: { freePhase: {}, introPhase: null },
        identifier: "ANNUAL",
        introPrice: { periodNumberOfUnits: 7, periodUnit: "DAY", price: 0 },
        price: 49.99,
        pricePerMonthString: null,
        priceString: "$49.99",
    },
    // SAFETY: `readPlans` and `trialEligible` read only the fields set here.
} as unknown as PurchasesPackage;

describe("readPlans on Android", () => {
    it("shows the trial Play offered, though RevenueCat reports no product eligible", () => {
        const [annual] = readPlans([ANNUAL_WITH_FREE_WEEK], new Set());

        expect(annual?.trialDays).toBe(7);
    });
});
