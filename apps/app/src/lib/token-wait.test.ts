import { expect, it } from "vite-plus/test";

import { signedOutOf } from "./token-wait";

const withCookie = (cookie: string) => new Headers({ cookie });

it("asks for a token while either auth cookie is left", () => {
    expect(signedOutOf(withCookie("better-auth.convex_jwt=a.b.c"))).toBe(false);
    expect(signedOutOf(withCookie("better-auth.session_token=s"))).toBe(false);
    expect(signedOutOf(withCookie("__Secure-better-auth.session_token=s"))).toBe(false);
});

it("treats a visitor with neither cookie as signed out", () => {
    expect(signedOutOf(withCookie("theme=dark"))).toBe(true);
    expect(signedOutOf(new Headers())).toBe(true);
});
