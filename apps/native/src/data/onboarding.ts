import { eq } from "drizzle-orm";

import type { Database } from "@/db/client";
import { appMeta } from "@/db/schema";

import { META_KEYS } from "./app-meta-core";
import { useLiveValue } from "./live-query";
import { isAccountDeferred, isOnboardingSettled, isReminderChosen } from "./onboarding-core";

function useGateFlag(db: Database, key: string, isSet: (value: string | null) => boolean): boolean {
    return useLiveValue(
        appMeta,
        () => db.select().from(appMeta).where(eq(appMeta.key, key)),
        (rows) => isSet(rows[0]?.value ?? null)
    );
}

export function useOnboardingSettled(db: Database): boolean {
    return useGateFlag(db, META_KEYS.onboardingComplete, isOnboardingSettled);
}

export function useAccountDeferred(db: Database): boolean {
    return useGateFlag(db, META_KEYS.accountDeferred, isAccountDeferred);
}

export function useFirstEntryOfferShown(db: Database): boolean {
    return useGateFlag(db, META_KEYS.firstEntryOfferShown, (value) => value === "true");
}

export function useReminderChosen(db: Database): boolean {
    return useGateFlag(db, META_KEYS.reminderChosen, isReminderChosen);
}
