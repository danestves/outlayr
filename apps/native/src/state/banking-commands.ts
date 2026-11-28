import { BANK_ANALYTICS_AT_MS } from "@outlayr/backend/confect/legal";
import { api } from "@outlayr/backend/convex/_generated/api";
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

const trackLink = (outcome: BankLinkOutcome["kind"], accounts: number, repair: LinkedBankAccount["id"] | null) =>
    Effect.sync(() => {
        if (Date.now() >= BANK_ANALYTICS_AT_MS) {
            posthog?.capture("bank_link_finished", { accounts, outcome, relink: repair !== null });
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
            Effect.tap((outcome) =>
                trackLink(outcome.kind, outcome.kind === "linked" ? outcome.added.length : 0, repair)
            ),
            Effect.tapError(() => trackLink("failed", 0, repair))
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
