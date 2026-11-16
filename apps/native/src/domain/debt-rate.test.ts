import { describe, expect, it } from "vite-plus/test";

import { debtTheirSide } from "./debt-rate";

const BCV = 1 / 245;

describe("the person's side of a debt across currencies", () => {
    it("fills it at that day's official rate and keeps that rate", () => {
        expect(debtTheirSide({ amount: 10_000, market: BCV, personCurrency: "USD", typed: 0 })).toStrictEqual({
            rate: { type: "official", personPerAccount: BCV },
            theirAmount: 40.82,
        });
    });

    it("saves what the user typed as their own rate", () => {
        const side = debtTheirSide({ amount: 10_000, market: BCV, personCurrency: "USD", typed: 42 });
        expect(side.theirAmount).toBe(42);
        expect(side.rate?.type).toBe("custom");
        expect(side.rate?.personPerAccount).toBeCloseTo(42 / 10_000, 12);
    });

    it("still reads as official when the typed amount is the one it filled in", () => {
        expect(debtTheirSide({ amount: 10_000, market: BCV, personCurrency: "USD", typed: 40.82 }).rate).toStrictEqual({
            type: "official",
            personPerAccount: BCV,
        });
    });

    it("leaves it empty without a rate, so the debt can't save on a guess", () => {
        expect(debtTheirSide({ amount: 10_000, market: null, personCurrency: "USD", typed: 0 })).toStrictEqual({
            rate: null,
            theirAmount: 0,
        });
    });
});
