import type { LocalAuthenticationError } from "expo-local-authentication";
import type { AppStateStatus } from "react-native";

import type { TranslationKey } from "@/i18n/catalog";

export type LockGate = "open" | "shut";

/**
 * `inactive` counts: iOS takes the app-switcher snapshot during it, so waiting
 * for `background` would publish a thumbnail of the ledger.
 */
export function relocksOnPhase(phase: AppStateStatus): boolean {
    return phase !== "active";
}

/**
 * `enforceable` is `null` until the enrolment probe answers, and the gate stays shut for that frame so the ledger
 * never flashes. With nothing enrolled the gate opens, rather than stranding the owner outside their own ledger.
 */
export function lockGate(enabled: boolean, unlocked: boolean, enforceable: boolean | null): LockGate {
    if (!enabled || enforceable === false) {
        return "open";
    }
    return unlocked ? "open" : "shut";
}

/** A `lockout` is not unenforceable: the passcode fallback can still get in. */
export function lockIsUnenforceable(error: LocalAuthenticationError): boolean {
    return error === "not_enrolled" || error === "not_available" || error === "passcode_not_set";
}

export function lockFailureMessage(error: LocalAuthenticationError): TranslationKey | null {
    switch (error) {
        case "user_cancel":
        case "app_cancel":
        case "system_cancel": {
            return null;
        }
        case "lockout": {
            return "lock.lockout";
        }
        case "authentication_failed": {
            return "lock.failed";
        }
        case "user_fallback": {
            return "lock.fallback";
        }
        case "not_enrolled":
        case "not_available":
        case "passcode_not_set": {
            return "lock.unavailable";
        }
        case "timeout": {
            return "lock.timeout";
        }
        default: {
            return "lock.unknown";
        }
    }
}
