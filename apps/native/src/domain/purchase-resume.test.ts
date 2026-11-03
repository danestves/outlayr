import { describe, expect, it } from "vite-plus/test";

import { purchaseResume } from "./purchase-resume";

const intent = { kind: "monthly", trigger: "first_entry" } as const;
const free = { kind: "free", pending: false } as const;
const signedIn = { accountId: "acct", entitlement: free, intent, onTabs: true, pathname: "/" } as const;

describe("purchaseResume", () => {
    it("keeps a signed-out intent only while the sign-in it started is on screen", () => {
        const signedOut = { ...signedIn, accountId: null, onTabs: false };
        expect(purchaseResume({ ...signedOut, pathname: "/settings/account" })).toBeNull();
        expect(purchaseResume({ ...signedOut, pathname: "/settings/email" })).toBeNull();
        expect(purchaseResume({ ...signedOut, pathname: "/settings" })).toBe("drop");
        expect(purchaseResume({ ...signedOut, onTabs: true, pathname: "/" })).toBe("drop");
    });

    it("hands the purchase on once the tabs are back and the entitlement settles free", () => {
        expect(purchaseResume(signedIn)).toBe("open");
        expect(purchaseResume({ ...signedIn, entitlement: { kind: "free", pending: true } })).toBeNull();
        expect(purchaseResume({ ...signedIn, entitlement: { kind: "unresolved", pending: false } })).toBeNull();
        expect(purchaseResume({ ...signedIn, onTabs: false, pathname: "/settings/account" })).toBeNull();
    });

    it("drops it when the account already has Pro or a signed-in paywall can take the tap itself", () => {
        expect(purchaseResume({ ...signedIn, entitlement: { kind: "pro", mirrored: false, pending: false } })).toBe(
            "drop"
        );
        expect(purchaseResume({ ...signedIn, onTabs: false, pathname: "/paywall" })).toBe("drop");
    });
});
