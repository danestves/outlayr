import * as Effect from "effect/Effect";

import { openingForBalance } from "@/data/accounts";
import { accountsRepo } from "@/data/accounts-core";
import type { AccountInput } from "@/data/accounts-core";
import { transfersRepo } from "@/data/transfers-core";
import type { TransferInput } from "@/data/transfers-core";
import type { Database } from "@/db/client";
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

export const saveTransferCommand = accountsCommand(
    "save-transfer",
    Effect.fn("Accounts.saveTransfer")(function* saveTransfer(input: {
        db: Database;
        id: string | null;
        input: TransferInput;
    }) {
        if (input.id == null) {
            return yield* transfersRepo.create(input.db, input.input);
        }
        yield* transfersRepo.update(input.db, input.id, input.input);
        return input.id;
    })
);

export const reorderAccountsCommand = accountsCommand("reorder", (input: { db: Database; orderedIds: string[] }) =>
    accountsRepo.reorder(input.db, input.orderedIds)
);
