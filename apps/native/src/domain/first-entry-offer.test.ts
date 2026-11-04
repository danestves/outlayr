import { describe, expect, it } from "vite-plus/test";

import { firstEntryOfferDue } from "./first-entry-offer";

const due = {
    arriving: false,
    consentDue: false,
    locked: true,
    onLog: true,
    onTabs: true,
    savedThisSession: true,
    shown: false,
    transactions: 1,
    updateDue: false,
};

describe("firstEntryOfferDue", () => {
    it("waits for the AI consent and update sheets, which open on the same tabs", () => {
        expect(firstEntryOfferDue(due)).toBe(true);
        expect(firstEntryOfferDue({ ...due, consentDue: true })).toBe(false);
        expect(firstEntryOfferDue({ ...due, updateDue: true })).toBe(false);
    });

    it("holds for the arrival mark only while the Log can play it", () => {
        expect(firstEntryOfferDue({ ...due, arriving: true })).toBe(false);
        expect(firstEntryOfferDue({ ...due, arriving: true, onLog: false })).toBe(true);
    });
});
