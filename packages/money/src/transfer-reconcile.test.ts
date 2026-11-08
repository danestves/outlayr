import { roundMoney } from "@outlayr/money/round";
import { describe, expect, it } from "vite-plus/test";

import { NO_FEES, savedRate, solveTransfer, transferGap, transferLegs } from "./transfer-reconcile";
import type { TransferValues } from "./transfer-reconcile";

const VES_DECIMALS = 2;
const USD_DECIMALS = 2;
const RATE_DECIMALS = 4;

function sourceFeeCase(overrides: Partial<TransferValues> = {}): TransferValues {
    return { arrived: 5400.15, fees: { destination: 0, source: 2.7 }, rate: 55.5, sent: 100, ...overrides };
}

function destFeeCase(overrides: Partial<TransferValues> = {}): TransferValues {
    return { arrived: 5400, fees: { destination: 150, source: 0 }, rate: 55.5, sent: 100, ...overrides };
}

describe("solveTransfer with a source-side fee", () => {
    it("solves the arrival from what was sent, the fee and the rate", () => {
        expect(solveTransfer(sourceFeeCase(), "arrived", VES_DECIMALS)).toBe(5400.15);
    });

    it("solves what was sent from the arrival", () => {
        expect(solveTransfer(sourceFeeCase(), "sent", USD_DECIMALS)).toBe(100);
    });

    it("solves the fee from the shortfall against the rate", () => {
        expect(solveTransfer(sourceFeeCase(), "source", USD_DECIMALS)).toBe(2.7);
    });

    it("solves the rate from the converted portion, not the total debited", () => {
        expect(solveTransfer(sourceFeeCase(), "rate", USD_DECIMALS)).toBeCloseTo(55.5, 9);
    });
});

describe("solveTransfer with a destination-side fee", () => {
    it("solves the arrival by deducting the fee after conversion", () => {
        expect(solveTransfer(destFeeCase(), "arrived", VES_DECIMALS)).toBe(5400);
    });

    it("solves what was sent from the arrival plus the fee", () => {
        expect(solveTransfer(destFeeCase(), "sent", USD_DECIMALS)).toBe(100);
    });

    it("solves the fee in the destination currency", () => {
        expect(solveTransfer(destFeeCase(), "destination", VES_DECIMALS)).toBe(150);
    });

    it("solves the rate from the pre-fee arrival", () => {
        expect(solveTransfer(destFeeCase(), "rate", VES_DECIMALS)).toBeCloseTo(55.5, 9);
    });
});

describe("solveTransfer rounds a rate to the decimals it was asked for", () => {
    const repeating: TransferValues = { arrived: 33_333.33, fees: NO_FEES, rate: 0, sent: 1000 };

    it("keeps four decimals of a repeating rate", () => {
        expect(solveTransfer(repeating, "rate", RATE_DECIMALS)).toBe(33.3333);
    });

    it("refuses a rate too small to survive the rounding it was asked for", () => {
        const tiny: TransferValues = { arrived: 1, fees: NO_FEES, rate: 0, sent: 1_000_000 };
        expect(solveTransfer(tiny, "rate", RATE_DECIMALS)).toBeNull();
    });
});

describe("solveTransfer refuses the unanswerable", () => {
    it("returns null when the rate is zero and the arrival cannot be divided by it", () => {
        expect(solveTransfer(sourceFeeCase({ rate: 0 }), "sent", USD_DECIMALS)).toBeNull();
    });

    it("returns null when the fee consumes everything sent, leaving no rate to derive", () => {
        expect(
            solveTransfer(sourceFeeCase({ fees: { destination: 0, source: 100 }, sent: 100 }), "rate", USD_DECIMALS)
        ).toBeNull();
    });

    it("returns null when a source fee exceeds what was sent", () => {
        expect(
            solveTransfer(sourceFeeCase({ fees: { destination: 0, source: 150 }, sent: 100 }), "arrived", VES_DECIMALS)
        ).toBeNull();
    });

    it("returns null rather than a non-finite figure", () => {
        expect(solveTransfer(sourceFeeCase({ rate: Number.POSITIVE_INFINITY }), "arrived", VES_DECIMALS)).toBeNull();
    });
});

