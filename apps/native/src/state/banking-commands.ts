import { api } from "@outlayr/backend/convex/_generated/api";
import * as Effect from "effect/Effect";

import type { LinkedBankAccount } from "@/domain/linked-banks";
import { cloudAction, cloudMutation } from "@/lib/convex";
import { collectBankAccounts } from "@/lib/stripe-link";

import { createCommand } from "./atom-command";

const linkBank = Effect.fn("Banking.linkBank")(function* linkBank(country: string) {
    const started = yield* cloudAction(api.banking.startLink, { country });
    if (started.kind !== "sdk") {
        return started;
    }
    const sheet = yield* collectBankAccounts(started.clientSecret);
    if (sheet.kind !== "collected") {
        return sheet;
    }
    return yield* cloudAction(api.banking.finishLink, { provider: started.provider, sessionId: sheet.sessionId });
});

export type BankLinkOutcome = Effect.Success<ReturnType<typeof linkBank>>;

export const linkBankCommand = createCommand({
    execute: ({ country }: { country: string }) => linkBank(country),
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
