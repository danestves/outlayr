import { expect, it } from "vite-plus/test";

import { tokenWaitOf } from "./token-wait";

const withCookie = (cookie: string) => new Headers({ cookie });

it("reads a live JWT cookie without a round trip", () => {
    expect(tokenWaitOf(withCookie("better-auth.convex_jwt=a.b.c; better-auth.session_token=s"))).toBe("none");
});

it("leaves the fetch to the browser when only the session cookie is left", () => {
    expect(tokenWaitOf(withCookie("better-auth.session_token=s"))).toBe("round-trip");
    expect(tokenWaitOf(withCookie("__Secure-better-auth.session_token=s"))).toBe("round-trip");
});

it("treats a visitor with neither cookie as signed out", () => {
    expect(tokenWaitOf(withCookie("ledger_copy=1"))).toBe("signed-out");
    expect(tokenWaitOf(new Headers())).toBe("signed-out");
});
