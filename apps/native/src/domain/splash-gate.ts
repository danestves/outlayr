import type { LocalDataStatus } from "@/contexts/local-data-context";
import type { AdoptionStatus } from "@/lib/ledger-adoption";

import type { AuthGate } from "./auth-gate";

export interface ShellProbe {
    data: LocalDataStatus;
    fontsLoaded: boolean;
}

// `error` is excluded on purpose: it is its own surface, not a later frame of this one.
export function localShellReady(probe: ShellProbe): boolean {
    return probe.fontsLoaded && probe.data === "ready";
}

export interface RouteProbe {
    adoption: AdoptionStatus;
    gate: AuthGate;
}

// Cannot stall: `restoring` is bounded by `AUTH_RESTORE_BUDGET_MS` and adoption settles even when it throws. `ask`
// settles because the adopt screen is the destination.
export function routeSettled(probe: RouteProbe): boolean {
    return probe.gate === "unconfigured" || (probe.gate !== "restoring" && probe.adoption !== "resolving");
}
