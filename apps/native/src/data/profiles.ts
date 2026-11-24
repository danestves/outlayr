import { isNull } from "drizzle-orm";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import * as Effect from "effect/Effect";

import { closeDatabase, openDatabase } from "@/db/client";
import type { Database } from "@/db/client";
import { profiles } from "@/db/schema";
import { databaseNameFor, parseProfileId } from "@/domain/profiles";

import migrationsBundle from "../../drizzle/migrations";
import { bootstrapLocalData } from "./bootstrap";
import type { BootstrapOptions } from "./bootstrap";
import { markAdopted } from "./ledger-adoption";
import { useLiveQuery } from "./live-query";
import {
    clearProfileLedgerReady,
    deleteProfileLedger,
    markProfileLedgerReady,
    profileLedgerExists,
    profileLedgerFileExists,
} from "./profile-ledger-files";
import { profileRegistry } from "./profile-registry";
import { createOrUpdateProfile, ProfilesError, seedProfileLedger, tombstoneProfile } from "./profiles-core";
import type { Profile, ProfileIdentity } from "./profiles-core";
import { enableSyncForAccount, getSyncAccountSubject } from "./sync-outbox-core";

export function useProfiles(): Profile[] {
    const registry = profileRegistry();
    const rows = useLiveQuery(profiles, () =>
        registry.select().from(profiles).where(isNull(profiles.deletedAt)).orderBy(profiles.sortOrder)
    );
    return rows.filter((row) => parseProfileId(row.id) !== undefined);
}

const failed = (operation: "create") => (cause: unknown) => new ProfilesError({ cause, operation });

// A replica syncs as the account it copies and never asks to adopt it.
const enableReplica = Effect.fn("Profiles.enableReplica")(function* enableReplica(ledger: Database, accountId: string) {
    yield* enableSyncForAccount(ledger, accountId);
    yield* markAdopted(ledger, accountId);
});

export const prepareProfileLedger = Effect.fn("Profiles.prepareLedger")(function* prepareProfileLedger(
    id: string,
    from: Database,
    currency: string | undefined,
    options: BootstrapOptions = {}
) {
    // An existing file may hold entries from before ready markers, so only a fresh one is safe to delete.
    const existed = profileLedgerFileExists(id);
    if (!existed) {
        // A marker outliving its ledger would bless this one before its seed finishes.
        yield* Effect.try({ catch: failed("create"), try: () => clearProfileLedgerReady(id) });
    }
    const ledger = yield* Effect.try({ catch: failed("create"), try: () => openDatabase(databaseNameFor(id)) });
    const { replicaFor } = options;
    yield* Effect.gen(function* seed() {
        yield* Effect.tryPromise({ catch: failed("create"), try: () => migrate(ledger, migrationsBundle) });
        yield* bootstrapLocalData(ledger, options);
        yield* seedProfileLedger(from, ledger, currency);
        if (replicaFor !== undefined) {
            yield* enableReplica(ledger, replicaFor);
        }
    }).pipe(
        Effect.ensuring(closeDatabase(ledger).pipe(Effect.ignore)),
        Effect.onError(() => (existed ? Effect.void : deleteProfileLedger(id)))
    );
    yield* Effect.try({ catch: failed("create"), try: () => markProfileLedgerReady(id) });
});

/**
 * Sign-out turns sync off on the open ledger and keeps its file and ready marker, so reopening a joined one skips
 * preparation and stays a dead replica. The subject must still name the signed-in account.
 */
export const ensureReplica = Effect.fn("Profiles.ensureReplica")(function* ensureReplica(
    id: string,
    accountId: string
) {
    const ledger = yield* Effect.try({ catch: failed("create"), try: () => openDatabase(databaseNameFor(id)) });
    yield* Effect.gen(function* ensure() {
        const subject = yield* getSyncAccountSubject(ledger);
        if (subject !== null && subject !== accountId) {
            return yield* new ProfilesError({
                cause: new Error("joined ledger syncs as another account"),
                operation: "switch",
            });
        }
        yield* enableReplica(ledger, accountId);
    }).pipe(Effect.ensuring(closeDatabase(ledger).pipe(Effect.ignore)));
});

export const createProfile = Effect.fn("Profiles.create")(function* createProfile(input: {
    currency: string;
    from: Database;
    id: string;
    identity: ProfileIdentity;
    name: string;
}) {
    // A retry after a failed switch must not reseed the ledger the first attempt already finished.
    if (!profileLedgerExists(input.id)) {
        yield* prepareProfileLedger(input.id, input.from, input.currency);
    }
    yield* createOrUpdateProfile(profileRegistry(), { ...input.identity, id: input.id, name: input.name });
    return input.id;
});

export const deleteProfile = Effect.fn("Profiles.delete")(function* deleteProfile(id: string) {
    yield* tombstoneProfile(profileRegistry(), id);
});
