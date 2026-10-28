import { describe, expect, it } from "vite-plus/test";

import { LIMIT_STEP, suggestedLimit } from "./budget-limit-step";

describe("the limit a fresh sheet opens on", () => {
    it("snaps that to the step the drag moves in", () => {
        expect(suggestedLimit(519)).toBe(425);
    });

    it("stays at nothing when nothing has been spent, so the keypad opens instead", () => {
        expect(suggestedLimit(0)).toBe(0);
        expect(suggestedLimit(-10)).toBe(0);
    });

    it("never proposes less than one step for a window that did cost something", () => {
        expect(suggestedLimit(1)).toBe(LIMIT_STEP);
    });
});
