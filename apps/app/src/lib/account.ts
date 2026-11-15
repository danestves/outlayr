import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type signIn from "@/content/sign-in.content";

export function safeRedirect(target: string | undefined): string {
    return target?.startsWith("/") && !target.startsWith("//") && !target.startsWith("/\\") ? target : "/";
}

// The backend's crossDomain plugin adds `ott` for cross-origin clients; this proxy already forwards the session
// cookie, and redeeming the token on the page would sign in a second time.
export function withoutOneTimeToken(response: Response): Response {
    const location = response.headers.get("location");
    if (!location || !URL.canParse(location)) {
        return response;
    }
    const url = new URL(location);
    if (!url.searchParams.has("ott")) {
        return response;
    }
    url.searchParams.delete("ott");
    const headers = new Headers(response.headers);
    headers.set("location", url.toString());
    return new Response(response.body, { headers, status: response.status, statusText: response.statusText });
}

const RATE_LIMITED = 429;
export type FailureKey = keyof (typeof signIn)["content"]["failures"];

const FAILURES = new Map<string, FailureKey>([
    ["INVALID_EMAIL", "email"],
    ["INVALID_EMAIL_OR_PASSWORD", "credentials"],
    ["INVALID_OTP", "code"],
    ["OTP_EXPIRED", "code"],
    ["TOO_MANY_ATTEMPTS", "attempts"],
]);

export class AuthFailure extends Schema.TaggedError<AuthFailure>()("AuthFailure", {
    code: Schema.optional(Schema.String),
    status: Schema.optional(Schema.Number),
}) {}

export const authRequest = Effect.fn("Account.request")(function* authRequest(
    call: () => Promise<{ error: { code?: string; status?: number } | null }>
) {
    const { error } = yield* Effect.tryPromise({ catch: () => new AuthFailure(), try: call });
    if (error) {
        return yield* new AuthFailure({ code: error.code, status: error.status });
    }
});

export function failureKey(error: Pick<AuthFailure, "code" | "status"> = {}): FailureKey {
    if (error.status === RATE_LIMITED) {
        return "rateLimited";
    }
    return (error.code === undefined ? undefined : FAILURES.get(error.code)) ?? "unknown";
}
