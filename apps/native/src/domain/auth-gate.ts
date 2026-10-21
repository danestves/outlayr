export type AuthGate =
    /** No session is cached and none has been read yet. Cover, do not decide. */
    "restoring" | "signed-in" | "signed-out" | "unconfigured";

export interface AuthProbe {
    configured: boolean;
    hasSession: boolean;
    restoreExpired: boolean;
    restoring: boolean;
}

/** The only thing between a dead network and an endless spinner; a signed-out user loses nothing waiting. */
export const AUTH_RESTORE_BUDGET_MS = 6000;

/**
 * A cached session wins over every other signal: `expoClient` seeds it from the secure store at construction, so
 * a signed-in device reads `hasSession` on its first frame and works offline while revalidation fails freely.
 */
export function authGate(probe: AuthProbe): AuthGate {
    if (!probe.configured) {
        return "unconfigured";
    }
    if (probe.hasSession) {
        return "signed-in";
    }
    if (probe.restoring && !probe.restoreExpired) {
        return "restoring";
    }
    return "signed-out";
}

export type AuthRoute = "sign-in" | "adopt" | "ledger";

export interface AccountState {
    deferred: boolean;
    gate: AuthGate;
    reconciled: boolean;
}

/**
 * `unconfigured` and `deferred` open the ledger: signing in only ever adds sync, so a missing backend or a declined
 * offer must never gate local data. `restoring` parks on sign-in because the stack needs an admitted screen while
 * `AuthCover` covers it.
 */
export function authRoute(state: AccountState): AuthRoute {
    if (state.gate === "unconfigured") {
        return "ledger";
    }
    if (state.gate !== "signed-in") {
        return state.deferred ? "ledger" : "sign-in";
    }
    return state.reconciled ? "ledger" : "adopt";
}

export type RootStackGroup = "onboarding" | AuthRoute;

export function rootStackGroup(state: AccountState & { onboarded: boolean }): RootStackGroup {
    return state.onboarded ? authRoute(state) : "onboarding";
}
