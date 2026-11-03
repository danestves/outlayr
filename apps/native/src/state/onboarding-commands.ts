import * as Effect from "effect/Effect";

import type { Database } from "@/db/client";
import { armChosenReminder } from "@/lib/chosen-reminder";
import { posthog } from "@/lib/posthog";
import { appRuntime } from "@/lib/runtime";

import { createRuntimeCommand } from "./atom-command";
import { commitEntry } from "./entry-commit";
import type { EntryDraft } from "./entry-commit";

export const saveFirstEntryCommand = createRuntimeCommand(appRuntime, {
    execute: Effect.fn("Onboarding.saveFirstEntry")(function* saveFirstEntry(input: {
        db: Database;
        draft: Omit<EntryDraft, "date">;
    }) {
        const outcome = yield* commitEntry({
            db: input.db,
            draft: { ...input.draft, date: new Date() },
            source: "onboarding",
        });
        if (outcome.kind === "failed") {
            return false;
        }
        posthog?.capture("onboarding_first_entry", { outcome: "saved" });
        return true;
    }),
    label: "onboarding:save-first-entry",
});

export const awaitReminderPromptCommand = createRuntimeCommand(appRuntime, {
    execute: (db: Database) => armChosenReminder(db),
    label: "onboarding:await-reminder-prompt",
});

export const markFirstEntryOfferCommand = createRuntimeCommand(appRuntime, {
    execute: (db: Database) => setMeta(db, META_KEYS.firstEntryOfferShown, "true"),
    label: "onboarding:mark-first-entry-offer",
});
