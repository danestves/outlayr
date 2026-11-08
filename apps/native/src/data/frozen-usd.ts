import { frozenUsd as frozenAtRate } from "@outlayr/money/canonical-usd";
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

// Frozen at the rate of its own day, the contract `transactions.amountUsd` keeps.
export const frozenUsd = Effect.fn("FrozenUsd.frozenUsd")(function* frozenUsd(
    db: Database,
    amount: number,
    currency: string,
    date: Date
) {
    const frozen: FrozenUsd = yield* frozenAtRate(localRateLookup(db), amount, currency, date).pipe(
        Effect.mapError((cause) => new FrozenUsdError({ cause, currency }))
    );
    return frozen;
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
