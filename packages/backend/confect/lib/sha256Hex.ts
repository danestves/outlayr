import * as Effect from "effect/Effect";

export const sha256Hex = Effect.fn("Sha256.hex")(function* sha256Hex(value: string) {
    const bytes = yield* Effect.promise(() => crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
    return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
});
