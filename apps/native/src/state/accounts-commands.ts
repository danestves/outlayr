import type { TransferInput } from "@outlayr/money/transfer-row";
import * as Effect from "effect/Effect";

import { openingForBalance } from "@/data/accounts";
import { accountsRepo } from "@/data/accounts-core";
import type { Account, AccountInput } from "@/data/accounts-core";
import { transfersRepo } from "@/data/transfers-core";
import type { Database } from "@/db/client";
import { freshEntries } from "@/lib/fresh-entries";
import { notifySaved } from "@/lib/notify";
import { posthog } from "@/lib/posthog";
import { appRuntime } from "@/lib/runtime";

import { createRuntimeCommand, tapFailure } from "./atom-command";

const accountsCommand = <W, A, E>(label: string, execute: (input: W) => Effect.Effect<A, E>) =>
    createRuntimeCommand(appRuntime, { execute, label: `accounts:${label}` });

export const updateAccountCommand = accountsCommand(
    "update",
    (input: { db: Database; id: string; patch: Partial<AccountInput> }) =>
        accountsRepo.update(input.db, input.id, input.patch)
);

interface AccountSave {
    balance: number;
    db: Database;
    draft: Omit<AccountInput, "initialBalance">;
    onFailure: (error: Error) => void;
    onSaved: () => void;
    target: { mode: "create" } | { id: string; initialBalance: number; mode: "edit"; reopenAt: Date | null };
}

export const saveAccountCommand = accountsCommand(
    "save",
    Effect.fn("Accounts.save")(function* saveAccount({ balance, db, draft, onFailure, onSaved, target }: AccountSave) {
        yield* Effect.gen(function* write() {
            if (target.mode === "create") {
                yield* accountsRepo.create(db, { ...draft, initialBalance: balance });
                return;
            }
            const initialBalance =
                target.reopenAt == null
                    ? target.initialBalance
                    : yield* openingForBalance(db, target.id, balance, draft.currency, target.reopenAt);
            yield* accountsRepo.update(db, target.id, { ...draft, initialBalance });
        }).pipe(tapFailure(onFailure));
        yield* Effect.sync(onSaved).pipe(tapFailure(onFailure));
    })
);

interface TransferSave {
    db: Database;
    id: string | null;
    input: TransferInput;
    notice?: Parameters<typeof notifySaved>[0];
    source: "form" | "voice";
}

export const saveTransferCommand = accountsCommand(
    "save-transfer",
    Effect.fn("Accounts.saveTransfer")(function* saveTransfer({ db, id, input, notice, source }: TransferSave) {
        const mode = id == null ? "create" : "edit";
        const savedId =
            id == null
                ? yield* transfersRepo.create(db, input)
                : yield* transfersRepo.update(db, id, input).pipe(Effect.as(id));
        if (mode === "create") {
            freshEntries.mark(savedId, input.date);
            if (notice) {
                notifySaved(notice);
            }
        }
        posthog?.capture("transfer_saved", {
            cross_currency: input.fromCurrency !== input.toCurrency,
            has_fee: Object.values(input.fees ?? {}).some((fee) => fee.amount > 0),
            mode,
            source,
        });
        return savedId;
    })
);

interface BalanceCheck {
    account: Pick<Account, "currency" | "id">;
    db: Database;
    difference: number;
    note: string;
}

export const checkBalanceCommand = accountsCommand("check-balance", ({ account, db, difference, note }: BalanceCheck) =>
    accountsRepo.markChecked(db, account, new Date(), difference === 0 ? undefined : { amount: difference, note })
);

export const setAccountArchivedCommand = accountsCommand(
    "set-archived",
    ({ archived, db, id }: { archived: boolean; db: Database; id: string }) =>
        archived ? accountsRepo.archive(db, id) : accountsRepo.restore(db, id)
);

export const reorderAccountsCommand = accountsCommand("reorder", (input: { db: Database; orderedIds: string[] }) =>
    accountsRepo.reorder(input.db, input.orderedIds)
);
