import { addDays } from "@outlayr/money/calendar";

export type ProStatus =
    | { readonly kind: "lifetime" }
    | { readonly kind: "ends" | "renews" | "trial"; readonly on: Date };

interface ProTerm {
    readonly expirationDateMillis: number | null;
    readonly periodType: string;
    readonly willRenew: boolean;
}

/** A trial the customer cancelled reads as ending, not as a trial: nothing will be charged. */
export function proStatusOf(term: ProTerm | undefined): ProStatus | null {
    if (term === undefined) {
        return null;
    }
    if (term.expirationDateMillis === null) {
        return { kind: "lifetime" };
    }
    const on = new Date(term.expirationDateMillis);
    if (!term.willRenew) {
        return { kind: "ends", on };
    }
    return { kind: term.periodType === "TRIAL" ? "trial" : "renews", on };
}

export const TRIAL_REMINDER_LEAD_DAYS = 2;

/** Null when the reminder would land in the past: iOS never delivers a past DATE trigger. */
export function trialReminderAt(trialEnds: Date, now: Date): Date | null {
    const fireAt = addDays(trialEnds, -TRIAL_REMINDER_LEAD_DAYS);
    return fireAt.getTime() > now.getTime() ? fireAt : null;
}
