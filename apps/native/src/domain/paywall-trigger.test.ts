import { describe, expect, it } from "vite-plus/test";

import { paywallTriggerOf } from "./paywall-trigger";

describe("paywallTriggerOf", () => {
    it("keeps a known trigger", () => {
        expect(paywallTriggerOf("payoff_plans")).toBe("payoff_plans");
    });

    it("falls back to unknown for a missing, foreign or repeated param", () => {
        expect(paywallTriggerOf(undefined)).toBe("unknown");
        expect(paywallTriggerOf("pro_banner")).toBe("unknown");
        expect(paywallTriggerOf(["sync", "usage"])).toBe("unknown");
    });
});
