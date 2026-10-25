import { describe, expect, it, vi } from "vite-plus/test";

import { grantAppleCredential } from "./providerLifecycle";

const input = {
    authorizationCode: "code",
    identityToken: "identity-token",
    nonce: "raw-nonce",
    providerSubject: "apple-subject",
};

const now = new Date("2026-08-11T12:00:00.000Z");

function dependencies() {
    return {
        exchange: vi.fn().mockResolvedValue({
            accessToken: "access",
            expiresIn: 3600,
            idToken: "exchange-id",
            refreshToken: "refresh",
        }),
        findAppleAccount: vi.fn().mockResolvedValue({
            accessTokenExpiresAt: new Date("2026-08-11T11:00:00.000Z"),
            accountId: "apple-subject",
            id: "account-id",
            refreshToken: "encrypted-existing-refresh",
            updatedAt: new Date("2026-08-10T12:00:00.000Z"),
        }),
        persist: vi.fn().mockResolvedValue(undefined),
        revoke: vi.fn().mockResolvedValue(undefined),
        verify: vi.fn().mockResolvedValue({ subject: "apple-subject" }),
    };
}

describe("apple-capture-exchange-storage", () => {
    it("stores only server-exchanged provider material and expiry after both subject checks", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(now);
        const deps = dependencies();

        await expect(grantAppleCredential("user-id", input, deps)).resolves.toStrictEqual({ active: true });

        expect(deps.verify).toHaveBeenNthCalledWith(1, "identity-token", "raw-nonce");
        expect(deps.exchange).toHaveBeenCalledWith("code");
        expect(deps.verify).toHaveBeenNthCalledWith(2, "exchange-id");
        expect(deps.persist).toHaveBeenCalledWith("account-id", {
            accessToken: "access",
            accessTokenExpiresAt: new Date("2026-08-11T13:00:00.000Z"),
            refreshToken: "refresh",
        });
        vi.useRealTimers();
    });

    it("rejects a linked-subject mismatch and never exchanges or persists", async () => {
        const deps = dependencies();
        deps.findAppleAccount.mockResolvedValue({ accountId: "other-subject", id: "account-id" });

        await expect(grantAppleCredential("user-id", input, deps)).rejects.toThrow("linked Apple account");

        expect(deps.exchange).not.toHaveBeenCalled();
        expect(deps.persist).not.toHaveBeenCalled();
    });

    it("best-effort revokes exchanged material when persistence fails", async () => {
        const deps = dependencies();
        deps.persist.mockRejectedValue(new Error("storage unavailable"));

        await expect(grantAppleCredential("user-id", input, deps)).rejects.toThrow("storage unavailable");

        expect(deps.revoke).toHaveBeenCalledWith("refresh");
    });
});
