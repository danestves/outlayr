// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import type { AuthGate } from "@/domain/auth-gate";

import { usePostHogIdentity } from "./posthog-identity";

const mockSession: { accountId: string | null; gate: AuthGate } = { accountId: null, gate: "restoring" };
const mockIds = { anonymous: "anon-1", distinct: "anon-1", holdReady: false, initialized: false };
let mockReleaseReady: () => void = () => undefined;
const mockIdentify = vi.fn((id: string) => {
    mockIds.distinct = id;
});
const mockReset = vi.fn(() => {
    mockIds.anonymous = "anon-2";
    mockIds.distinct = "anon-2";
});
const readId = (id: string) => (mockIds.initialized ? id : "");

vi.mock("@/lib/auth-session", () => ({
    useAuthSession: () => ({ accountId: mockSession.accountId, gate: mockSession.gate }),
}));
vi.mock("@/lib/posthog", () => ({
    posthog: {
        getAnonymousId: () => readId(mockIds.anonymous),
        getDistinctId: () => readId(mockIds.distinct),
        identify: (id: string) => mockIdentify(id),
        ready: () =>
            new Promise<void>((resolve) => {
                mockReleaseReady = () => {
                    mockIds.initialized = true;
                    resolve();
                };
                if (!mockIds.holdReady) {
                    mockReleaseReady();
                }
            }),
        reset: () => mockReset(),
    },
}));

function setSession(accountId: string | null, gate: AuthGate) {
    mockSession.accountId = accountId;
    mockSession.gate = gate;
}

beforeEach(() => {
    mockIdentify.mockClear();
    mockReset.mockClear();
    mockIds.anonymous = "anon-1";
    mockIds.distinct = "anon-1";
    mockIds.holdReady = false;
    mockIds.initialized = false;
    setSession(null, "restoring");
});

describe("usePostHogIdentity", () => {
    it("identifies the account once the session is signed in", async () => {
        const { rerender } = await renderHook(usePostHogIdentity);
        setSession("acct-1", "signed-in");
        await rerender(undefined);
        expect(mockIdentify).toHaveBeenCalledWith("acct-1");
        expect(mockReset).not.toHaveBeenCalled();
    });

    it("resets when an identified session signs out", async () => {
        const { rerender } = await renderHook(usePostHogIdentity);
        setSession("acct-1", "signed-in");
        await rerender(undefined);
        setSession(null, "signed-out");
        await rerender(undefined);
        await waitFor(() => {
            expect(mockReset).toHaveBeenCalledOnce();
        });
    });

    it("resets on a signed-out launch that still carries a persisted identity, once the SDK is ready", async () => {
        mockIds.distinct = "acct-1";
        setSession(null, "signed-out");
        await renderHook(usePostHogIdentity);
        await waitFor(() => {
            expect(mockReset).toHaveBeenCalledOnce();
        });
    });

    it("does not reset when the session signs in before the SDK is ready", async () => {
        mockIds.distinct = "acct-1";
        mockIds.holdReady = true;
        const { rerender } = await renderHook(usePostHogIdentity);
        setSession(null, "signed-out");
        await rerender(undefined);
        setSession("acct-1", "signed-in");
        await rerender(undefined);
        await act(async () => {
            mockReleaseReady();
        });
        expect(mockReset).not.toHaveBeenCalled();
        expect(mockIdentify).toHaveBeenCalledWith("acct-1");
    });

    it("keeps the anonymous id across a signed-out launch", async () => {
        const { rerender } = await renderHook(usePostHogIdentity);
        setSession(null, "signed-out");
        await rerender(undefined);
        expect(mockReset).not.toHaveBeenCalled();
    });

    it("ignores the provisional null while a signed-in user re-authenticates", async () => {
        const { rerender } = await renderHook(usePostHogIdentity);
        setSession("acct-1", "signed-in");
        await rerender(undefined);
        setSession(null, "restoring");
        await rerender(undefined);
        setSession("acct-1", "signed-in");
        await rerender(undefined);
        expect(mockReset).not.toHaveBeenCalled();
    });
});
