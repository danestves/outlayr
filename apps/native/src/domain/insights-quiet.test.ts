import { describe, expect, it } from "vite-plus/test";

import { quietAlternative } from "./insights-quiet";

describe("quietAlternative", () => {
    it("returns null on a window with no money at all, since there is nowhere to send anyone", () => {
        expect(quietAlternative("spent", { income: 0, spent: 0 })).toBeNull();
        expect(quietAlternative("net", { income: 0, spent: 0 })).toBeNull();
    });

    it("sends a quiet spend window to the income that window did hold", () => {
        expect(quietAlternative("spent", { income: 1200, spent: 0 })).toBe("income");
    });

    it("sends a quiet income window to spent rather than net, because a direction beats a derived figure", () => {
        expect(quietAlternative("income", { income: 0, spent: 900 })).toBe("spent");
    });

    it("sends a quiet net window to whichever direction actually moved", () => {
        expect(quietAlternative("net", { income: 0, spent: 900 })).toBe("spent");
        expect(quietAlternative("net", { income: 1200, spent: 0 })).toBe("income");
    });

    it("prefers spent over income on a window that cancelled out, so the choice never reshuffles", () => {
        expect(quietAlternative("net", { income: 500, spent: 500 })).toBe("spent");
    });

    it("returns null for a one-sided window whose only figure is the promoted one", () => {
        expect(quietAlternative("income", { income: 1200, spent: 0 })).toBeNull();
    });
});
