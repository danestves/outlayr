// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { useAnalyticsConsent } from "./posthog-consent";

const mockState: { db: object | null; share: boolean } = { db: null, share: true };
const mockOptIn = vi.fn(async () => undefined);
const mockOptOut = vi.fn(async () => undefined);

vi.mock("@/contexts/local-data-context", () => ({ useLocalData: () => ({ db: mockState.db }) }));
vi.mock("@/data/settings", () => ({ useBoolSetting: () => mockState.share }));
vi.mock("@/lib/posthog", () => ({
    posthog: { optIn: () => mockOptIn(), optOut: () => mockOptOut() },
}));

beforeEach(() => {
    mockOptIn.mockClear();
    mockOptOut.mockClear();
    mockState.db = null;
    mockState.share = true;
});

describe("useAnalyticsConsent", () => {
    it("leaves the SDK's persisted choice alone until the database is open", async () => {
        await renderHook(useAnalyticsConsent);
        expect(mockOptIn).not.toHaveBeenCalled();
        expect(mockOptOut).not.toHaveBeenCalled();
    });

    it("opts out once the stored setting is off", async () => {
        mockState.share = false;
        const { rerender } = await renderHook(useAnalyticsConsent);
        mockState.db = {};
        await rerender(undefined);
        expect(mockOptOut).toHaveBeenCalledOnce();
        expect(mockOptIn).not.toHaveBeenCalled();
    });

    it("opts back in when the setting turns on", async () => {
        mockState.db = {};
        mockState.share = false;
        const { rerender } = await renderHook(useAnalyticsConsent);
        mockState.share = true;
        await rerender(undefined);
        expect(mockOptIn).toHaveBeenCalledOnce();
    });
});
