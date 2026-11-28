import { BANK_ANALYTICS_AT_MS } from "@outlayr/backend/confect/legal";
import { api } from "@outlayr/backend/convex/_generated/api";
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";

import type { BankInstitution, LinkedBankAccount } from "@/domain/linked-banks";
import { cloudAction, cloudMutation } from "@/lib/convex";
import { posthog } from "@/lib/posthog";
import { collectBankAccounts } from "@/lib/stripe-link";

import { createCommand } from "./atom-command";

const linkBank = Effect.fn("Banking.linkBank")(function* linkBank(
    institution: BankInstitution["id"],
    repair: LinkedBankAccount["id"] | null
) {
    const started = yield* cloudAction(api.banking.startLink, { institution, repair });
    if (started.kind === "redirect") {
        return { kind: "failed" as const };
    }
    if (started.kind !== "sdk") {
        return started;
    }
    const sheet = yield* collectBankAccounts(started.clientSecret);
    if (sheet.kind !== "collected") {
        return sheet;
    }
    return yield* cloudAction(api.banking.finishLink, {
        completion: null,
        provider: started.provider,
        repair,
        sessionId: sheet.sessionId,
    });
});

export type BankLinkOutcome = Effect.Success<ReturnType<typeof linkBank>>;

interface LinkResult {
    accounts: number;
    outcome: "linked" | "canceled" | "failed";
}

// A relink that leaves the account expired shows as a failure, so it counts as one. The plan and unavailable gates
// stop before any attempt.
function linkResult(outcome: BankLinkOutcome): LinkResult | null {
    switch (outcome.kind) {
        case "linked": {
            return outcome.repaired || outcome.added.length > 0
                ? { accounts: outcome.added.length, outcome: "linked" }
                : { accounts: 0, outcome: "failed" };
        }
        case "canceled": {
            return { accounts: 0, outcome: "canceled" };
        }
        case "plan":
        case "unavailable": {
            return null;
        }
        default: {
            return { accounts: 0, outcome: "failed" };
        }
    }
}

const trackLink = Effect.fn("Banking.trackLink")(function* trackLink(
    result: LinkResult | null,
    repair: LinkedBankAccount["id"] | null
) {
    if (result !== null && (yield* Clock.currentTimeMillis) >= BANK_ANALYTICS_AT_MS) {
        posthog?.capture("bank_link_finished", { ...result, relink: repair !== null });
    }
});

export const linkBankCommand = createCommand({
    execute: ({
        institution,
        repair,
    }: {
        institution: BankInstitution["id"];
        repair: LinkedBankAccount["id"] | null;
    }) =>
        linkBank(institution, repair).pipe(
            Effect.tap((outcome) => trackLink(linkResult(outcome), repair)),
            Effect.tapError(() => trackLink({ accounts: 0, outcome: "failed" }, repair))
        ),
    label: "banking:link",
});

export const unlinkBankCommand = createCommand({
    execute: ({ id }: { id: LinkedBankAccount["id"] }) => cloudAction(api.banking.unlink, { id }),
    label: "banking:unlink",
});

export const setFilesIntoCommand = createCommand({
    execute: ({ accountId, id }: { accountId: string | null; id: LinkedBankAccount["id"] }) =>
        cloudMutation(api.banking.setFilesInto, { accountId, id }),
    label: "banking:setFilesInto",
});
