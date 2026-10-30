import * as Effect from "effect/Effect";

import {
    applyMoneyManagerImport,
    readLedgerState,
    undoMoneyManagerImport,
    verifyImportedBalances,
} from "@/data/money-manager-import-core";
import type { Database } from "@/db/client";
import { analyzeSnapshot } from "@/domain/money-manager/analysis";
import { defaultChoices } from "@/domain/money-manager/defaults";
import { buildImportPlan } from "@/domain/money-manager/plan";
import type { MmArchiveError } from "@/domain/money-manager/types";
import { pickBackupFile, readBackupFile } from "@/lib/money-manager-file";
import type { BackupSource } from "@/lib/money-manager-file";
import { moneyManagerSession } from "@/lib/money-manager-session";
import type { MoneyManagerDraft } from "@/lib/money-manager-session";

import { createCommand } from "./atom-command";

export type BackupLoad =
    | { kind: "cancelled" }
    | { kind: "failed"; error: MmArchiveError; fileName: string }
    | { kind: "ready" };

/** Without a `source` it asks for a file first; "Open in" and the share sheet hand one over. */
export const loadMoneyManagerBackupCommand = createCommand({
    execute: Effect.fn("MoneyManager.loadBackup")(function* loadBackup(input: {
        db: Database;
        source: BackupSource | null;
    }) {
        const source = input.source ?? (yield* pickBackupFile());
        if (source === null) {
            return { kind: "cancelled" } satisfies BackupLoad;
        }
        const reading = yield* readBackupFile(source);
        if (!reading.ok) {
            moneyManagerSession.fail({ error: reading.error, fileName: source.name });
            return { error: reading.error, fileName: source.name, kind: "failed" } satisfies BackupLoad;
        }
        const ledger = yield* readLedgerState(input.db);
        const analysis = analyzeSnapshot(reading.snapshot, ledger);
        moneyManagerSession.begin({
            analysis,
            choices: defaultChoices(reading.snapshot, analysis, ledger),
            fileName: source.name,
            ledger,
            snapshot: reading.snapshot,
            source,
        });
        return { kind: "ready" } satisfies BackupLoad;
    }),
    label: "money-manager:load-backup",
});

export const applyMoneyManagerImportCommand = createCommand({
    execute: Effect.fn("MoneyManager.apply")(function* apply(input: { db: Database; draft: MoneyManagerDraft }) {
        const { analysis, choices, ledger, snapshot } = input.draft;
        const plan = buildImportPlan(snapshot, analysis, choices, ledger);
        moneyManagerSession.setProgress({ done: 0, total: plan.entries.length + plan.transfers.length });
        const record = yield* applyMoneyManagerImport(input.db, plan, (done, total) =>
            moneyManagerSession.setProgress({ done, total })
        );
        // The rows are committed by now; a failed check only hides the balances, a retry would import twice.
        const checks = yield* verifyImportedBalances(input.db, record).pipe(Effect.orElseSucceed(() => []));
        moneyManagerSession.finish({ checks, record });
        return record;
    }),
    label: "money-manager:apply",
});

export const undoMoneyManagerImportCommand = createCommand({
    execute: Effect.fn("MoneyManager.undo")(function* undo(input: { db: Database }) {
        return yield* undoMoneyManagerImport(input.db);
    }),
    label: "money-manager:undo",
});
