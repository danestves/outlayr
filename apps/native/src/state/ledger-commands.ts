import * as Effect from "effect/Effect";

import type { LastImport } from "@/data/last-import";
import { undoMoneyManagerImport } from "@/data/money-manager-import-core";
import { transactionsRepo } from "@/data/transactions-core";
import { applyImport, undoCsvImport } from "@/data/transfer-core";
import type { ImportPlan } from "@/data/transfer-core";
import type { Database } from "@/db/client";
import { attachImportLogos } from "@/lib/import-logo-attach";
import { appRuntime } from "@/lib/runtime";

import { createRuntimeCommand } from "./atom-command";

const ledgerCommand = <W, A, E>(label: string, execute: (input: W) => Effect.Effect<A, E>) =>
    createRuntimeCommand(appRuntime, { execute, label: `ledger:${label}` });

export const restoreTransactionCommand = ledgerCommand("restore-transaction", (input: { db: Database; id: string }) =>
    transactionsRepo.restore(input.db, input.id)
);

export const importWithLogosCommand = ledgerCommand("import-with-logos", (input: { db: Database; plan: ImportPlan }) =>
    attachImportLogos(input.plan.entries).pipe(
        Effect.catchCause(() => Effect.succeed(input.plan.entries)),
        Effect.flatMap((entries) => applyImport(input.db, { ...input.plan, entries }))
    )
);

export const undoImportCommand = ledgerCommand(
    "undo-import",
    Effect.fn("Ledger.undoImport")(function* undoImport(input: { db: Database; kind: LastImport["kind"] }) {
        return input.kind === "csv" ? yield* undoCsvImport(input.db) : yield* undoMoneyManagerImport(input.db);
    })
);
