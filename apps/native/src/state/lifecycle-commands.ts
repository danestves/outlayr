import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";

import { buildArchive, restoreArchive } from "@/data/archive-core";
import { eraseData } from "@/data/erase";
import { completeAdoption, localLedgerState, prepareAccountAdoption, runAdoption } from "@/data/ledger-adoption";
import { deferAccount, finishOnboarding } from "@/data/onboarding-core";
import { pickCardAccount } from "@/data/pending-writes-core";
import { reconcilePhotos } from "@/data/photo-store-core";
import type { PhotoFiles } from "@/data/photo-store-core";
import { downloadEveryPhoto } from "@/data/photo-sync-core";
import { isSyncEnabled } from "@/data/sync-outbox-core";
import type { Database } from "@/db/client";
import { adoptionActions, adoptionPlan } from "@/domain/ledger-adoption";
import type { AdoptionActions } from "@/domain/ledger-adoption";
import { adoptionEngine } from "@/lib/adoption-engine";
import { photoTransport } from "@/lib/cloud-photos";
import { appRuntime } from "@/lib/runtime";

import { createRuntimeCommand } from "./atom-command";

export const finishOnboardingCommand = createRuntimeCommand(appRuntime, {
    execute: (db: Database) => finishOnboarding(db),
    label: "onboarding:finish",
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

export const pickCardAccountCommand = createRuntimeCommand(appRuntime, {
    execute: (input: { accountId: string | null; db: Database; text: string }) =>
        pickCardAccount(input.db, input.text, input.accountId),
    label: "pending-writes:pick-card-account",
});