describe("transferLegs stores movement and leaves the fee outside", () => {
    it("shrinks the outbound leg by a source-side fee", () => {
        expect(transferLegs(sourceFeeCase(), USD_DECIMALS, VES_DECIMALS)).toStrictEqual({
            fromAmount: 97.3,
            toAmount: 5400.15,
        });
    });

    it("grows the inbound leg by a destination-side fee", () => {
        expect(transferLegs(destFeeCase(), USD_DECIMALS, VES_DECIMALS)).toStrictEqual({
            fromAmount: 100,
            toAmount: 5550,
        });
    });

    it("refuses a transfer whose source fee is the whole amount", () => {
        expect(
            transferLegs(
                sourceFeeCase({ fees: { destination: 0, source: 100 }, sent: 100 }),
                USD_DECIMALS,
                VES_DECIMALS
            )
        ).toBeNull();
    });
});

describe("savedRate", () => {
    it("reads a rate saved as the ten-decimal ratio of its legs at full precision", () => {
        expect(savedRate(228_196_944, 8954.32, 0.0000392394)).toBe(8954.32 / 228_196_944);
    });

    it("keeps a typed rate the legs do not reproduce", () => {
        expect(savedRate(160, 157_471.66, 957.1)).toBe(957.1);
    });
});

describe("transferGap surfaces the unexplained difference", () => {
    const shortfall: TransferValues = { arrived: 5400, fees: NO_FEES, rate: 55.5, sent: 100 };

    it("reports the shortfall in the sender's currency while the sender carries the fee", () => {
        expect(transferGap(shortfall, USD_DECIMALS, VES_DECIMALS)).toBe(2.7);
    });

    it("keeps reporting it in the sender's currency once the receiver charges a fee", () => {
        const fees = { destination: 55.5, source: 0 };
        expect(transferGap({ ...shortfall, fees }, USD_DECIMALS, VES_DECIMALS)).toBe(1.7);
    });

    it("reports nothing when the numbers already reconcile", () => {
        expect(transferGap(sourceFeeCase(), USD_DECIMALS, VES_DECIMALS)).toBe(0);
    });

    it("reports a negative gap when more arrived than the rate predicts", () => {
        expect(transferGap({ ...shortfall, arrived: 5600 }, USD_DECIMALS, VES_DECIMALS)).toBe(-0.9);
    });

    it("reports nothing when the difference is only the arrival rounded to its own cents", () => {
        const bolivares: TransferValues = { arrived: 27.68, fees: NO_FEES, rate: 1 / 36.1234, sent: 1000 };
        expect(transferGap(bolivares, VES_DECIMALS, USD_DECIMALS)).toBe(0);
    });

    it("reports nothing on its own arrival when that arrival sits on a half cent", () => {
        for (const entered of [
            { fees: NO_FEES, rate: 1 / 1031.52, sent: 128.94 },
            { fees: NO_FEES, rate: 36.5, sent: 1.05 },
        ]) {
            const arrived = solveTransfer({ ...entered, arrived: 0 }, "arrived", USD_DECIMALS) ?? 0;
            expect(transferGap({ ...entered, arrived }, USD_DECIMALS, USD_DECIMALS)).toBe(0);
        }
    });

    it("leaves only the rate to explain more arriving than was ever converted", () => {
        const values: TransferValues = { ...shortfall, arrived: 5600 };
        expect(solveTransfer(values, "destination", VES_DECIMALS)).toBeNull();
        expect(solveTransfer(values, "rate", RATE_DECIMALS)).toBe(56);
    });
});

