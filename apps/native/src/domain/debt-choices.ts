import type { TranslationKey } from "@/i18n/catalog";

import { debtLegs } from "./debts";
import type { DebtVerb } from "./debts";
import { roundToMinorUnits } from "./money";

/** Where a person stands with you: the hero's label and which actions they get. */
export type DebtStanding = "owesYou" | "settled" | "youOwe";

/**
 * Reads a person's balance, in their own currency. Rounded first, so a float
 * residue from 0.10 + 0.20 - 0.30 reads as settled.
 */
export function debtStanding(balance: number, currency: string): DebtStanding {
    const rounded = roundToMinorUnits(balance, currency);
    if (rounded < 0) {
        return "youOwe";
    }
    return rounded > 0 ? "owesYou" : "settled";
}

export interface DebtChoice {
    labelKey: TranslationKey;
    verb: DebtVerb;
}

/**
 * The two movements offered for a person, as the detail's buttons and the
 * sheet's segments: the one that settles what is owed first. Null is a person
 * not on the ledger yet, who can only be borrowed from or lent to.
 */
export function debtChoices(standing: DebtStanding | null): readonly [DebtChoice, DebtChoice] {
    switch (standing) {
        case "youOwe": {
            return [
                { labelKey: "debts.action.payBack", verb: "paidBack" },
                { labelKey: "debts.action.borrowMore", verb: "borrowed" },
            ];
        }
        case "owesYou": {
            return [
                { labelKey: "debts.action.gotPaidBack", verb: "gotPaidBack" },
                { labelKey: "debts.action.lendMore", verb: "lent" },
            ];
        }
        case "settled": {
            return [
                { labelKey: "debts.action.lend", verb: "lent" },
                { labelKey: "debts.action.borrow", verb: "borrowed" },
            ];
        }
        default: {
            return [
                { labelKey: "debts.verb.borrowed", verb: "borrowed" },
                { labelKey: "debts.verb.lent", verb: "lent" },
            ];
        }
    }
}

/** True when the money moves from the person into your account. */
export function comesFromPerson(verb: DebtVerb): boolean {
    return debtLegs(verb, { account: false, person: true }).from;
}
