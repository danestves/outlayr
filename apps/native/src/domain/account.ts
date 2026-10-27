import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import type { TranslationKey } from "@/i18n/catalog";
import type { TranslateFn } from "@/i18n/context";

export interface AccountUser {
    email?: string | null;
    name?: string | null;
}

export type AccountState =
    | { kind: "pending" }
    | { kind: "signed-out" }
    | { kind: "signed-in"; user: AccountUser | undefined };

export function accountLabel(user: AccountUser | undefined, t: TranslateFn): string {
    return firstNonBlank(user?.name, user?.email) ?? t("settings.account.signedInFallback");
}

export function accountRowValue(state: AccountState, t: TranslateFn): string {
    if (state.kind === "pending") {
        return "";
    }
    if (state.kind === "signed-out") {
        return t("settings.account.signIn");
    }
    return accountLabel(state.user, t);
}

const CANCELLATION_CODES = new Set(["ERR_REQUEST_CANCELED", "SIGN_IN_CANCELLED"]);

export function isSignInCancellation(cause: unknown): boolean {
    const code = errorField(cause, "code");
    return code !== null && CANCELLATION_CODES.has(code);
}

const EMAIL_FAILURES = new Map<string, TranslationKey>([
    ["INVALID_EMAIL", "auth.email.error.email"],
    ["INVALID_EMAIL_OR_PASSWORD", "auth.email.error.credentials"],
    ["INVALID_OTP", "auth.email.error.code"],
    ["OTP_EXPIRED", "auth.email.error.code"],
    ["TOO_MANY_ATTEMPTS", "auth.email.error.attempts"],
]);

const TOO_MANY_REQUESTS = 429;
const INVALID_EMAIL_FIELD = "[body.email]";

export function signInFailureMessage(cause: unknown, t: TranslateFn): string {
    const code = errorField(cause, "code");
    if (code === "PLAY_SERVICES_NOT_AVAILABLE") {
        return t("settings.account.playServices");
    }
    if (Option.getOrUndefined(decodeProviderFailure(cause))?.status === TOO_MANY_REQUESTS) {
        return t("auth.email.error.rateLimited");
    }
    if (code === "VALIDATION_ERROR" && errorField(cause, "message")?.startsWith(INVALID_EMAIL_FIELD)) {
        return t("auth.email.error.email");
    }
    return t((code === null ? undefined : EMAIL_FAILURES.get(code)) ?? "settings.account.genericFailure");
}

export function signInFailureDetail(cause: unknown): string | null {
    return firstNonBlank(errorField(cause, "message"), errorField(cause, "code"));
}

const decodeProviderFailure = Schema.decodeUnknownOption(
    Schema.Struct({
        code: Schema.optional(Schema.String),
        message: Schema.optional(Schema.String),
        status: Schema.optional(Schema.Finite),
    })
);

function errorField(cause: unknown, field: "code" | "message"): string | null {
    return Option.getOrUndefined(decodeProviderFailure(cause))?.[field] ?? null;
}

function firstNonBlank(...values: (string | null | undefined)[]): string | null {
    for (const value of values) {
        const trimmed = value?.trim();
        if (trimmed) {
            return trimmed;
        }
    }
    return null;
}
