import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { budgetCeilingMicros, budgetConfig, estimateMicros, measureMicros } from "./spend";

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("pricing defaults", () => {
    it("a non-numeric env override falls back to the default", () => {
        vi.stubEnv("GROUNDED_BUDGET_MICROS", "not-a-number");
        expect(budgetCeilingMicros()).toBe(200_000_000);
    });

    it("an override of zero closes the gate rather than falling back to the default", () => {
        vi.stubEnv("GROUNDED_BUDGET_MICROS", "0");
        expect(budgetConfig().rate).toBe(0);
    });
});

describe(estimateMicros, () => {
    it("raising the search price raises the pre-charge", () => {
        const before = estimateMicros();
        vi.stubEnv("GROUNDED_SEARCH_PRICE_MICROS", "50000");
        expect(estimateMicros()).toBeGreaterThan(before);
    });
});

describe(measureMicros, () => {
    it("sums search calls and token usage at the configured unit prices", () => {
        expect(measureMicros({ inputTokens: 1000, outputTokens: 100 }, 1)).toBe(10_000 + 1000 * 0.1 + 100 * 0.5);
    });

    it("undefined token counts contribute zero rather than throwing", () => {
        expect(measureMicros({ inputTokens: undefined, outputTokens: undefined }, 0)).toBe(0);
    });
});