describe("resolving a gap as a fee", () => {
    it("takes the dollars lost between Payoneer and a bolívar arrival from the sender", () => {
        const values: TransferValues = { arrived: 157_471.66, fees: NO_FEES, rate: 1031.52, sent: 160 };
        const source = solveTransfer(values, "source", USD_DECIMALS) ?? 0;
        const fees = { destination: 0, source };

        expect(transferGap(values, USD_DECIMALS, VES_DECIMALS)).toBe(7.34);
        expect(source).toBe(7.34);
        expect(transferGap({ ...values, fees }, USD_DECIMALS, VES_DECIMALS)).toBe(0);
        expect(transferLegs({ ...values, fees }, USD_DECIMALS, VES_DECIMALS)).toMatchObject({
            fromAmount: 152.66,
            toAmount: 157_471.66,
        });
    });

    it("closes the gap exactly on either side, at any precision and size", () => {
        for (const [fromDecimals, toDecimals] of [
            [2, 2],
            [2, 0],
            [0, 2],
            [3, 2],
            [2, 3],
        ] as const) {
            for (const rate of [1031.52, 0.0073, 18.5]) {
                for (const amount of [0.01, 1.23, 160, 10_000_000]) {
                    const sent = roundMoney(amount, fromDecimals);
                    const arrived = roundMoney(sent * rate * 0.97, toDecimals);
                    if (sent > 0 && arrived > 0) {
                        for (const feeSide of ["source", "destination"] as const) {
                            const feeDecimals = feeSide === "source" ? fromDecimals : toDecimals;
                            const values: TransferValues = { arrived, fees: NO_FEES, rate, sent };
                            const fee = solveTransfer(values, feeSide, feeDecimals) ?? 0;
                            const fees = { ...NO_FEES, [feeSide]: fee };
                            const legs = transferLegs({ ...values, fees }, fromDecimals, toDecimals);

                            expect(transferGap({ ...values, fees }, fromDecimals, toDecimals)).toBe(0);
                            expect(legs?.toAmount).toBe(
                                feeSide === "source" ? arrived : roundMoney(arrived + fee, toDecimals)
                            );
                            expect(
                                feeSide === "source"
                                    ? roundMoney((legs?.fromAmount ?? 0) + fee, fromDecimals)
                                    : roundMoney((legs?.toAmount ?? 0) - fee, toDecimals)
                            ).toBe(feeSide === "source" ? sent : arrived);
                        }
                    }
                }
            }
        }
    });
});

describe("a fee on each side", () => {
    // Payoneer took $15 sending, Mercantil took $16.05 receiving, $83.95 landed.
    const payoneer: TransferValues = { arrived: 83.95, fees: { destination: 0, source: 15 }, rate: 1, sent: 115 };

    it("names the receiver's charge as the gap left after the sender's fee", () => {
        expect(transferGap(payoneer, USD_DECIMALS, USD_DECIMALS)).toBe(16.05);
        expect(solveTransfer(payoneer, "destination", USD_DECIMALS)).toBe(16.05);
    });

    it("adds the gap to a fee the sender already charged", () => {
        expect(solveTransfer(payoneer, "source", USD_DECIMALS)).toBe(31.05);
    });

    it("moves what neither bank kept", () => {
        const fees = { destination: 16.05, source: 15 };

        expect(transferGap({ ...payoneer, fees }, USD_DECIMALS, USD_DECIMALS)).toBe(0);
        expect(transferLegs({ ...payoneer, fees }, USD_DECIMALS, USD_DECIMALS)).toStrictEqual({
            fromAmount: 100,
            toAmount: 100,
        });
    });

    it("closes a gap measured in dollars with a fee charged in bolívares", () => {
        const bolivares: TransferValues = {
            arrived: 140_000,
            fees: { destination: 0, source: 5 },
            rate: 957.1,
            sent: 160,
        };
        const destination = solveTransfer(bolivares, "destination", VES_DECIMALS) ?? 0;

        expect(destination).toBe(8350.5);
        expect(transferGap({ ...bolivares, fees: { destination, source: 5 } }, USD_DECIMALS, VES_DECIMALS)).toBe(0);
    });
});
