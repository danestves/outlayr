import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { importPKCS8, SignJWT } from "jose";

import type { PushTarget } from "../tables/captureKeys";
import type { EnrichmentResult } from "./enrichmentResult";

const APNS_TOPIC = "com.tryoutlayr.app";
const HOSTS = {
    development: "https://api.sandbox.push.apple.com",
    production: "https://api.push.apple.com",
} as const;

// Apple rejects a provider token older than an hour and throttles minting a new one more often than every 20 minutes.
const TOKEN_REUSE_SECONDS = 30 * 60;
const EXPIRY_SECONDS = 60 * 60;
const NONCE_BYTES = 12;

export const PUSH_SECRET = /^[0-9a-f]{64}$/u;
export const DEVICE_TOKEN = /^[0-9a-f]{64,200}$/u;

const FALLBACK_EN = "Your purchase details are ready";
const FALLBACK = new Map([
    ["de", "Details zu deinem Kauf sind da"],
    ["es", "Los detalles de tu compra están listos"],
    ["fr", "Les détails de votre achat sont prêts"],
    ["pt", "Os detalhes da sua compra estão prontos"],
]);

export interface ApnsCredentials {
    readonly keyId: string;
    readonly privateKey: string;
    readonly teamId: string;
}

export interface CaptureAnswer {
    readonly captureId: string;
    readonly locale?: string | undefined;
    readonly name: string;
    readonly result: typeof EnrichmentResult.Type;
}

let minted: { readonly issuedAt: number; readonly keyId: string; readonly token: string } | null = null;

async function providerToken({ keyId, privateKey, teamId }: ApnsCredentials, nowSeconds: number) {
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

export async function capturePushRequest(
    credentials: ApnsCredentials,
    target: typeof PushTarget.Type,
    answer: CaptureAnswer,
    nowSeconds: number
) {
    const sealed = await sealFor(
        target.secret,
        JSON.stringify({ answer: answer.result, id: answer.captureId, name: answer.name })
    );
    const body = {
        aps: {
            alert: { body: FALLBACK.get(answer.locale?.slice(0, 2) ?? "en") ?? FALLBACK_EN, title: "Outlayr" },
            "mutable-content": 1,
            "thread-id": "automation",
        },
        capture: sealed,
    };
    return {
        init: {
            body: JSON.stringify(body),
            headers: {
                authorization: `bearer ${await providerToken(credentials, nowSeconds)}`,
                // The intent posted its own notification under the capture id; this one replaces it.
                "apns-collapse-id": answer.captureId,
                "apns-expiration": String(nowSeconds + EXPIRY_SECONDS),
                "apns-priority": "10",
                "apns-push-type": "alert",
                "apns-topic": APNS_TOPIC,
            },
            method: "POST",
        },
        url: `${HOSTS[target.environment]}/3/device/${target.token}`,
    };
}

const decodeRejection = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Struct({ reason: Schema.String })));

export const rejectionReason = (body: string) => Option.getOrUndefined(decodeRejection(body))?.reason;

export const isDeadToken = (status: number, reason: string | undefined) =>
    status === 410 || (status === 400 && (reason === "BadDeviceToken" || reason === "DeviceTokenNotForTopic"));
