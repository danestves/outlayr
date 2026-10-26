import { describe, expect, it } from "@jest/globals";

import { EN } from "@/i18n/catalog";
import type { TranslateFn } from "@/i18n/context";
import { translate } from "@/i18n/translate";

import { accountLabel, accountRowValue, isSignInCancellation, signInFailureMessage } from "./account";

const t: TranslateFn = (key, params) => translate(key, { catalog: EN, fallback: EN, params });

describe("account label", () => {
    it("prefers the name the provider gave", () => {
        expect(accountLabel({ email: "ada@example.com", name: "Ada Lovelace" }, t)).toBe("Ada Lovelace");
    });

    it("falls back to the email when the name is blank", () => {
        expect(accountLabel({ email: "ada@example.com", name: "   " }, t)).toBe("ada@example.com");
    });

    it("stays readable when Apple withheld both", () => {
        expect(accountLabel({ email: null, name: null }, t)).toBe("Signed in");
        expect(accountLabel(undefined, t)).toBe("Signed in");
    });
});

describe("settings row value", () => {
    it("names the account once it is known", () => {
        expect(
            accountRowValue(
                {
                    kind: "signed-in",
                    user: { email: "ada@example.com", name: null },
                },
                t
            )
        ).toBe("ada@example.com");
    });

    it("says so plainly when signed out", () => {
        expect(accountRowValue({ kind: "signed-out" }, t)).toBe("Sign in");
    });

    it("shows nothing while the session is still restoring", () => {
        expect(accountRowValue({ kind: "pending" }, t)).toBe("");
    });
});

describe("sign-in cancellation", () => {
    it("recognises a dismissed Apple sheet", () => {
        expect(isSignInCancellation({ code: "ERR_REQUEST_CANCELED" })).toBe(true);
    });

    it("recognises a dismissed Google sheet", () => {
        expect(isSignInCancellation({ code: "SIGN_IN_CANCELLED" })).toBe(true);
    });

    it("does not swallow a real failure", () => {
        expect(isSignInCancellation({ code: "PLAY_SERVICES_NOT_AVAILABLE" })).toBe(false);
        expect(isSignInCancellation(new Error("network down"))).toBe(false);
        expect(isSignInCancellation("ERR_REQUEST_CANCELED")).toBe(false);
    });
});

describe("sign-in failure message", () => {
    it("explains the one cause the user can act on", () => {
        expect(signInFailureMessage({ code: "PLAY_SERVICES_NOT_AVAILABLE" }, t)).toMatch(/Google Play services/);
    });

    it("names what went wrong in the email flow", () => {
        expect(signInFailureMessage({ code: "INVALID_EMAIL_OR_PASSWORD", status: 401 }, t)).toMatch(/don't match/);
        expect(signInFailureMessage({ code: "TOO_MANY_ATTEMPTS_FOR_THIS_EMAIL", status: 429 }, t)).toMatch(
            /Wait a bit/
        );
        expect(
            signInFailureMessage(
                { code: "VALIDATION_ERROR", message: "[body.email] Invalid email address", status: 400 },
                t
            )
        ).toBe("Enter a valid email.");
    });

    it("never shows the provider's own wording, which is developer-facing", () => {
        // Verbatim from a simulator with no Apple account signed in.
        const raw =
            "RequestUnknownException: The authorization attempt failed for an unknown reason (at ExpoAppleAuthentication/AppleAuthenticationExceptions.swift:61)";
        const shown = signInFailureMessage({ message: raw }, t);
        expect(shown).not.toBe(raw);
        expect(shown).not.toMatch(/Exception|\.swift|at Expo/);
    });

    it("never renders an empty or undefined string", () => {
        for (const error of [null, undefined, {}, { message: "  " }, 42]) {
            const message = signInFailureMessage(error, t);
            expect(message.trim().length > 0).toBeTruthy();
            expect(message).not.toMatch(/undefined/);
        }
    });
});
