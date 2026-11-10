import { describe, expect, it } from "vite-plus/test";

import { accountOfferDue } from "./account-offer";

const due = {
    arriving: false,
    held: true,
    onLog: true,
    onTabs: true,
    savedThisSession: true,
    signedOut: true,
    transactions: 1,
    updateDue: false,
};

describe("accountOfferDue", () => {
    it("waits for the update sheet, which opens on the same tabs", () => {
        expect(accountOfferDue(due)).toBe(true);
        expect(accountOfferDue({ ...due, updateDue: true })).toBe(false);
    });

    it("holds for the arrival mark only while the Log can play it", () => {
        expect(accountOfferDue({ ...due, arriving: true })).toBe(false);
        expect(accountOfferDue({ ...due, arriving: true, onLog: false })).toBe(true);
    });

    it("never reaches a device that already answered the offer or signed in", () => {
        expect(accountOfferDue({ ...due, held: false })).toBe(false);
        expect(accountOfferDue({ ...due, signedOut: false })).toBe(false);
    });
});
