import { importPKCS8, SignJWT } from "jose";

export const APNS_TOPIC = "com.tryoutlayr.app";

export const APNS_HOSTS = {
    development: "https://api.sandbox.push.apple.com",
    production: "https://api.push.apple.com",
} as const;

// Apple rejects a provider token older than an hour and throttles minting a new one more often than every 20 minutes.
const TOKEN_REUSE_SECONDS = 30 * 60;
const NONCE_BYTES = 12;

export interface ApnsCredentials {
    readonly keyId: string;
    readonly privateKey: string;
    readonly teamId: string;
}

let minted: { readonly issuedAt: number; readonly keyId: string; readonly token: string } | null = null;

export async function providerToken({ keyId, privateKey, teamId }: ApnsCredentials, nowSeconds: number) {
    if (minted?.keyId === keyId && nowSeconds - minted.issuedAt < TOKEN_REUSE_SECONDS) {
        return minted.token;
    }
    const key = await importPKCS8(privateKey, "ES256");
    const token = await new SignJWT({})
        .setProtectedHeader({ alg: "ES256", kid: keyId })
        .setIssuer(teamId)
        .setIssuedAt(nowSeconds)
        .sign(key);
    minted = { issuedAt: nowSeconds, keyId, token };
    return token;
}

const hexBytes = (hex: string) => Uint8Array.from(hex.match(/../gu) ?? [], (pair) => Number.parseInt(pair, 16));

export async function sealFor(secretHex: string, plaintext: string) {
    const key = await crypto.subtle.importKey("raw", hexBytes(secretHex), "AES-GCM", false, ["encrypt"]);
    const nonce = crypto.getRandomValues(new Uint8Array(NONCE_BYTES));
    const sealed = new Uint8Array(
        await crypto.subtle.encrypt({ iv: nonce, name: "AES-GCM" }, key, new TextEncoder().encode(plaintext))
    );
    const combined = new Uint8Array(nonce.length + sealed.length);
    combined.set(nonce);
    combined.set(sealed, nonce.length);
    return btoa(String.fromCodePoint(...combined));
}
