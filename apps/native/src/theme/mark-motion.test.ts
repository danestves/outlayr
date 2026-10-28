import { describe, expect, it } from "vite-plus/test";

import { arrivalFrame, settleFrame } from "./mark-motion";

describe("frame builders run on the UI runtime", () => {
    it.each([
        ["arrivalFrame", arrivalFrame],
        ["settleFrame", settleFrame],
    ])("%s is workletized, so useAnimatedStyle can call it without a remote-function crash", (_name, fn) => {
        expect((fn as unknown as { __workletHash?: number }).__workletHash).toStrictEqual(expect.any(Number));
    });
});

describe("arrivalFrame", () => {
    it("clamps a spring overshoot instead of rendering past the slot", () => {
        expect(arrivalFrame(1.4, 46)).toStrictEqual({ opacity: 1, translateY: 0 });
        expect(arrivalFrame(-0.2, 46)).toStrictEqual({ opacity: 0, translateY: 46 });
    });
});

describe("settleFrame", () => {
    it("lands at true size", () => {
        expect(settleFrame(1, 1.08)).toStrictEqual({ opacity: 1, scale: 1 });
    });

    it("never scales past true size on an overshoot", () => {
        expect(settleFrame(1.3, 1.08).scale).toBe(1);
    });
});
