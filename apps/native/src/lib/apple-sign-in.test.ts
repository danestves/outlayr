import { describe, expect, it, jest } from "@jest/globals";
import type { AppleAuthenticationCredential } from "expo-apple-authentication";
import { CryptoDigestAlgorithm } from "expo-crypto";

import { appleCredential } from "./apple-sign-in";

jest.mock<typeof import("expo-apple-authentication")>("expo-apple-authentication", () => ({
    ...jest.requireActual<typeof import("expo-apple-authentication")>("expo-apple-authentication"),
    signInAsync: jest.fn<typeof import("expo-apple-authentication").signInAsync>(),
}));

jest.mock<typeof import("expo-crypto")>("expo-crypto", () => ({
    ...jest.requireActual<typeof import("expo-crypto")>("expo-crypto"),
    digestStringAsync: jest.fn<typeof import("expo-crypto").digestStringAsync>(),
    getRandomBytesAsync: jest.fn<typeof import("expo-crypto").getRandomBytesAsync>(),
}));

const apple = jest.mocked(jest.requireMock<typeof import("expo-apple-authentication")>("expo-apple-authentication"));
const crypto = jest.mocked(jest.requireMock<typeof import("expo-crypto")>("expo-crypto"));

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

        await expect(appleCredential()).resolves.toStrictEqual({
            authorizationCode: "authorization-code",
            identityToken: "identity-token",
            nonce: "AAEC",
            providerSubject: "apple-subject",
        });
        expect(crypto.digestStringAsync).toHaveBeenCalledWith(CryptoDigestAlgorithm.SHA256, "AAEC");
        expect(apple.signInAsync).toHaveBeenCalledWith(expect.objectContaining({ nonce: "hashed-nonce" }));
    });
});
