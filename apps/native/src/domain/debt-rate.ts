import type { EntryRateType } from "@outlayr/money/rates";

import { roundToMinorUnits } from "@/domain/money";

export interface DebtRate {
    type: EntryRateType;
    personPerAccount: number;
}

const DRIFTING_CURRENCY = "VES";
const STEADY_CURRENCY = "USD";

export function newPersonCurrency(accountCurrency: string | null, fallback: string): string {
    if (accountCurrency === null) {
        return fallback;
    }
    return accountCurrency === DRIFTING_CURRENCY ? STEADY_CURRENCY : accountCurrency;
}

interface TheirSideInput {
    amount: number;
    market: number | null;
    personCurrency: string;
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
            ? { type: "official", personPerAccount: market }
            : { type: "custom", personPerAccount: theirAmount / amount };
    return { rate, theirAmount };
}
