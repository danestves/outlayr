import { describe, expect, it } from "vite-plus/test";

import { billing } from "./billing";

describe("billing", () => {
    it("links a Play subscription by its subscription id, not its base plan", () => {
        expect(
            billing({ expiresAtMs: 1, familyShared: false, productId: "outlayr_pro:yearly", store: "PLAY_STORE" })
        ).toStrictEqual({
            kind: "subscription",
            manageUrl: "https://play.google.com/store/account/subscriptions?sku=outlayr_pro&package=com.tryoutlayr.app",
            renewsAtMs: 1,
            storeName: "Google Play",
        });
    });

    it("leaves nothing to cancel for family members, lifetime buyers and granted Pro", () => {
        expect(billing({ expiresAtMs: 1, familyShared: true, store: "APP_STORE" }).kind).toBe("family");
        expect(billing({ familyShared: false, store: "APP_STORE" }).kind).toBe("lifetime");
        expect(billing({ expiresAtMs: 1, familyShared: false, store: "PROMOTIONAL" }).kind).toBe("granted");
    });
});
