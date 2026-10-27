import * as Effect from "effect/Effect";

import { reconcileOnce } from "@/data/adoption-retry";
import type { AdoptionSlot, ReconciledStatus } from "@/data/adoption-retry";
import type { Database } from "@/db/client";
import { appRuntime } from "@/lib/runtime";

import { createRuntimeCommand } from "./atom-command";
import { reconcileAdoption } from "./lifecycle-commands";

interface ReconcileInput {
    db: Database;
    report: (status: ReconciledStatus) => void;
    slot: AdoptionSlot;
}

const reconcileAndReport = ({ db, report, slot }: ReconcileInput) =>
    reconcileOnce(slot, reconcileAdoption({ accountId: slot.accountId, db })).pipe(
        Effect.flatMap((status) => Effect.sync(() => report(status)))
    );

export const reconcileLedgerCommand = createRuntimeCommand(appRuntime, {
    execute: reconcileAndReport,
    label: "adoption:reconcile-ledger",
});

export const retryLedgerReconcileCommand = createRuntimeCommand(appRuntime, {
    execute: (input: ReconcileInput) => input.slot.retry.run(reconcileAndReport(input)),
    label: "adoption:retry-reconcile-ledger",
});
