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

export interface AuthError {
    code?: string;
    status?: number;
}

export class AuthFailureError extends Error {
    readonly error: AuthError;

    constructor(error: AuthError) {
        super(error.code ?? "Auth request failed");
        this.name = "AuthFailureError";
        this.error = error;
    }
}

export function unwrap(result: { error: AuthError | null }) {
    if (result.error) {
        throw new AuthFailureError(result.error);
    }
}

export function failureMessage(error: AuthError = {}): string {
    if (error.status === RATE_LIMITED) {
        return "Too many tries. Wait a bit and try again.";
    }
    return (error.code && FAILURES.get(error.code)) || "Sign-in didn't complete. Try again.";
}
