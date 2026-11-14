import { beforeEach, expect, it, vi } from "vite-plus/test";

import { allowAi, allowPlanScan, chooseAiConsent, hasAiConsent, hasPlanScanConsent } from "./ai-consent";

beforeEach(() => {
    const kept = new Map<string, string>();
    vi.stubGlobal("localStorage", {
        getItem: (key: string) => kept.get(key) ?? null,
        removeItem: (key: string) => kept.delete(key),
        setItem: (key: string, value: string) => kept.set(key, value),
    });
});

it("keeps the screenshot import asking after an import's own AI prompt", () => {
    allowAi();
    expect([hasAiConsent(), hasPlanScanConsent()]).toEqual([true, false]);
});

it("takes every consent back from the Settings switch", () => {
    allowAi();
    allowPlanScan();
    chooseAiConsent(false);
    expect([hasAiConsent(), hasPlanScanConsent()]).toEqual([false, false]);
});
