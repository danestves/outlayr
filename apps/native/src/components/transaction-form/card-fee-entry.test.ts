import { describe, expect, it } from "vite-plus/test";

import { chargedFee, feeInputOf } from "./card-fee-entry";
import type { EntryFee } from "./card-fee-entry";

const SHARED = { categoryId: "fees", note: "Card fee" };
const PLAIN_ROW = { feeForId: null, transferId: null };

const percent: EntryFee = {
    currency: "VES",
    fee: { kind: "percent", min: 5, rate: 0.01 },
    followsPaidVia: false,
};

describe("feeInputOf", () => {
    it("saves what a paid-via fee charged, but the rate of a picked percent", () => {
        expect(feeInputOf({ ...percent, followsPaidVia: true }, PLAIN_ROW, 100, SHARED)).toStrictEqual({
            ...SHARED,
            amount: 5,
            currency: "VES",
            rate: null,
        });
        expect(feeInputOf(percent, PLAIN_ROW, 100, SHARED)).toStrictEqual({
            ...SHARED,
            amount: null,
            currency: "VES",
            rate: 0.01,
        });
    });

    it("saves a flat fee in its own currency", () => {
        const flat: EntryFee = {
            currency: "VES",
            fee: { amount: 2, currency: "USD", kind: "amount" },
            followsPaidVia: false,
        };
        expect(feeInputOf(flat, PLAIN_ROW, 100, SHARED)).toStrictEqual({
            ...SHARED,
            amount: 2,
            currency: "USD",
            rate: null,
        });
    });

    it("leaves transfer and fee rows alone, and clears a plain entry's fee", () => {
        expect(feeInputOf(percent, { feeForId: null, transferId: "t1" }, 100, SHARED)).toBeUndefined();
        expect(feeInputOf(percent, { feeForId: "p1", transferId: null }, 100, SHARED)).toBeUndefined();
        expect(feeInputOf({ ...percent, fee: null }, PLAIN_ROW, 100, SHARED)).toBeNull();
    });
});

describe("chargedFee", () => {
    it("charges nothing it cannot price", () => {
        const foreign: EntryFee = {
            currency: "VES",
            fee: { amount: 2, currency: "USD", kind: "amount" },
            followsPaidVia: true,
        };
        expect(chargedFee(foreign, 100)).toBeNull();
        expect(chargedFee(percent, null)).toBeNull();
        expect(feeInputOf({ ...percent, followsPaidVia: true }, PLAIN_ROW, null, SHARED)).toBeNull();
    });
});
