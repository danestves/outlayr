export type LocalLedger = "empty" | "populated";

// Its own value so no call site mistakes a build with no sync engine for `empty` and wipes a ledger over it.
export type RemoteLedger = "empty" | "populated" | "unknown";

export type AdoptionPlan = "fresh" | "adopt" | "replace" | "ask" | "defer";

export const ADOPTION_CHOICES = ["merge", "keep-local", "keep-account"] as const;

export type AdoptionChoice = (typeof ADOPTION_CHOICES)[number];

export interface AdoptionActions {
    pushLocal: boolean;
    wipeAccount: boolean;
    wipeLocal: boolean;
}

// `docs/internals/convex-sync.md` §1: only both-populated asks, since merging double-counts and wiping destroys.
export function adoptionPlan(local: LocalLedger, remote: RemoteLedger): AdoptionPlan {
    if (remote === "unknown") {
        return "defer";
    }
    if (local === "empty") {
        return remote === "empty" ? "fresh" : "replace";
    }
    return remote === "empty" ? "adopt" : "ask";
}

export function adoptionActions(plan: AdoptionPlan): AdoptionActions | null {
    switch (plan) {
        case "fresh": {
            return { pushLocal: false, wipeAccount: false, wipeLocal: false };
        }
        case "adopt": {
            return { pushLocal: true, wipeAccount: false, wipeLocal: false };
        }
        case "replace": {
            return { pushLocal: false, wipeAccount: false, wipeLocal: true };
        }
        case "ask":
        case "defer": {
            return null;
        }
        default: {
            const unhandled: never = plan;
            throw new Error(`Unhandled adoption plan: ${String(unhandled)}`);
        }
    }
}

export function choiceActions(choice: AdoptionChoice): AdoptionActions {
    switch (choice) {
        case "merge": {
            return { pushLocal: true, wipeAccount: false, wipeLocal: false };
        }
        case "keep-local": {
            return { pushLocal: true, wipeAccount: true, wipeLocal: false };
        }
        case "keep-account": {
            return { pushLocal: false, wipeAccount: false, wipeLocal: true };
        }
        default: {
            const unhandled: never = choice;
            throw new Error(`Unhandled adoption choice: ${String(unhandled)}`);
        }
    }
}

export function isDestructiveChoice(choice: AdoptionChoice): boolean {
    const actions = choiceActions(choice);
    return actions.wipeLocal || actions.wipeAccount;
}
