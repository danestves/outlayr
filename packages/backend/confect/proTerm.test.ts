import { describe, expect, it } from "vite-plus/test";

import { planOfStoreProduct, proTermOf } from "./proTerm";

const NOW = Date.parse("2026-11-08T00:00:00Z");
const LATER = "2026-12-08T00:00:00Z";
const EARLIER = "2026-10-08T00:00:00Z";

const subscriber = (
    subscription: { period_type?: string; unsubscribe_detected_at?: string },
    expires: string | null = LATER
) => ({
    entitlements: { pro: { expires_date: expires, product_identifier: "price_1" } },
    subscriptions: { price_1: { price: { amount: 3.9, currency: "USD" }, store: "stripe", ...subscription } },
});

describe(proTermOf, () => {
    it("reads a never-paid subscriber as no Pro", () => {
        expect(proTermOf({ entitlements: {}, subscriptions: {} }, NOW).state).toBe("none");
    });

    it("tells renews, trial and cancelled apart while Pro is held", () => {
        expect(proTermOf(subscriber({ period_type: "normal" }), NOW).state).toBe("renews");
        expect(proTermOf(subscriber({ period_type: "trial" }), NOW).state).toBe("trial");
        expect(proTermOf(subscriber({ period_type: "trial", unsubscribe_detected_at: EARLIER }), NOW).state).toBe(
            "ends"
        );
    });

    it("ends Pro at expiry unless a billing grace period still holds it", () => {
        expect(proTermOf(subscriber({}, EARLIER), NOW)).toMatchObject({
            expiresAtMs: Date.parse(EARLIER),
            state: "ended",
        });
        const grace = {
            entitlements: {
                pro: { expires_date: EARLIER, grace_period_expires_date: LATER, product_identifier: "price_1" },
            },
        };
        expect(proTermOf(grace, NOW).state).toBe("renews");
    });

    it("treats no expiry as lifetime and finds its store", () => {
        const lifetime = {
            entitlements: { pro: { expires_date: null, product_identifier: "pro_lifetime" } },
            non_subscriptions: { pro_lifetime: [{ store: "play_store" }] },
        };
        expect(proTermOf(lifetime, NOW)).toMatchObject({ state: "lifetime", store: "play_store" });
    });
});

describe(planOfStoreProduct, () => {
    it("reads the plan from App Store and Play ids, and not from an opaque one", () => {
        expect(planOfStoreProduct("com.tryoutlayr.app.pro.annual")).toBe("annual");
        expect(planOfStoreProduct("pro:monthly")).toBe("monthly");
        expect(planOfStoreProduct("outlayr_premium_yearly")).toBe("annual");
        expect(planOfStoreProduct("rc_promo_pro_custom")).toBeNull();
    });
});
