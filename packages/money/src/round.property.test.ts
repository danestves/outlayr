import { assert, constantFrom, double, integer, property } from "fast-check";
import { describe, expect, it } from "vite-plus/test";

import { decimalsFor } from "./currency";
import { computeAmountUSD } from "./rates";
import { convertFromUsd, roundMoney } from "./round";
import { toScaledInt } from "./scaled-int";

const finiteAmount = double({ max: 1_000_000, min: -1_000_000, noDefaultInfinity: true, noNaN: true });
const places = integer({ max: 6, min: 0 });
const cents = integer({ max: 10_000_000, min: -10_000_000 });
const rate = double({ max: 300, min: 0.01, noDefaultInfinity: true, noNaN: true });
const currency = constantFrom("USD", "EUR", "JPY", "KWD", "VES");

describe("roundMoney", () => {
    it("keeps the requested scale and never leaves the finite range", () => {
        assert(
            property(finiteAmount, places, (value, digits) => {
                const rounded = roundMoney(value, digits);

                expect(Number.isFinite(rounded)).toBeTruthy();
                expect(toScaledInt(rounded).scale).toBeLessThanOrEqual(BigInt(digits));
            })
        );
    });

    it("rounds to a value that is already stable", () => {
        assert(
            property(finiteAmount, places, (value, digits) => {
                const once = roundMoney(value, digits);
                const twice = roundMoney(once, digits);

                expect(twice === 0 ? 0 : twice).toBe(once === 0 ? 0 : once);
            })
        );
    });

    it("never drifts by a whole minor unit", () => {
        assert(
            property(finiteAmount, places, (value, digits) => {
                const rounded = roundMoney(value, digits);

                expect(Math.abs(rounded - value)).toBeLessThanOrEqual(10 ** -digits);
            })
        );
    });
});

describe("a conversion through canonical USD", () => {
    it("comes back to the original amount within one minor unit", () => {
        assert(
            property(cents, rate, currency, (value, exchangeRate, code) => {
                const amount = value / 100;
                const amountUsd = computeAmountUSD({
                    baseAmount: amount,
                    date: "2026-01-15",
                    exchangeRate,
                    exchangeRateType: "official",
                });
                const back = convertFromUsd(amountUsd, exchangeRate, code);

                expect(Number.isFinite(amountUsd)).toBeTruthy();
                expect(Number.isFinite(back)).toBeTruthy();
                expect(Math.abs(back - amount)).toBeLessThanOrEqual(10 ** -decimalsFor(code));
            })
        );
    });
});
