import { describe, expect, it } from "@jest/globals";

import { purchaseNext, restoreNext } from "./purchase-result";

describe("purchaseNext", () => {
    it("stays silent and open when the person cancels the store sheet", () => {
        expect(purchaseNext("cancelled", true)).toStrictEqual({ failure: null, leave: false });
    });

    it("reports a pending sync instead of leaving when Pro is not mirrored yet", () => {
        expect(purchaseNext("pro", false)).toStrictEqual({ failure: "pro.syncPendingBody", leave: false });
    });

    it("leaves only for a mirrored Pro purchase", () => {
        expect(purchaseNext("pro", true)).toStrictEqual({ failure: null, leave: true });
        expect(purchaseNext("unentitled", true)).toStrictEqual({ failure: "pro.unentitledBody", leave: false });
    });
});

describe("restoreNext", () => {
    it("says nothing was restored only when the store had nothing", () => {
        expect(restoreNext(false, true)).toStrictEqual({ failure: "pro.nothingRestoredBody", leave: false });
        expect(restoreNext(true, true)).toStrictEqual({ failure: null, leave: true });
    });

    it("reports a pending sync for a restored entitlement the server has not seen", () => {
        expect(restoreNext(true, false)).toStrictEqual({ failure: "pro.restorePendingBody", leave: false });
    });
});
