import { describe, expect, it } from "vite-plus/test";

import { compactMagnitude } from "./chart";

describe("compactMagnitude", () => {
    it("leaves values under a thousand whole", () => {
        expect(compactMagnitude(0)).toBe("0");
        expect(compactMagnitude(950)).toBe("950");
    });

    it("keeps a tenth below ten, so a one-dollar axis does not repeat its labels", () => {
        expect([0.1, -0.5, -1.1].map((value) => compactMagnitude(value, ","))).toStrictEqual(["0,1", "-0,5", "-1,1"]);
        expect(compactMagnitude(-0.04)).toBe("0");
    });

    it("keeps as many decimals as the gap between labels needs, so a balance under ten cents does too", () => {
        expect([0.088, 0.04, -0.008].map((value) => compactMagnitude(value, ",", 0.048))).toStrictEqual([
            "0,09",
            "0,04",
            "-0,01",
        ]);
    });

    it("switches to k at a thousand and M at a million", () => {
        expect(compactMagnitude(1200)).toBe("1.2k");
        expect(compactMagnitude(15_000)).toBe("15k");
        expect(compactMagnitude(3_000_000)).toBe("3M");
    });

    it("drops a trailing .0 rather than printing it", () => {
        expect(compactMagnitude(2000)).toBe("2k");
        expect(compactMagnitude(1_000_000)).toBe("1M");
    });

    it("keeps one decimal only below the ten-unit mark", () => {
        expect(compactMagnitude(9900)).toBe("9.9k");
        expect(compactMagnitude(99_000)).toBe("99k");
    });

    it("survives a negative without emitting a stray sign inside the unit", () => {
        expect(compactMagnitude(-1500)).toBe("-1.5k");
    });
});
