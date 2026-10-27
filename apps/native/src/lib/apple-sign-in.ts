import * as Effect from "effect/Effect";
import { AppleAuthenticationScope, signInAsync } from "expo-apple-authentication";
import { CryptoDigestAlgorithm, digestStringAsync, getRandomBytesAsync } from "expo-crypto";

export interface AppleSignInCredential {
    authorizationCode: string;
    identityToken: string;
    nonce: string;
    providerSubject: string;
}

const BASE64_PADDING = /[=]+$/;

function base64Url(bytes: Uint8Array): string {
    let binary = "";
    for (const byte of bytes) {
        binary += String.fromCodePoint(byte);
    }
    return globalThis.btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(BASE64_PADDING, "");
}

export const appleCredential = Effect.fn("AppleSignIn.credential")(function* appleCredential() {
    const nonce = base64Url(yield* Effect.tryPromise(() => getRandomBytesAsync(32)));
    const hashedNonce = yield* Effect.tryPromise(() => digestStringAsync(CryptoDigestAlgorithm.SHA256, nonce));
    const credential = yield* Effect.tryPromise(() =>
        signInAsync({
            nonce: hashedNonce,
            requestedScopes: [AppleAuthenticationScope.FULL_NAME, AppleAuthenticationScope.EMAIL],
        })
    );
    if (!(credential.identityToken && credential.authorizationCode && credential.user)) {
        return null;
    }
    return {
        authorizationCode: credential.authorizationCode,
        identityToken: credential.identityToken,
        nonce,
        providerSubject: credential.user,
    } satisfies AppleSignInCredential;
});
