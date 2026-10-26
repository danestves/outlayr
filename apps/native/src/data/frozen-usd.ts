import { canonicalUsd } from "@outlayr/money/canonical-usd";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { Database } from "@/db/client";

import { localRateLookup } from "./rates";

export class FrozenUsdError extends Schema.TaggedError<FrozenUsdError>()("FrozenUsdError", {
    cause: Schema.Defect(),
    currency: Schema.String,
}) {
    override get message(): string {
        return `Freezing an amount in ${this.currency} as USD failed`;
    }
}

export interface FrozenUsd {
    amountUsd: number | null;
    exchangeRate: number | null;
}

// Frozen at the rate of its own day, the contract `transactions.amountUsd` keeps. Signed: an account can open
// overdrawn, so the magnitude is canonicalized and the sign restored.
export const frozenUsd = Effect.fn("FrozenUsd.frozenUsd")(function* frozenUsd(
    db: Database,
    amount: number,
    currency: string,
    date: Date
) {
    if (amount === 0) {
        return { amountUsd: 0, exchangeRate: null } satisfies FrozenUsd;
    }
    const { amountUsd, exchangeRate } = yield* Effect.tryPromise({
        catch: (cause) => new FrozenUsdError({ cause, currency }),
        try: () =>
            canonicalUsd(localRateLookup(db), {
                amount: Math.abs(amount),
                currency,
                date,
                displayCurrency: currency,
            }),
    });
    return {
        amountUsd: amountUsd == null ? null : Math.sign(amount) * amountUsd,
        exchangeRate: exchangeRate ?? null,
    } satisfies FrozenUsd;
});

export const frozenUsdAmount = Effect.fn("FrozenUsd.frozenUsdAmount")(function* frozenUsdAmount(
    db: Database,
    amount: number,
    currency: string,
    date: Date
) {
    const { amountUsd } = yield* frozenUsd(db, amount, currency, date);
    return amountUsd;
});
