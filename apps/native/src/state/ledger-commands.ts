import type * as Effect from "effect/Effect";

import { attachmentsRepo } from "@/data/attachments-core";
import type { AttachmentDraft } from "@/data/attachments-core";
import { valuationCoverage } from "@/data/canonicalize-backfill";
import { rememberFeeCategory } from "@/data/card-fees-core";
import { commitDeferredDelete } from "@/data/deferred-delete-registry";
import type { DeferredDeleteKind } from "@/data/deferred-delete-registry";
import { queueEnrichment } from "@/data/enrichment-queue-core";
import { replateStoredLogos } from "@/data/logo-replate-core";
import type { LogoReplateDeps } from "@/data/logo-replate-core";
import { recallMerchant } from "@/data/merchant-book-core";
import { rememberedCategoryFor } from "@/data/merchant-history-core";
import { applyMerchantToSiblings } from "@/data/merchant-siblings-core";
import type { MerchantSiblingsInput } from "@/data/merchant-siblings-core";
import { reconcilePhotos } from "@/data/photo-store-core";
import type { PhotoFiles } from "@/data/photo-store-core";
import { downloadEveryPhoto } from "@/data/photo-sync-core";
import type { PhotoTransport } from "@/data/photo-sync-core";
import { backfillRecurring } from "@/data/recurrence-backfill";
import { pendingReminderPlan } from "@/data/subscription-reminders-core";
import { tagsRepo } from "@/data/tags-core";
import { lastLoggedEntry, transactionsRepo } from "@/data/transactions-core";
import type { TransactionInput } from "@/data/transactions-core";
import type { Database } from "@/db/client";
import type { TimeOfDay } from "@/domain/reminder";
import { appRuntime } from "@/lib/runtime";

import { createRuntimeCommand, runAtomCommand, SILENT, unwrapAtomCommand } from "./atom-command";
import type { AtomCommand } from "./atom-command";
import { appAtomRegistry } from "./atom-registry";

const ledgerCommand = <W, A, E>(label: string, execute: (input: W) => Effect.Effect<A, E>) =>
    createRuntimeCommand(appRuntime, { execute, label: `ledger:${label}` });

export async function runLedgerCommand<W, A>(command: AtomCommand<W, A, unknown>, input: W): Promise<A> {
    return unwrapAtomCommand(await runAtomCommand(appAtomRegistry, command, input, SILENT));
}

export const commitDeferredDeleteCommand = ledgerCommand(
    "commit-deferred-delete",
    (input: { db: Database; id: string; kind: DeferredDeleteKind }) =>
        commitDeferredDelete(input.kind, input.db, input.id)
);

export const createTransactionCommand = ledgerCommand(
    "create-transaction",
    (input: { attachments?: readonly AttachmentDraft[]; db: Database; entry: TransactionInput }) =>
        transactionsRepo.create(input.db, input.entry, {
            inSameTransaction:
                input.attachments === undefined
                    ? undefined
                    : (id) => attachmentsRepo.writeFor(input.db, id, input.attachments ?? []),
        })
);

export const restoreTransactionCommand = ledgerCommand("restore-transaction", (input: { db: Database; id: string }) =>
    transactionsRepo.restore(input.db, input.id)
);

export const lastLoggedEntryCommand = ledgerCommand("last-logged-entry", (input: { db: Database; now: Date }) =>
    lastLoggedEntry(input.db, input.now)
);

export const backfillRecurringCommand = ledgerCommand("backfill-recurring", (input: { db: Database; id: string }) =>
    backfillRecurring(input.db, input.id)
);

export const ensureTagCommand = ledgerCommand("ensure-tag", (input: { db: Database; name: string }) =>
    tagsRepo.ensureTag(input.db, input.name)
);

export const rememberFeeCategoryCommand = ledgerCommand(
    "remember-fee-category",
    (input: { categoryId: string; db: Database }) => rememberFeeCategory(input.db, input.categoryId)
);

export const rememberedCategoryCommand = ledgerCommand(
    "remembered-category",
    (input: { db: Database; income: boolean; key: string }) => rememberedCategoryFor(input.db, input.key, input.income)
);

export const recallMerchantCommand = ledgerCommand(
    "recall-merchant",
    (input: { currency: string | undefined; db: Database; name: string }) =>
        recallMerchant(input.db, input.name, input.currency)
);

export const carryMerchantLookupCommand = ledgerCommand(
    "carry-merchant-lookup",
    (input: { db: Database; siblings: MerchantSiblingsInput }) => applyMerchantToSiblings(input.db, input.siblings)
);

export const queueEnrichmentCommand = ledgerCommand("queue-enrichment", (input: { db: Database; id: string }) =>
    queueEnrichment(input.db, input.id)
);

export const replateLogosCommand = ledgerCommand("replate-logos", (input: { db: Database; deps: LogoReplateDeps }) =>
    replateStoredLogos(input.db, input.deps)
);

export const pendingReminderPlanCommand = ledgerCommand(
    "pending-reminder-plan",
    (input: { db: Database; now: Date; time: TimeOfDay }) => pendingReminderPlan(input.db, input.now, input.time)
);

export const valuationCoverageCommand = ledgerCommand("valuation-coverage", (db: Database) => valuationCoverage(db));

export const reconcilePhotosCommand = ledgerCommand(
    "reconcile-photos",
    (input: { db: Database; files: PhotoFiles; nowMs: number }) => reconcilePhotos(input.db, input.files, input.nowMs)
);

export const downloadEveryPhotoCommand = ledgerCommand(
    "download-every-photo",
    (input: { db: Database; files: PhotoFiles; transport: PhotoTransport }) =>
        downloadEveryPhoto(input.db, input.files, input.transport)
);
