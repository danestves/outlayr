type LogoRejection = "status" | "content-type" | "too-small" | "too-large" | "not-an-image" | "placeholder";

export type LogoVerdict = { ok: true } | { ok: false; reason: LogoRejection };

// The smallest real logo measured is amazon.com's at 658 bytes; tracker pixels sit well under. Do not raise it.
const MIN_BYTES = 512;
// Multi-resolution `.ico` files reach a few hundred KB; this bound only stops a hostile host streaming megabytes.
const MAX_BYTES = 524_288;

const PNG = [0x89, 0x50, 0x4e, 0x47];
const JPEG = [0xff, 0xd8, 0xff];
const GIF = [0x47, 0x49, 0x46, 0x38];
const ICO = [0x00, 0x00, 0x01, 0x00];
const RIFF = [0x52, 0x49, 0x46, 0x46];
const WEBP = [0x57, 0x45, 0x42, 0x50];

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
    if (bytes.length < signature.length) {
        return false;
    }
    return signature.every((byte, index) => bytes[index] === byte);
}

function matchesAt(bytes: Uint8Array, offset: number, signature: readonly number[]): boolean {
    if (bytes.length < offset + signature.length) {
        return false;
    }
    return signature.every((byte, index) => bytes[offset + index] === byte);
}

// `content-type` is whatever the server claims; the leading bytes reject an HTML error page served as `image/png`.
function isRasterImage(bytes: Uint8Array): boolean {
    return (
        startsWith(bytes, PNG) ||
        startsWith(bytes, JPEG) ||
        startsWith(bytes, GIF) ||
        startsWith(bytes, ICO) ||
        (startsWith(bytes, RIFF) && matchesAt(bytes, 8, WEBP))
    );
}

function fnv1a32(bytes: Uint8Array): number {
    let hash = 0x81_1c_9d_c5;
    for (const byte of bytes) {
        // oxlint-disable-next-line no-bitwise -- FNV-1a is defined as xor-then-multiply over a 32-bit register
        hash ^= byte;
        // oxlint-disable-next-line no-bitwise -- `>>> 0` is the 32-bit unsigned wrap FNV-1a specifies; `Math.imul` alone leaves a signed result
        hash = Math.imul(hash, 0x01_00_01_93) >>> 0;
    }
    // oxlint-disable-next-line no-bitwise -- the fingerprint is the unsigned 32-bit value, so a negative register must wrap before it is stringified
    return hash >>> 0;
}

// `length:hash`, not a digest: `expo-crypto` is async and `node:crypto` cannot be bundled.
const PLACEHOLDER_FINGERPRINTS: ReadonlySet<string> = new Set(["726:1468888882"]);

export function fingerprint(bytes: Uint8Array): string {
    return `${bytes.length}:${fnv1a32(bytes)}`;
}

export function isRealLogo(status: number, contentType: string | null, bytes: Uint8Array): LogoVerdict {
    if (status !== 200) {
        return { ok: false, reason: "status" };
    }
    if (contentType == null || !contentType.toLowerCase().startsWith("image/")) {
        return { ok: false, reason: "content-type" };
    }
    if (bytes.length < MIN_BYTES) {
        return { ok: false, reason: "too-small" };
    }
    if (bytes.length > MAX_BYTES) {
        return { ok: false, reason: "too-large" };
    }
    if (!isRasterImage(bytes)) {
        return { ok: false, reason: "not-an-image" };
    }
    if (PLACEHOLDER_FINGERPRINTS.has(fingerprint(bytes))) {
        return { ok: false, reason: "placeholder" };
    }
    return { ok: true };
}
