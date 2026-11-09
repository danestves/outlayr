import type { Database } from "@/db/client";

import { useMeta } from "./app-meta";

export function useOnboardingSettled(db: Database): boolean {
    return useMeta(db, "onboardingComplete");
}

export function useAccountDeferred(db: Database): boolean {
    return useMeta(db, "accountDeferred");
}

export function useFirstEntryOfferShown(db: Database): boolean {
    return useMeta(db, "firstEntryOfferShown");
}

export function useReminderChosen(db: Database): boolean {
    return useMeta(db, "reminderChosen");
}
