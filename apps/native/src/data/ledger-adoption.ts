import { count, gt, isNotNull, isNull, or } from "drizzle-orm";

import type { Database } from "@/db/client";
import { accounts, budgets, categories, mainBudget, transactions, transfers } from "@/db/schema";
import type { AdoptionActions, LocalLedger, RemoteLedger } from "@/domain/ledger-adoption";
import {
    enableSyncForAccountCommand,
    enqueueAllForSyncCommand,
    getSyncAccountSubjectCommand,
    hasResidualSyncStateCommand,
    isSyncEnabledCommand,
    resetSyncForAccountSwitchCommand,
    runSyncCommand,
    setSyncEnabledCommand,
} from "@/state/sync-commands";

import { getMeta, META_KEYS, setMeta } from "./app-meta-core";
import { SEEDED_CATEGORY_NAMES } from "./categories-core";

const SEEDED_CATEGORY_COUNT = SEEDED_CATEGORY_NAMES.expense.length + SEEDED_CATEGORY_NAMES.income.length;

// A build without an engine reports `unknown` and every plan defers, leaving both ledgers untouched.
export interface AdoptionEngine {
    accountLedger: () => Promise<RemoteLedger>;
    discardAccountLedger: () => Promise<void>;
    replaceFromAccount: () => Promise<void>;
}

// Tombstones count as content: a row deleted offline is a decision this device made. `seedCategories` stamps every
// row with `dateCreated` equal to `updatedAt`, so an edit, deletion or different count reads as touched. Every
// uncertainty resolves toward `populated`: wrong that way asks a question, wrong the other way destroys a ledger.
export async function localLedgerState(db: Database): Promise<LocalLedger> {
    const moneyTables = [transactions, budgets, mainBudget, accounts, transfers];
    const moneyCounts = await Promise.all(moneyTables.map((table) => db.select({ total: count() }).from(table)));
    if (moneyCounts.some((rows) => (rows[0]?.total ?? 0) > 0)) {
        return "populated";
    }

    const [all] = await db.select({ total: count() }).from(categories);
    if ((all?.total ?? 0) !== SEEDED_CATEGORY_COUNT) {
        return "populated";
    }
    const [touched] = await db
        .select({ total: count() })
        .from(categories)
        .where(
            or(
                isNotNull(categories.deletedAt),
                isNull(categories.dateCreated),
                gt(categories.updatedAt, categories.dateCreated)
            )
        );
    return (touched?.total ?? 0) > 0 ? "populated" : "empty";
}

export async function adoptedAccount(db: Database): Promise<string | null> {
    return await getMeta(db, META_KEYS.ledgerAdoption);
}

export async function markAdopted(db: Database, accountId: string): Promise<void> {
    await setMeta(db, META_KEYS.ledgerAdoption, accountId);
}

export async function prepareAccountAdoption(db: Database, accountId: string): Promise<void> {
    const [marker, syncSubject, residual] = await Promise.all([
        adoptedAccount(db),
        runSyncCommand(getSyncAccountSubjectCommand, db),
        runSyncCommand(hasResidualSyncStateCommand, db),
    ]);
    const sameSubject = syncSubject === accountId;
    if ((marker === accountId && sameSubject) || (marker === null && sameSubject && !residual)) {
        return;
    }
    if (marker !== null || syncSubject !== null || residual) {
        await runSyncCommand(resetSyncForAccountSwitchCommand, db);
    }
}

// Order matters: the account's rows go first so a later failure leaves this ledger whole and retryable; the local wipe
// runs while the sync gate is shut so triggers don't queue tombstones for discarded rows; only then does the gate open
// and the backlog queue (`enqueueAllForSync` warns about this ordering).
export async function runAdoption(
    db: Database,
    engine: AdoptionEngine | null,
    actions: AdoptionActions,
    accountId?: string
): Promise<boolean> {
    if (actions.wipeLocal || actions.wipeAccount) {
        if (!engine) {
            throw new Error("Destructive adoption actions need a sync engine.");
        }
        if (actions.wipeAccount) {
            await engine.discardAccountLedger();
        }
        if (actions.wipeLocal) {
            await engine.replaceFromAccount();
        }
    }

    const enabledForAttempt = accountId !== undefined && !(await runSyncCommand(isSyncEnabledCommand, db));
    if (enabledForAttempt) {
        await runSyncCommand(enableSyncForAccountCommand, { accountId, db });
    } else if (!accountId) {
        await runSyncCommand(setSyncEnabledCommand, { db, enabled: true });
    }

    try {
        if (actions.pushLocal) {
            await runSyncCommand(enqueueAllForSyncCommand, db);
        }
        return enabledForAttempt;
    } catch (error: unknown) {
        if (enabledForAttempt) {
            await runSyncCommand(resetSyncForAccountSwitchCommand, db);
        }
        throw error;
    }
}

export async function completeAdoption(
    db: Database,
    engine: AdoptionEngine | null,
    actions: AdoptionActions,
    accountId: string,
    persistMarker: (target: Database, subject: string) => Promise<void> = markAdopted
): Promise<void> {
    const enabledForAttempt = await runAdoption(db, engine, actions, accountId);
    try {
        await persistMarker(db, accountId);
    } catch (error: unknown) {
        if (enabledForAttempt) {
            await runSyncCommand(resetSyncForAccountSwitchCommand, db);
        }
        throw error;
    }
}
