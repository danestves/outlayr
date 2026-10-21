// The lazy `require` keeps a top-level native import out, so the data layer still loads under the node test runner.
export function newId(): string {
    // SAFETY: Hermes has no `crypto` in its lib types; the next line checks the asserted shape before calling it.
    const webCrypto = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
    if (webCrypto?.randomUUID) {
        return webCrypto.randomUUID();
    }
    // SAFETY: `require` is untyped and the asserted type is the same module's.
    const expoCrypto = require("expo-crypto") as typeof import("expo-crypto");
    return expoCrypto.randomUUID();
}
