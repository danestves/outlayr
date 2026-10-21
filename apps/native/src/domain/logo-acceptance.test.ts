import { describe, expect, it } from "@jest/globals";

import { fingerprint, isRealLogo } from "./logo-acceptance";

function padded(signature: number[], length: number, fill = 0x42): Uint8Array {
    const bytes = new Uint8Array(length).fill(fill);
    bytes.set(signature, 0);
    return bytes;
}

// The exact 726-byte PNG `s2/favicons?sz=128` returns for a domain with no icon: only the fingerprint stops it.
const PLACEHOLDER_BASE64 =
    "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsSAAALEgHS3X78AAACiElEQVQ4EaVTzU8TURCf2tJuS7tQtlRb6UKBIkQwkRRSEzkQgyEc6lkOKgcOph78Y+CgjXjDs2i44FXY9AMTlQRUELZapVlouy3d7kKtb0Zr0MSLTvL2zb75eL838xtTvV6H/xELBptMJojeXLCXyobnyog4YhzXYvmCFi6qVSfaeRdXdrfaU1areV5KykmX06rcvzumjY/1ggkR3Jh+bNf1mr8v1D5bLuvR3qDgFbvbBJYIrE1mCIoCrKxsHuzK+Rzvsi29+6DEbTZz9unijEYI8ObBgXOzlcrx9OAlXyDYKUCzwwrDQx1wVDGg089Dt+gR3mxmhcUnaWeoxwMbm/vzDFzmDEKMMNhquRqduT1KwXiGt0vre6iSeAUHNDE0d26NBtAXY9BACQyjFusKuL2Ry+IPb/Y9ZglwuVscdHaknUChqLF/O4jn3V5dP4mhgRJgwSYm+gV0Oi3XrvYB30yvhGa7BS70eGFHPoTJyQHhMK+F0ZesRVVznvXw5Ixv7/C10moEo6OZXbWvlFAF9FVZDOqEABUMRIkMd8GnLwVWg9/RkJF9sA4oDfYQAuzzjqzwvnaRUFxn/X2ZlmGLXAE7AL52B4xHgqAUqrC1nSNuoJkQtLkdqReszz/9aRvq90NOKdOS1nch8TpL555WDp49f3uAMXhACRjD5j4ykuCtf5PP7Fm1b0DIsl/VHGezzP1KwOiZQobFF9YyjSRYQETRENSlVzI8iK9mWlzckpSSCQHVALmN9Az1euDho9Xo8vKGd2rqooA8yBcrwHgCqYR0kMkWci08t/R+W4ljDCanWTg9TJGwGNaNk3vYZ7VUdeKsYJGFNkfSzjXNrSX20s4/h6kB81/271ghG17l+rPTAAAAAElFTkSuQmCC";

function base64ToBytes(base64: string): Uint8Array {
    const binary = globalThis.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
        // oxlint-disable-next-line unicorn/prefer-code-point -- every char here is one byte of a binary string, and codePointAt widens the element type to `number | undefined`
        bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
}

const PLACEHOLDER_BYTES = base64ToBytes(PLACEHOLDER_BASE64);

const PNG_1KB = padded([0x89, 0x50, 0x4e, 0x47], 1024);
const HTML = new TextEncoder().encode(`<!doctype html><html><body>${"nope ".repeat(200)}</body></html>`);

describe("isRealLogo", () => {
    it("accepts a real png", () => {
        expect(isRealLogo(200, "image/png", PNG_1KB)).toStrictEqual({ ok: true });
    });

    it("accepts a webp, whose signature is split across two offsets", () => {
        const bytes = padded([0x52, 0x49, 0x46, 0x46], 2048);
        bytes.set([0x57, 0x45, 0x42, 0x50], 8);
        expect(isRealLogo(200, "image/webp", bytes)).toStrictEqual({ ok: true });
    });

    it("rejects a non-200, which is how a miss arrives today", () => {
        expect(isRealLogo(404, "image/png", PNG_1KB)).toStrictEqual({
            ok: false,
            reason: "status",
        });
    });

    it("rejects html even when it is served as an image", () => {
        expect(isRealLogo(200, "image/png", HTML)).toStrictEqual({
            ok: false,
            reason: "not-an-image",
        });
    });

    it("rejects a tracker pixel under the size floor", () => {
        expect(isRealLogo(200, "image/png", padded([0x89, 0x50, 0x4e, 0x47], 12))).toStrictEqual({
            ok: false,
            reason: "too-small",
        });
    });

    it("accepts a multi-resolution icon", () => {
        expect(isRealLogo(200, "image/png", padded([0x89, 0x50, 0x4e, 0x47], 300_000))).toStrictEqual({ ok: true });
    });

    it("rejects an oversized payload", () => {
        expect(isRealLogo(200, "image/png", padded([0x89, 0x50, 0x4e, 0x47], 600_000))).toStrictEqual({
            ok: false,
            reason: "too-large",
        });
    });

    it("rejects a json body", () => {
        expect(isRealLogo(200, "application/json", PNG_1KB)).toStrictEqual({
            ok: false,
            reason: "content-type",
        });
    });

    it("rejects the real placeholder even when it arrives as a 200", () => {
        expect(PLACEHOLDER_BYTES).toHaveLength(726);
        expect(fingerprint(PLACEHOLDER_BYTES)).toBe("726:1468888882");
        expect(isRealLogo(200, "image/png", PLACEHOLDER_BYTES)).toStrictEqual({
            ok: false,
            reason: "placeholder",
        });
    });
});
