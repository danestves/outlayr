import { describe, expect, it } from "vite-plus/test";

import { checkoutForm } from "./stripe";

const input = {
    appUserId: "user-1",
    customerId: "cus_1",
    priceId: "price_1",
    siteUrl: "https://tryoutlayr.com",
} as const;

describe(checkoutForm, () => {
    it("tags the session and the subscription, or RevenueCat cannot find the buyer on renewal", () => {
        const form = checkoutForm({ ...input, plan: "monthly", trial: false });
        expect(form).toMatchObject({
            "metadata[app_user_id]": "user-1",
            mode: "subscription",
            "subscription_data[metadata][app_user_id]": "user-1",
        });
    });

    it("gives the trial only to an eligible yearly buyer", () => {
        const key = "subscription_data[trial_period_days]";
        expect(checkoutForm({ ...input, plan: "annual", trial: true })).toMatchObject({ [key]: "7" });
        expect(checkoutForm({ ...input, plan: "annual", trial: false })).not.toHaveProperty([key]);
        expect(checkoutForm({ ...input, plan: "monthly", trial: true })).not.toHaveProperty([key]);
    });

    it("sells lifetime as one payment with no subscription fields", () => {
        const form = checkoutForm({ ...input, plan: "lifetime", trial: true });
        expect(form.mode).toBe("payment");
        expect(Object.keys(form).filter((key) => key.startsWith("subscription_data"))).toStrictEqual([]);
    });
});
