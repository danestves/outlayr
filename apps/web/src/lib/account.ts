import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

export function safeRedirect(target: string | undefined): string {
    return target?.startsWith("/") && !target.startsWith("//") && !target.startsWith("/\\") ? target : "/";
}

const RATE_LIMITED = 429;
const FAILURES = new Map([
    ["INVALID_EMAIL", "Enter a valid email."],
    ["INVALID_EMAIL_OR_PASSWORD", "That email and password don't match."],
    ["INVALID_OTP", "That code is wrong or expired."],
    ["OTP_EXPIRED", "That code is wrong or expired."],
    ["TOO_MANY_ATTEMPTS", "Too many tries with that code. Send a new one."],
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

export function failureMessage(error: Pick<AuthFailure, "code" | "status"> = {}): string {
    if (error.status === RATE_LIMITED) {
        return "Too many tries. Wait a bit and try again.";
    }
    return (error.code && FAILURES.get(error.code)) || "Sign-in didn't complete. Try again.";
}
