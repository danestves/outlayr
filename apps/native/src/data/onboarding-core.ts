import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { Database } from "@/db/client";
import { transaction } from "@/db/transaction";

import { Meta } from "./app-meta-core";

export class OnboardingError extends Schema.TaggedError<OnboardingError>()("OnboardingError", {
    cause: Schema.Defect(),
}) {
    // oxlint-disable-next-line class-methods-use-this -- one cause, no attribute: the message has nothing on the instance to read
    override get message(): string {
        return "Settling the onboarding gate failed";
    }
}

// The sole writer of `onboardingComplete`: the first-entry step, or the currency step's "I already have an account".
// The gate reads this marker, not the ledger: erasing every transaction must not re-open the flow.
export const finishOnboarding = Effect.fn("Onboarding.finishOnboarding")(function* finishOnboarding(db: Database) {
    yield* Meta.set(db, "onboardingComplete", true);
});

export const markReminderChosen = Effect.fn("Onboarding.markReminderChosen")(function* markReminderChosen(
    db: Database
) {
    yield* Meta.set(db, "reminderChosen", true);
});

export const clearReminderChosen = Effect.fn("Onboarding.clearReminderChosen")(function* clearReminderChosen(
    db: Database
) {
    yield* Meta.set(db, "reminderChosen", false);
});

export const deferAccount = Effect.fn("Onboarding.deferAccount")(function* deferAccount(db: Database) {
    yield* Meta.set(db, "accountDeferred", true);
});

// `migrated` gates this to once per device: a device killed between `setCurrency` and `finishOnboarding` looks exactly
// like a pre-flow ledger, and would otherwise be backfilled past a flow it was mid-way through.
export function shouldSettleLegacyLedger(completed: boolean, currencyChosen: boolean, migrated: boolean): boolean {
    return !migrated && !completed && currencyChosen;
}

// `onboardingComplete` first, marker last: a kill between them re-runs an idempotent backfill, while the reverse
// strands the ledger outside both the flow and the gate.
export const settleLegacyOnboarding = Effect.fn("Onboarding.settleLegacyOnboarding")(function* settleLegacyOnboarding(
    db: Database
) {
    const [completed, currencyChosen, migrated] = yield* Effect.all(
        [Meta.get(db, "onboardingComplete"), Meta.get(db, "currencyChosen"), Meta.get(db, "onboardingGateMigrated")],
        { concurrency: "unbounded" }
    );

    if (migrated) {
        return;
    }

    yield* transaction(
        db,
        Effect.gen(function* write() {
            if (shouldSettleLegacyLedger(completed, currencyChosen, migrated)) {
                yield* Meta.set(db, "onboardingComplete", true);
            }
            yield* Meta.set(db, "onboardingGateMigrated", true);
        }),
        (cause) => new OnboardingError({ cause })
    );
});
