import * as Effect from "effect/Effect";
import { describe, expect, it } from "vite-plus/test";

import { AuthFailure, asServed, authRequest, failureKey, safeRedirect, withoutOneTimeToken } from "./account";

describe("safeRedirect", () => {
    it("keeps a path on this site, query included", () => {
        expect(safeRedirect("/connect?request=abc")).toBe("/connect?request=abc");
    });

    it.each(["https://evil.example", "//evil.example", "/\\evil.example", "mailto:x@example.com", "", undefined])(
        "sends %j to the app",
        (target) => {
            expect(safeRedirect(target)).toBe("/");
        }
    );
});

describe("withoutOneTimeToken", () => {
    it("drops ott from the callback redirect and keeps the session cookie", () => {
        const headers = new Headers({ location: "https://app.tryoutlayr.com/?ott=abc&x=1" });
        headers.append("set-cookie", "session=1; Path=/");
        headers.append("set-cookie", "data=2; Path=/");
        const response = withoutOneTimeToken(new Response(null, { headers, status: 302 }));
        expect(response.status).toBe(302);
        expect(response.headers.get("location")).toBe("https://app.tryoutlayr.com/?x=1");
        expect(response.headers.getSetCookie()).toEqual(["session=1; Path=/", "data=2; Path=/"]);
    });
});

describe("asServed", () => {
    it("names the https origin the visitor used behind the TLS proxy, body intact", async () => {
        const request = new Request("http://app.tryoutlayr.com/api/auth/sign-in/social?x=1", {
            body: '{"provider":"google"}',
            headers: { "cf-visitor": '{"scheme":"https"}' },
            method: "POST",
        });
        const served = await asServed(request);
        expect(served.url).toBe("https://app.tryoutlayr.com/api/auth/sign-in/social?x=1");
        expect(await served.text()).toBe('{"provider":"google"}');
    });

    it("leaves a plain http request alone", async () => {
        const request = new Request("http://localhost:3000/api/auth/callback/google");
        expect(await asServed(request)).toBe(request);
    });
});

describe("failureKey", () => {
    it("names a wrong password", () => {
        expect(failureKey({ code: "INVALID_EMAIL_OR_PASSWORD", status: 401 })).toBe("credentials");
    });

    it("reports rate limits whatever the code", () => {
        expect(failureKey({ code: "SOMETHING", status: 429 })).toBe("rateLimited");
    });

    it("falls back for unknown failures", () => {
        expect(failureKey()).toBe("unknown");
    });
});

describe("authRequest", () => {
    it("fails with the code and status the auth client returned", async () => {
        const failure = await Effect.runPromise(
            Effect.flip(authRequest(async () => ({ error: { code: "INVALID_OTP", status: 400 } })))
        );
        expect(failure).toEqual(new AuthFailure({ code: "INVALID_OTP", status: 400 }));
    });

    it("turns a rejected call into a failure that gets the generic copy", async () => {
        const failure = await Effect.runPromise(Effect.flip(authRequest(() => Promise.reject(new Error("offline")))));
        expect(failureKey(failure)).toBe("unknown");
    });
});
