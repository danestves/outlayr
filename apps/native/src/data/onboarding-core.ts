import type { Database } from "@/db/client";
import { withTransaction } from "@/db/transaction";

import { getMeta, META_KEYS, setMeta } from "./app-meta-core";

// Read from the marker the terminal step writes, not the ledger: erasing every transaction must not re-open the flow.
export function isOnboardingSettled(completed: string | null): boolean {
    return completed === "true";
}

// The sole writer of `onboardingComplete`: the rhythm step, or the currency step's "I already have an account".
export async function finishOnboarding(db: Database): Promise<void> {
    await setMeta(db, META_KEYS.onboardingComplete, "true");
}

export function isReminderChosen(chosen: string | null): boolean {
    return chosen === "true";
}

export async function markReminderChosen(db: Database): Promise<void> {
    await setMeta(db, META_KEYS.reminderChosen, "true");
}

export function isAccountDeferred(deferred: string | null): boolean {
    return deferred === "true";
}

export async function deferAccount(db: Database): Promise<void> {
    await setMeta(db, META_KEYS.accountDeferred, "true");
}

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
export async function settleLegacyOnboarding(db: Database): Promise<void> {
    const [completed, currencyChosen, migrated] = await Promise.all([
        getMeta(db, META_KEYS.onboardingComplete),
        getMeta(db, META_KEYS.currencyChosen),
        getMeta(db, META_KEYS.onboardingGateMigrated),
    ]);

    if (migrated === "true") {
        return;
    }

    await withTransaction(db, async () => {
        if (shouldSettleLegacyLedger(completed, currencyChosen, migrated)) {
            await setMeta(db, META_KEYS.onboardingComplete, "true");
        }
        await setMeta(db, META_KEYS.onboardingGateMigrated, "true");
    });
}
