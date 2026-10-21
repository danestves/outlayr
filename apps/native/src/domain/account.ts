import { z } from "zod";

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

export function signInFailureMessage(cause: unknown, t: TranslateFn): string {
    const code = errorField(cause, "code");
    if (code === "PLAY_SERVICES_NOT_AVAILABLE") {
        return t("settings.account.playServices");
    }
    if (providerFailure.safeParse(cause).data?.status === TOO_MANY_REQUESTS) {
        return t("auth.email.error.rateLimited");
    }
    return t((code === null ? undefined : EMAIL_FAILURES.get(code)) ?? "settings.account.genericFailure");
}

export function signInFailureDetail(cause: unknown): string | null {
    return firstNonBlank(errorField(cause, "message"), errorField(cause, "code"));
}

const providerFailure = z.object({
    code: z.string().optional(),
    message: z.string().optional(),
    status: z.number().optional(),
});

function errorField(cause: unknown, field: "code" | "message"): string | null {
    const parsed = providerFailure.safeParse(cause);
    return parsed.success ? (parsed.data[field] ?? null) : null;
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
