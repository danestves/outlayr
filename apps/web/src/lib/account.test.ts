import * as Effect from "effect/Effect";
import { describe, expect, it } from "vite-plus/test";

import { AuthFailure, authRequest, failureMessage, safeRedirect } from "./account";

describe("safeRedirect", () => {
    it("keeps a path on this site, query included", () => {
        expect(safeRedirect("/connect?request=abc")).toBe("/connect?request=abc");
    });

    it.each(["https://evil.example", "//evil.example", "/\\evil.example", "mailto:x@example.com", "", undefined])(
        "sends %j home",
        (target) => {
            expect(safeRedirect(target)).toBe("/");
        }
    );
});

describe("failureMessage", () => {
    it("names a wrong password", () => {
        expect(failureMessage({ code: "INVALID_EMAIL_OR_PASSWORD", status: 401 })).toBe(
            "That email and password don't match."
        );
    });

    it("reports rate limits whatever the code", () => {
        expect(failureMessage({ code: "SOMETHING", status: 429 })).toMatch(/Too many tries/u);
    });

    it("falls back for unknown failures", () => {
        expect(failureMessage()).toBe("Sign-in didn't complete. Try again.");
    });
});

describe("authRequest", () => {
    it("fails with the code and status the auth client returned", async () => {
        const failure = await Effect.runPromise(
            Effect.flip(authRequest(async () => ({ error: { code: "INVALID_OTP", status: 400 } })))
        );
        expect(failure).toEqual(new AuthFailure({ code: "INVALID_OTP", status: 400 }));
    });

    it("turns a rejected call into a failure that gets the generic message", async () => {
        const failure = await Effect.runPromise(Effect.flip(authRequest(() => Promise.reject(new Error("offline")))));
        expect(failureMessage(failure)).toBe("Sign-in didn't complete. Try again.");
    });
});
