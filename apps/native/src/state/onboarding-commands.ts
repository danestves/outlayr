import * as Effect from "effect/Effect";

import { META_KEYS, setMeta } from "@/data/app-meta-core";
import type { Database } from "@/db/client";
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
        yield* setMeta(input.db, META_KEYS.firstEntryId, outcome.id).pipe(
            Effect.catchCause((cause) => Effect.logError("Failed to remember the first entry", cause))
        );
        posthog?.capture("onboarding_first_entry", { outcome: "saved" });
        return true;
    }),
    label: "onboarding:save-first-entry",
});
