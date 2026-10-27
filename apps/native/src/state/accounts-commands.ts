import type * as Effect from "effect/Effect";

import { openingForBalance, settledBalanceAt } from "@/data/accounts";
import { accountsRepo, rememberLastUsedAccount } from "@/data/accounts-core";
import type { Account, AccountInput } from "@/data/accounts-core";
import type { SpendDb } from "@/data/budget-spent";
import { loadContributions } from "@/data/insights";
import { applyImport, exportTransactionsCsv } from "@/data/transfer-core";
import type { ImportPlan } from "@/data/transfer-core";
import { transfersRepo } from "@/data/transfers-core";
import type { TransferInput } from "@/data/transfers-core";
import { loadValuation } from "@/data/valuation-source";
import type { Valuation } from "@/data/valuation-source";
import { buildWalletPush } from "@/data/wallet-push";
import type { Database } from "@/db/client";
import { appRuntime } from "@/lib/runtime";

import { createRuntimeCommand, runAtomCommand, SILENT, unwrapAtomCommand } from "./atom-command";
import type { AtomCommand } from "./atom-command";
import { appAtomRegistry } from "./atom-registry";

const accountsCommand = <W, A, E>(label: string, execute: (input: W) => Effect.Effect<A, E>) =>
    createRuntimeCommand(appRuntime, { execute, label: `accounts:${label}` });

export const createAccountCommand = accountsCommand("create", (input: { db: Database; input: AccountInput }) =>
    accountsRepo.create(input.db, input.input)
);

export const updateAccountCommand = accountsCommand(
    "update",
    (input: { db: Database; id: string; patch: Partial<AccountInput> }) =>
        accountsRepo.update(input.db, input.id, input.patch)
);

export const reorderAccountsCommand = accountsCommand("reorder", (input: { db: Database; orderedIds: string[] }) =>
    accountsRepo.reorder(input.db, input.orderedIds)
);

export const rememberLastUsedAccountCommand = accountsCommand(
    "remember-last-used",
    (input: { db: Database; id: string }) => rememberLastUsedAccount(input.db, input.id)
);

export const openingForBalanceCommand = accountsCommand(
    "opening-for-balance",
    (input: { accountId: string; balance: number; currency: string; db: Database; now: Date }) =>
        openingForBalance(input.db, input.accountId, input.balance, input.currency, input.now)
);

export const settledBalanceAtCommand = accountsCommand(
    "settled-balance-at",
    (input: { account: Account; db: Database; now: Date; valuation: Valuation }) =>
        settledBalanceAt(input.db, input.account, input.valuation, input.now)
);

export const createTransferCommand = accountsCommand(
    "create-transfer",
    (input: { db: Database; input: TransferInput }) => transfersRepo.create(input.db, input.input)
);

export const updateTransferCommand = accountsCommand(
    "update-transfer",
    (input: { db: Database; id: string; input: TransferInput }) => transfersRepo.update(input.db, input.id, input.input)
);

export const exportTransactionsCsvCommand = accountsCommand("export-csv", (db: Database) => exportTransactionsCsv(db));

export const applyImportCommand = accountsCommand("apply-import", (input: { db: Database; plan: ImportPlan }) =>
    applyImport(input.db, input.plan)
);

export const loadContributionsCommand = accountsCommand(
    "load-contributions",
    (input: { db: SpendDb; now: Date; valuation: Valuation }) => loadContributions(input.db, input.now, input.valuation)
);

export const loadValuationCommand = accountsCommand("load-valuation", (db: SpendDb) => loadValuation(db));

export const buildWalletPushCommand = accountsCommand("build-wallet-push", (db: Database) => buildWalletPush(db));

export async function runAccountsCommand<W, A, E>(command: AtomCommand<W, A, E>, input: W): Promise<A> {
    return unwrapAtomCommand(await runAtomCommand(appAtomRegistry, command, input, SILENT));
}
