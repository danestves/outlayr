import * as Effect from "effect/Effect";
import * as Option from "effect/Option";

const MAX_URL_LENGTH = 2048;
const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const PRIVATE_SUFFIXES = [".localhost", ".local", ".internal", ".lan", ".home.arpa"];

const toHex = (bytes: ArrayBuffer) =>
    Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");

// Stripe's scheme, so receivers can reuse a verifier: HMAC-SHA256 over `${t}.${body}`, `t` in epoch seconds.
export const signatureHeader = Effect.fn("Webhooks.signatureHeader")(function* signatureHeader(
    secret: string,
    timestampSeconds: number,
    body: string
) {
    const encoder = new TextEncoder();
    const key = yield* Effect.promise(() =>
        crypto.subtle.importKey("raw", encoder.encode(secret), { hash: "SHA-256", name: "HMAC" }, false, ["sign"])
    );
    const mac = yield* Effect.promise(() =>
        crypto.subtle.sign("HMAC", key, encoder.encode(`${timestampSeconds}.${body}`))
    );
    return `t=${timestampSeconds},v1=${toHex(mac)}`;
});

function isPublicIpv4(host: string) {
    const match = IPV4.exec(host);
    if (match === null) {
        return null;
    }
    const [a = 0, b = 0] = match.slice(1).map(Number);
    return !(
        a === 0 ||
        a === 10 ||
        a === 127 ||
        a >= 224 ||
        (a === 100 && b >= 64 && b <= 127) ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168)
    );
}

// The server fetches this URL, so anything that names our own network is refused. DNS can still point a public
// name inward; delivery refuses redirects, and the receiver only ever sees the signed body.
export function endpointUrl(raw: string): Option.Option<string> {
    if (raw.length > MAX_URL_LENGTH || !URL.canParse(raw)) {
        return Option.none();
    }
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    const named = host.includes(".") && !host.startsWith("[") && host !== "localhost";
    const ipv4 = isPublicIpv4(host);
    const usable =
        url.protocol === "https:" &&
        url.username === "" &&
        url.password === "" &&
        named &&
        ipv4 !== false &&
        !PRIVATE_SUFFIXES.some((suffix) => host.endsWith(suffix));
    return usable ? Option.some(url.toString()) : Option.none();
}
