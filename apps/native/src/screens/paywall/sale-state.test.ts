import { describe, expect, it } from "vite-plus/test";

import { saleStateOf } from "./sale-state";

const OPEN = { failed: false, isPro: false, noCloud: false, plans: [] };

describe("saleStateOf", () => {
    it("names the blocker the screen shows first", () => {
        expect(saleStateOf({ ...OPEN, isPro: true, noCloud: true })).toBe("pro");
        expect(saleStateOf({ ...OPEN, failed: true, noCloud: true })).toBe("no_cloud");
    });

    it("tells a failed load, an empty offering and a load still running apart", () => {
        expect(saleStateOf({ ...OPEN, failed: true, plans: null })).toBe("plans_failed");
        expect(saleStateOf(OPEN)).toBe("no_plans");
        expect(saleStateOf({ ...OPEN, plans: null })).toBe("loading");
        expect(saleStateOf({ ...OPEN, plans: [{}] })).toBe("ready");
    });
});
