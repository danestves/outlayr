import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { deletionProvider, runDeletion, settleFinishedDeletion, storedDeletion } from "./account-deletion";
import type { DeletionSteps } from "./account-deletion";

function fakeSteps(overrides: Partial<DeletionSteps> = {}) {
    const after = { authDeleting: "complete", billingErased: "authDeleting", providersRevoked: "purged" } as const;
    let phase: keyof typeof after = "providersRevoked";
    return {
        advance: vi.fn(() => {
            const next = after[phase];
            if (next !== "complete" && next !== "purged") {
                phase = next;
            }
            return Promise.resolve({ phase: next });
        }),
        eraseBilling: vi.fn(() => {
            phase = "billingErased";
            return Promise.resolve({ phase: "billingErased" as const });
        }),
        poll: vi.fn(() => Promise.resolve(null)),
        prepare: vi.fn(() => Promise.resolve({ receiptChallenge: "challenge", resumeSecret: "secret" })),
        revoke: vi.fn(() => Promise.resolve()),
        ...overrides,
    } satisfies DeletionSteps;
}

const memory = new Map<string, string>();

describe("account deletion", () => {
    beforeEach(() => {
        memory.clear();
        vi.stubGlobal("localStorage", {
            getItem: (key: string) => memory.get(key) ?? null,
            removeItem: (key: string) => memory.delete(key),
            setItem: (key: string, value: string) => memory.set(key, value),
        });
    });

    it("revokes first, erases billing only after the purge, and forgets the job when complete", async () => {
        const steps = fakeSteps();

        await runDeletion("google", "user-a", steps);

        expect(steps.revoke).toHaveBeenCalledOnce();
        expect(steps.eraseBilling).toHaveBeenCalledOnce();
        expect(vi.mocked(steps.advance).mock.invocationCallOrder[0]).toBeLessThan(
            vi.mocked(steps.eraseBilling).mock.invocationCallOrder[0] ?? 0
        );
        expect(storedDeletion("user-a")).toBeNull();
    });

    it("keeps the job when a step fails, then resumes it without preparing or revoking again", async () => {
        const failing = fakeSteps({ eraseBilling: vi.fn(() => Promise.reject(new Error("offline"))) });
        await expect(runDeletion("apple", "user-a", failing)).rejects.toThrow("offline");
        expect(storedDeletion("user-a")?.resumeSecret).toBe("secret");

        const resumed = fakeSteps({ poll: vi.fn(() => Promise.resolve({ phase: "purged" as const })) });
        await runDeletion("apple", "user-a", resumed);

        expect(resumed.prepare).not.toHaveBeenCalled();
        expect(resumed.revoke).not.toHaveBeenCalled();
        expect(resumed.eraseBilling).toHaveBeenCalledOnce();
        expect(storedDeletion("user-a")).toBeNull();
    });

    it("prepares a new job when the stored one has expired", async () => {
        memory.set(
            "outlayr-account-deletion",
            JSON.stringify({ provider: "password", receiptChallenge: "old", resumeSecret: "old", userId: "user-a" })
        );
        const steps = fakeSteps();

        await runDeletion("password", "user-a", steps);

        expect(steps.prepare).toHaveBeenCalledOnce();
    });

    it("clears this browser only once a stored job has finished on the server", async () => {
        memory.set(
            "outlayr-account-deletion",
            JSON.stringify({ provider: "password", receiptChallenge: "a", resumeSecret: "a", userId: "user-a" })
        );
        const forgetCopy = vi.fn(() => Promise.resolve());

        await settleFinishedDeletion(() => Promise.resolve({ phase: "purged" }), forgetCopy);
        expect(forgetCopy).not.toHaveBeenCalled();
        expect(storedDeletion("user-a")).not.toBeNull();

        await settleFinishedDeletion(() => Promise.resolve({ phase: "complete" }), forgetCopy);
        expect(forgetCopy).toHaveBeenCalledOnce();
        expect(storedDeletion("user-a")).toBeNull();
    });

    it("never resumes another account's job left in this browser", async () => {
        memory.set(
            "outlayr-account-deletion",
            JSON.stringify({ provider: "password", receiptChallenge: "a", resumeSecret: "a-secret", userId: "user-a" })
        );
        const steps = fakeSteps();

        await runDeletion("password", "user-b", steps);

        expect(steps.poll).not.toHaveBeenCalled();
        expect(steps.prepare).toHaveBeenCalledOnce();
        expect(steps.advance).not.toHaveBeenCalledWith("a-secret");
    });

    it("sends a password account with Apple linked down the Apple path, never skipping its revocation", () => {
        expect(deletionProvider(["credential", "apple", "google"])).toBe("apple");
        expect(deletionProvider(["credential", "google"])).toBe("google");
        expect(deletionProvider(["credential", "notion"])).toBe("password");
    });
});
