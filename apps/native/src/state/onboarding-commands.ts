import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";

import { accountsRepo } from "@/data/accounts-core";
import { Meta } from "@/data/app-meta-core";
import { finishFirstRun, releaseAccountOffer } from "@/data/onboarding-core";
import type { Database } from "@/db/client";
import type { AccountPick } from "@/domain/onboarding-accounts";
import { armChosenReminder } from "@/lib/chosen-reminder";
import { fetchMerchantImage } from "@/lib/logo-fetch";
import { persistLogo } from "@/lib/persist-logo";
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
        const now = yield* DateTime.nowAsDate;
        const outcome = yield* commitEntry({
            db: input.db,
            draft: { ...input.draft, date: now },
            source: "onboarding",
        });
        if (outcome.kind === "failed") {
            return false;
        }
        yield* Meta.set(input.db, "secondEntryNudgeDay", now.getTime()).pipe(
            Effect.catchCause((cause) => Effect.logError("Marking the second-entry nudge failed", cause))
        );
        posthog?.capture("onboarding_first_entry", { outcome: "saved" });
        return true;
    }),
    label: "onboarding:save-first-entry",
});

export const awaitReminderPromptCommand = createRuntimeCommand(appRuntime, {
    execute: (db: Database) => armChosenReminder(db),
    label: "onboarding:await-reminder-prompt",
});

export const releaseAccountOfferCommand = createRuntimeCommand(appRuntime, {
    execute: (db: Database) => releaseAccountOffer(db),
    label: "onboarding:release-account-offer",
});

// A slow logo must not hold the step: the account is worth more than its picture.
const LOGO_WAIT = "4 seconds";

const pickLogo = Effect.fn("Onboarding.pickLogo")(function* pickLogo(domain: string) {
    const outcome = yield* fetchMerchantImage({ domain, name: domain });
    return outcome.kind === "logo" ? yield* persistLogo(outcome.bytes, domain) : null;
});

const pickLogoInTime = (domain: string) =>
    pickLogo(domain).pipe(
        Effect.timeoutOption(LOGO_WAIT),
        Effect.map(Option.getOrNull),
        Effect.orElseSucceed(() => null)
    );

const createPicks = Effect.fn("Onboarding.createPicks")(function* createPicks(
    db: Database,
    picks: readonly AccountPick[]
) {
    const logos = yield* Effect.all(
        picks.map((pick) => (pick.domain === null ? Effect.succeed(null) : pickLogoInTime(pick.domain))),
        { concurrency: "unbounded" }
    );
    // One at a time: each new account takes the next sort position.
    for (const [index, pick] of picks.entries()) {
        yield* accountsRepo.create(db, { currency: pick.currency, kind: "asset", name: pick.label, ...logos[index] });
    }
});

export const createOnboardingAccountsCommand = createRuntimeCommand(appRuntime, {
    execute: Effect.fn("Onboarding.createAccounts")(function* createAccounts(input: {
        db: Database;
        now: readonly AccountPick[];
        waiting: readonly AccountPick[];
    }) {
        yield* createPicks(input.db, input.now);
        yield* Meta.set(input.db, "onboardingWaitingAccounts", input.waiting);
        posthog?.capture("onboarding_accounts", {
            created: input.now.length,
            currencies: new Set([...input.now, ...input.waiting].map((pick) => pick.currency)).size,
            waiting: input.waiting.length,
        });
    }),
    label: "onboarding:create-accounts",
});

export const finishOnboardingOfferCommand = createRuntimeCommand(appRuntime, {
    execute: Effect.fn("Onboarding.finishOffer")(function* finishOffer(input: { db: Database; purchased: boolean }) {
        if (input.purchased) {
            // Pro is already bought: a failed account write must not keep them in onboarding.
            yield* Meta.get(input.db, "onboardingWaitingAccounts").pipe(
                Effect.flatMap((waiting) => createPicks(input.db, waiting)),
                Effect.catchCause((cause) => Effect.logError("Creating the waiting accounts failed", cause))
            );
        }
        yield* finishFirstRun(input.db);
    }),
    label: "onboarding:finish-offer",
});
