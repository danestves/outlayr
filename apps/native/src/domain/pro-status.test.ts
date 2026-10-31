import { describe, expect, it } from "vite-plus/test";

import { proStatusOf, trialReminderAt } from "./pro-status";

const TRIAL_ENDS = new Date(2026, 10, 7, 21, 30);

describe("proStatusOf", () => {
    it("words a cancelled trial as ending, so no charge is promised", () => {
        const term = { expirationDateMillis: TRIAL_ENDS.getTime(), periodType: "TRIAL" };
        expect(proStatusOf({ ...term, willRenew: true })).toStrictEqual({ kind: "trial", on: TRIAL_ENDS });
        expect(proStatusOf({ ...term, willRenew: false })).toStrictEqual({ kind: "ends", on: TRIAL_ENDS });
        expect(proStatusOf({ expirationDateMillis: null, periodType: "NORMAL", willRenew: false })).toStrictEqual({
            kind: "lifetime",
        });
    });
});

describe("trialReminderAt", () => {
    it("fires two days before the charge at the same wall-clock time, and never in the past", () => {
        expect(trialReminderAt(TRIAL_ENDS, new Date(2026, 10, 1))).toStrictEqual(new Date(2026, 10, 5, 21, 30));
        expect(trialReminderAt(TRIAL_ENDS, new Date(2026, 10, 6))).toBeNull();
    });
});
