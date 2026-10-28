import * as Effect from "effect/Effect";
import type { AppleAuthenticationCredential } from "expo-apple-authentication";
import { CryptoDigestAlgorithm } from "expo-crypto";
import { describe, expect, it, vi } from "vite-plus/test";

import { appleCredential } from "./apple-sign-in";

vi.mock<typeof import("expo-apple-authentication")>(import("expo-apple-authentication"), async (importOriginal) => ({
    ...(await importOriginal()),
    signInAsync: vi.fn<typeof import("expo-apple-authentication").signInAsync>(),
}));

vi.mock<typeof import("expo-crypto")>(import("expo-crypto"), async (importOriginal) => ({
    ...(await importOriginal()),
    digestStringAsync: vi.fn<typeof import("expo-crypto").digestStringAsync>(),
    getRandomBytesAsync: vi.fn<typeof import("expo-crypto").getRandomBytesAsync>(),
}));

const apple = vi.mocked(await import("expo-apple-authentication"));
const crypto = vi.mocked(await import("expo-crypto"));

describe("apple-nonce-binds-once", () => {
    it("passes only the SHA-256 nonce to Apple while retaining raw nonce for Better Auth", async () => {
        crypto.getRandomBytesAsync.mockResolvedValue(Uint8Array.from([0, 1, 2]));
        crypto.digestStringAsync.mockResolvedValue("hashed-nonce");
        apple.signInAsync.mockResolvedValue(
            // SAFETY: appleCredential reads these three fields and nothing else off the credential.
            {
                authorizationCode: "authorization-code",
                identityToken: "identity-token",
                user: "apple-subject",
            } as AppleAuthenticationCredential
        );

        await expect(Effect.runPromise(appleCredential())).resolves.toStrictEqual({
            authorizationCode: "authorization-code",
            identityToken: "identity-token",
            nonce: "AAEC",
            providerSubject: "apple-subject",
        });
        expect(crypto.digestStringAsync).toHaveBeenCalledWith(CryptoDigestAlgorithm.SHA256, "AAEC");
        expect(apple.signInAsync).toHaveBeenCalledWith(expect.objectContaining({ nonce: "hashed-nonce" }));
    });
});
