import * as Effect from "effect/Effect";
import { describe, expect, it } from "vite-plus/test";

import { verifySignature } from "./signature";

const SECRET = "whsec_banking_test";
const NOW_MS = 1_800_000_000_000;
const NOW_SECONDS = NOW_MS / 1000;

const hex = (buffer: ArrayBuffer) =>
    Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");

const sign = async (secret: string, body: string, timestamp = NOW_SECONDS) => {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { hash: "SHA-256", name: "HMAC" }, false, [
        "sign",
    ]);
    return hex(await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${body}`)));
};

const header = (timestamp: number, ...digests: string[]) =>
    [`t=${timestamp}`, ...digests.map((digest) => `v1=${digest}`)].join(",");

const verify = (signed: string, body: string, nowMs = NOW_MS) =>
    Effect.runPromise(verifySignature(SECRET, signed, body, nowMs));

const BODY = '{"id":"evt_banking","type":"financial_connections.account.reactivated"}';

describe("verifySignature", () => {
    it("accepts a digest signed with the shared secret", async () => {
        await expect(verify(header(NOW_SECONDS, await sign(SECRET, BODY)), BODY)).resolves.toBeTruthy();
    });

    it("rejects a digest signed with another secret", async () => {
        await expect(verify(header(NOW_SECONDS, await sign("whsec_other", BODY)), BODY)).resolves.toBeFalsy();
    });

    it("rejects a body that changed after signing", async () => {
        const signed = header(NOW_SECONDS, await sign(SECRET, BODY));
        await expect(verify(signed, `${BODY} `)).resolves.toBeFalsy();
    });

    it("rejects a timestamp more than five minutes old", async () => {
        const stale = NOW_SECONDS - 301;
        await expect(verify(header(stale, await sign(SECRET, BODY, stale)), BODY)).resolves.toBeFalsy();
    });

    it("accepts a header with an extra digest when any one matches", async () => {
        const signed = header(NOW_SECONDS, await sign("whsec_old", BODY), await sign(SECRET, BODY));
        await expect(verify(signed, BODY)).resolves.toBeTruthy();
    });

    it("rejects a header carrying a second timestamp", async () => {
        const signed = `t=${NOW_SECONDS - 3600},${header(NOW_SECONDS, await sign(SECRET, BODY))}`;
        await expect(verify(signed, BODY)).resolves.toBeFalsy();
    });

    it("rejects a malformed header", async () => {
        await expect(verify("garbage", BODY)).resolves.toBeFalsy();
    });
});
