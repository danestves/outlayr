import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { Database } from "@/db/client";
import { transaction } from "@/db/transaction";

import { getMeta, META_KEYS, setMeta } from "./app-meta-core";

export class OnboardingError extends Schema.TaggedError<OnboardingError>()("OnboardingError", {
    cause: Schema.Defect(),
}) {
    // oxlint-disable-next-line class-methods-use-this -- one cause, no attribute: the message has nothing on the instance to read
    override get message(): string {
        return "Settling the onboarding gate failed";
    }
}

// Read from the marker the terminal step writes, not the ledger: erasing every transaction must not re-open the flow.
export function isOnboardingSettled(completed: string | null): boolean {
    return completed === "true";
}

// The sole writer of `onboardingComplete`: the rhythm step, or the currency step's "I already have an account".
export const finishOnboarding = Effect.fn("Onboarding.finishOnboarding")(function* finishOnboarding(db: Database) {
    yield* setMeta(db, META_KEYS.onboardingComplete, "true");
});

export function isReminderChosen(chosen: string | null): boolean {
    return chosen === "true";
}

export const markReminderChosen = Effect.fn("Onboarding.markReminderChosen")(function* markReminderChosen(
    db: Database
) {
    yield* setMeta(db, META_KEYS.reminderChosen, "true");
});

export function isAccountDeferred(deferred: string | null): boolean {
    return deferred === "true";
}

export const deferAccount = Effect.fn("Onboarding.deferAccount")(function* deferAccount(db: Database) {
    yield* setMeta(db, META_KEYS.accountDeferred, "true");
});

// `migrated` gates this to once per device: a device killed between `setCurrency` and `finishOnboarding` looks exactly
// like a pre-flow ledger, and would otherwise be backfilled past a flow it was mid-way through.
export function shouldSettleLegacyLedger(
    completed: string | null,
    currencyChosen: string | null,
    migrated: string | null
): boolean {
    return migrated !== "true" && completed !== "true" && currencyChosen === "true";
}

// `onboardingComplete` first, marker last: a kill between them re-runs an idempotent backfill, while the reverse
// strands the ledger outside both the flow and the gate.
export const settleLegacyOnboarding = Effect.fn("Onboarding.settleLegacyOnboarding")(function* settleLegacyOnboarding(
    db: Database
) {
    const [completed, currencyChosen, migrated] = yield* Effect.all(
        [
            getMeta(db, META_KEYS.onboardingComplete),
            getMeta(db, META_KEYS.currencyChosen),
            getMeta(db, META_KEYS.onboardingGateMigrated),
        ],
        { concurrency: "unbounded" }
    );

    if (migrated === "true") {
        return;
    }

    yield* transaction(
        db,
        Effect.gen(function* write() {
            if (shouldSettleLegacyLedger(completed, currencyChosen, migrated)) {
                yield* setMeta(db, META_KEYS.onboardingComplete, "true");
            }
            yield* setMeta(db, META_KEYS.onboardingGateMigrated, "true");
        }),
        (cause) => new OnboardingError({ cause })
    );
});
