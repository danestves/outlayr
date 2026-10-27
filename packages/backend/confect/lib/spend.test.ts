import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { runEdge } from "./runEdge";
import { budgetCeilingMicros, budgetConfig, estimateMicros, measureMicros } from "./spend";

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("pricing defaults", () => {
    it("a non-numeric env override falls back to the default", async () => {
        vi.stubEnv("GROUNDED_BUDGET_MICROS", "not-a-number");
        await expect(runEdge(budgetCeilingMicros)).resolves.toBe(200_000_000);
    });

    it("an override of zero closes the gate rather than falling back to the default", async () => {
        vi.stubEnv("GROUNDED_BUDGET_MICROS", "0");
        await expect(runEdge(budgetConfig())).resolves.toMatchObject({ rate: 0 });
    });
});

describe(estimateMicros, () => {
    it("raising the search price raises the pre-charge", async () => {
        const before = await runEdge(estimateMicros());
        vi.stubEnv("GROUNDED_SEARCH_PRICE_MICROS", "50000");
        await expect(runEdge(estimateMicros())).resolves.toBeGreaterThan(before);
    });
});

describe(measureMicros, () => {
    it("sums search calls and token usage at the configured unit prices", async () => {
        await expect(runEdge(measureMicros({ inputTokens: 1000, outputTokens: 100 }, 1))).resolves.toBe(
            10_000 + 1000 * 0.1 + 100 * 0.5
        );
    });

    it("undefined token counts contribute zero rather than throwing", async () => {
        await expect(runEdge(measureMicros({ inputTokens: undefined, outputTokens: undefined }, 0))).resolves.toBe(0);
    });
});
