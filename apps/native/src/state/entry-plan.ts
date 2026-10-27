import * as Effect from "effect/Effect";

import { rememberLastUsedAccount } from "@/data/accounts-core";
import { queueEnrichment } from "@/data/enrichment-queue-core";
import { backfillRecurring } from "@/data/recurrence-backfill";
import type { Database } from "@/db/client";
import { sendEnrichmentQueue } from "@/lib/enrichment-queue";
import { syncSubscriptionReminders } from "@/lib/subscription-reminder-sync";

import type { SavedEntryPlan } from "./entry-save";

export const savedEntryPlan = (input: {
    accountId: string | null;
    backfill: boolean;
    carry: SavedEntryPlan["carry"];
    db: Database;
    id: string;
    queueLookup: boolean;
}): SavedEntryPlan => ({
    backfill: input.backfill ? backfillRecurring(input.db, input.id) : null,
    carry: input.carry,
    queueLookup: input.queueLookup
        ? queueEnrichment(input.db, input.id).pipe(Effect.andThen(Effect.ignore(sendEnrichmentQueue(input.db))))
        : null,
    rememberAccount: input.accountId === null ? null : rememberLastUsedAccount(input.db, input.accountId),
    syncReminders: syncSubscriptionReminders(input.db),
});
