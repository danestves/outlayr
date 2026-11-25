import * as Effect from "effect/Effect";

const TOLERANCE_SECONDS = 300;
const HEX_DIGEST = /^[0-9a-f]{64}$/;
const SECONDS = /^\d{1,12}$/;

const fromHex = (value: string) => Uint8Array.from(value.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16));

const parseHeader = (header: string) => {
    const timestamps: string[] = [];
    const digests: string[] = [];
    for (const part of header.split(",")) {
        const at = part.indexOf("=");
        if (at === -1) {
            continue;
        }
        const key = part.slice(0, at).trim();
        const value = part.slice(at + 1).trim();
        if (key === "t") {
            timestamps.push(value);
        } else if (key === "v1" && HEX_DIGEST.test(value)) {
            digests.push(value);
        }
    }
    const [timestamp] = timestamps;
    return timestamps.length === 1 && timestamp !== undefined && SECONDS.test(timestamp)
        ? { digests, timestamp }
        : null;
};

// The header is `t=<seconds>,v1=<hex>`, with one extra v1 per secret while a secret is being rolled.
export const verifySignature = Effect.fn("StripeBanking.verifySignature")(function* verifySignature(
    secret: string,
    header: string,
    body: string,
    nowMs: number
) {
    const parsed = parseHeader(header);
    if (parsed === null || parsed.digests.length === 0) {
        return false;
    }
    if (Math.abs(nowMs / 1000 - Number(parsed.timestamp)) > TOLERANCE_SECONDS) {
        return false;
    }
    const encoder = new TextEncoder();
    const key = yield* Effect.promise(() =>
        crypto.subtle.importKey("raw", encoder.encode(secret), { hash: "SHA-256", name: "HMAC" }, false, ["verify"])
    );
    const signed = encoder.encode(`${parsed.timestamp}.${body}`);
    for (const digest of parsed.digests) {
        if (yield* Effect.promise(() => crypto.subtle.verify("HMAC", key, fromHex(digest), signed))) {
            return true;
        }
    }
    return false;
});
