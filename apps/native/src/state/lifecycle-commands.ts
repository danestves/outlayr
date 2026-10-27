import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";

import { buildArchive, restoreArchive } from "@/data/archive-core";
import type { SpendDb } from "@/data/budget-spent";
import { eraseData } from "@/data/erase";
import { completeAdoption, localLedgerState, prepareAccountAdoption, runAdoption } from "@/data/ledger-adoption";
import { deferAccount, finishOnboarding, markReminderChosen } from "@/data/onboarding-core";
import {
    appliedWriteIds,
    cardStillAsks,
    drainPendingWrites,
    fileWaitingPurchases,
    pendingWriteTxId,
    pickCardAccount,
    writeIdsByTransaction,
} from "@/data/pending-writes-core";
import { reconcilePhotos } from "@/data/photo-store-core";
import type { PhotoFiles } from "@/data/photo-store-core";
import { downloadEveryPhoto } from "@/data/photo-sync-core";
import { isSyncEnabled } from "@/data/sync-outbox-core";
import { closeDatabase } from "@/db/client";
import type { Database } from "@/db/client";
import { adoptionActions, adoptionPlan } from "@/domain/ledger-adoption";
import type { AdoptionActions } from "@/domain/ledger-adoption";
import { adoptionEngine } from "@/lib/adoption-engine";
import { photoTransport } from "@/lib/convex";
import { cancelLogoBackfill } from "@/lib/logo-backfill";
import { appRuntime } from "@/lib/runtime";

import { createRuntimeCommand, runAtomCommand, SILENT, unwrapAtomCommand } from "./atom-command";
import type { AtomCommand } from "./atom-command";
import { appAtomRegistry } from "./atom-registry";

export const cancelLogoBackfillCommand = createRuntimeCommand(appRuntime, {
    execute: (_input: undefined) => cancelLogoBackfill(),
    label: "lifecycle:cancel-logo-backfill",
});

export const finishOnboardingCommand = createRuntimeCommand(appRuntime, {
    execute: (db: Database) => finishOnboarding(db),
    label: "onboarding:finish",
});

export const markReminderChosenCommand = createRuntimeCommand(appRuntime, {
    execute: (db: Database) => markReminderChosen(db),
    label: "onboarding:mark-reminder-chosen",
});

export const deferAccountCommand = createRuntimeCommand(appRuntime, {
    execute: (db: Database) => deferAccount(db),
    label: "onboarding:defer-account",
});

export const eraseDataCommand = createRuntimeCommand(appRuntime, {
    execute: (input: {
        db: Database;
        residue: Parameters<typeof eraseData>[2];
        scope: Parameters<typeof eraseData>[1];
    }) => eraseData(input.db, input.scope, input.residue),
    label: "lifecycle:erase-data",
});

export const exportArchive = Effect.fn("Lifecycle.exportArchive")(function* exportArchive(input: {
    db: Database;
    files: PhotoFiles;
    photos: () => Record<string, string>;
}) {
    if (yield* isSyncEnabled(input.db)) {
        yield* downloadEveryPhoto(input.db, input.files, yield* photoTransport()).pipe(
            Effect.catchCause((cause) =>
                Cause.hasInterruptsOnly(cause)
                    ? Effect.failCause(cause)
                    : Effect.logWarning("[outlayr] fetching missing photos before export failed", Cause.squash(cause))
            )
        );
    }
    return yield* buildArchive(input.db, new Date(), input.photos());
});

export const exportArchiveCommand = createRuntimeCommand(appRuntime, {
    execute: exportArchive,
    label: "lifecycle:export-archive",
});

export const restoreArchiveWithPhotos = Effect.fn("Lifecycle.restoreArchive")(
    function* restoreArchiveWithPhotos(input: {
        db: Database;
        document: Parameters<typeof restoreArchive>[1];
        files: PhotoFiles;
    }) {
        yield* restoreArchive(input.db, input.document);
        yield* reconcilePhotos(input.db, input.files, Date.now());
    }
);

export const restoreArchiveCommand = createRuntimeCommand(appRuntime, {
    execute: restoreArchiveWithPhotos,
    label: "lifecycle:restore-archive",
});

export const closeDatabaseCommand = createRuntimeCommand(appRuntime, {
    execute: (db: Database) => closeDatabase(db),
    label: "lifecycle:close-database",
});

export const reconcileAdoption = Effect.fn("Adoption.reconcile")(function* reconcile(input: {
    accountId: string;
    db: Database;
}) {
    const { accountId, db } = input;
    yield* prepareAccountAdoption(db, accountId);
    const engine = adoptionEngine(db);
    const remote = engine ? yield* engine.accountLedger() : "unknown";
    const plan = adoptionPlan(yield* localLedgerState(db), remote);
    if (plan === "ask") {
        return "ask";
    }
    if (plan === "defer") {
        return "defer";
    }
    const actions = adoptionActions(plan);
    if (actions) {
        yield* completeAdoption(db, engine, actions, accountId);
    }
    return "settled";
});

export const reconcileAdoptionCommand = createRuntimeCommand(appRuntime, {
    execute: reconcileAdoption,
    label: "adoption:reconcile",
});

export const completeAdoptionCommand = createRuntimeCommand(appRuntime, {
    execute: (input: { accountId: string; actions: AdoptionActions; db: Database }) =>
        completeAdoption(input.db, adoptionEngine(input.db), input.actions, input.accountId),
    label: "adoption:complete",
});

export const runAdoptionCommand = createRuntimeCommand(appRuntime, {
    execute: (input: { accountId: string; actions: AdoptionActions; db: Database }) =>
        runAdoption(input.db, adoptionEngine(input.db), input.actions, input.accountId),
    label: "adoption:run",
});

type Claim = Parameters<typeof drainPendingWrites>[1];
type Release = Parameters<typeof drainPendingWrites>[2];

export const drainPendingWritesCommand = createRuntimeCommand(appRuntime, {
    execute: (input: { claim: Claim; db: Database; release: Release }) =>
        drainPendingWrites(input.db, input.claim, input.release),
    label: "pending-writes:drain",
});

export const fileWaitingPurchasesCommand = createRuntimeCommand(appRuntime, {
    execute: (db: Database) => fileWaitingPurchases(db),
    label: "pending-writes:file-waiting",
});

export const pendingWriteTxIdCommand = createRuntimeCommand(appRuntime, {
    execute: (input: { db: Database; id: string }) => pendingWriteTxId(input.db, input.id),
    label: "pending-writes:tx-id",
});

export const cardStillAsksCommand = createRuntimeCommand(appRuntime, {
    execute: (input: { db: Database; text: string }) => cardStillAsks(input.db, input.text),
    label: "pending-writes:card-asks",
});

export const appliedWriteIdsCommand = createRuntimeCommand(appRuntime, {
    execute: (input: { db: SpendDb; since: number }) => appliedWriteIds(input.db, input.since),
    label: "pending-writes:applied-ids",
});

export const writeIdsByTransactionCommand = createRuntimeCommand(appRuntime, {
    execute: (db: SpendDb) => writeIdsByTransaction(db),
    label: "pending-writes:ids-by-transaction",
});

export const pickCardAccountCommand = createRuntimeCommand(appRuntime, {
    execute: (input: { accountId: string | null; db: Database; text: string }) =>
        pickCardAccount(input.db, input.text, input.accountId),
    label: "pending-writes:pick-card-account",
});

export async function runLifecycleCommand<W, A>(command: AtomCommand<W, A, unknown>, input: W): Promise<A> {
    return unwrapAtomCommand(await runAtomCommand(appAtomRegistry, command, input, SILENT));
}
