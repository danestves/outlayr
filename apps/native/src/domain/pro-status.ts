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
