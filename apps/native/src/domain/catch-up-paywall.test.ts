import { describe, expect, it } from "vite-plus/test";

import { catchUpPaywallDue } from "./catch-up-paywall";

const due = {
    arriving: false,
    locked: true,
    onLog: true,
    onTabs: true,
    reviewPending: false,
    savedThisSession: true,
    seen: false,
    transactions: 2,
    updateDue: false,
};

describe("catchUpPaywallDue", () => {
    it("never reaches a device that already saw a paywall or is Pro", () => {
        expect(catchUpPaywallDue(due)).toBe(true);
        expect(catchUpPaywallDue({ ...due, seen: true })).toBe(false);
        expect(catchUpPaywallDue({ ...due, locked: false })).toBe(false);
    });

    it("leaves the first entry to the account offer", () => {
        expect(catchUpPaywallDue({ ...due, transactions: 1 })).toBe(false);
    });

    it("waits for the update sheet, the review prompt and the arrival mark on the Log", () => {
        expect(catchUpPaywallDue({ ...due, updateDue: true })).toBe(false);
        expect(catchUpPaywallDue({ ...due, reviewPending: true })).toBe(false);
        expect(catchUpPaywallDue({ ...due, arriving: true })).toBe(false);
        expect(catchUpPaywallDue({ ...due, arriving: true, onLog: false })).toBe(true);
    });
});
