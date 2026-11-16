import type { EntryRateType } from "@outlayr/money/rates";

import { roundToMinorUnits } from "@/domain/money";

/** `value` is the person's currency per unit of the account's. */
export interface DebtRate {
    type: EntryRateType;
    value: number;
}

const DRIFTING_CURRENCY = "VES";
const STEADY_CURRENCY = "USD";

// A debt in bolívares grows with every repayment at a later BCV rate, so someone new is kept in dollars by default.
export function newPersonCurrency(accountCurrency: string | null, fallback: string): string {
    if (accountCurrency === null) {
        return fallback;
    }
    return accountCurrency === DRIFTING_CURRENCY ? STEADY_CURRENCY : accountCurrency;
}

interface TheirSideInput {
    /** In the account's currency. */
    amount: number;
    /** That day's official rate, the person's currency per unit of the account's. */
    market: number | null;
    personCurrency: string;
    /** What the user typed for the person's side, 0 while untouched. */
    typed: number;
}

export function debtTheirSide({ amount, market, personCurrency, typed }: TheirSideInput) {
    const prefill = market === null ? 0 : roundToMinorUnits(amount * market, personCurrency);
    const theirAmount = typed > 0 ? typed : prefill;
    if (amount <= 0 || theirAmount <= 0) {
        return { rate: null, theirAmount };
    }
    const rate: DebtRate =
        market !== null && theirAmount === prefill
            ? { type: "official", value: market }
            : { type: "custom", value: theirAmount / amount };
    return { rate, theirAmount };
}
