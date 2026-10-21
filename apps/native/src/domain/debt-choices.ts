import type { TranslationKey } from "@/i18n/catalog";

import { debtLegs } from "./debts";
import type { DebtVerb } from "./debts";
import { roundToMinorUnits } from "./money";

export type DebtStanding = "owesYou" | "settled" | "youOwe";

/** Rounded first, so a float residue (0.10 + 0.20 - 0.30) reads as settled. */
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

/** The movement that settles what is owed comes first. Null is a person not on the ledger yet. */
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

export function comesFromPerson(verb: DebtVerb): boolean {
    return debtLegs(verb, { account: false, person: true }).from;
}
