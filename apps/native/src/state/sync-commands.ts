import * as Effect from "effect/Effect";

import { applyPulledRows } from "@/data/sync-engine-core";
import {
    enableSyncForAccount,
    enqueueAllForSync,
    getOrCreateDeviceId,
    getSyncAccountSubject,
    hasResidualSyncState,
    isSyncEnabled,
    resetSyncForAccountSwitch,
    setSyncCursor,
    setSyncEnabled,
} from "@/data/sync-outbox-core";
import type { Database } from "@/db/client";
import { appRuntime } from "@/lib/runtime";

import { createRuntimeCommand, runAtomCommand, SILENT, unwrapAtomCommand } from "./atom-command";
import type { AtomCommand } from "./atom-command";
import { appAtomRegistry } from "./atom-registry";

const syncCommand = <W, A>(label: string, execute: (input: W) => Effect.Effect<A, { readonly cause: unknown }>) =>
    createRuntimeCommand(appRuntime, {
        execute: (input: W) => execute(input).pipe(Effect.mapError((error) => error.cause)),
        label: `sync:${label}`,
    });

export const isSyncEnabledCommand = syncCommand("is-enabled", (db: Database) => isSyncEnabled(db));

export const setSyncEnabledCommand = syncCommand("set-enabled", (input: { db: Database; enabled: boolean }) =>
    setSyncEnabled(input.db, input.enabled)
);

export const getSyncAccountSubjectCommand = syncCommand("account-subject", (db: Database) => getSyncAccountSubject(db));

export const hasResidualSyncStateCommand = syncCommand("has-residual-state", (db: Database) =>
    hasResidualSyncState(db)
);

export const enableSyncForAccountCommand = syncCommand(
    "enable-for-account",
    (input: { accountId: string; db: Database }) => enableSyncForAccount(input.db, input.accountId)
);

export const enqueueAllForSyncCommand = syncCommand("enqueue-all", (db: Database) => enqueueAllForSync(db));

export const resetSyncForAccountSwitchCommand = syncCommand("reset-for-account-switch", (db: Database) =>
    resetSyncForAccountSwitch(db)
);

export const getOrCreateDeviceIdCommand = syncCommand("device-id", (db: Database) => getOrCreateDeviceId(db));

export const setSyncCursorCommand = syncCommand("set-cursor", (input: { cursor: number; db: Database }) =>
    setSyncCursor(input.db, input.cursor)
);

export const applyPulledRowsCommand = syncCommand(
    "apply-pulled-rows",
    (input: { db: Database; now: Date; page: Parameters<typeof applyPulledRows>[1] }) =>
        applyPulledRows(input.db, input.page, input.now)
);

export async function runSyncCommand<W, A>(command: AtomCommand<W, A, unknown>, input: W): Promise<A> {
    return unwrapAtomCommand(await runAtomCommand(appAtomRegistry, command, input, SILENT));
}
