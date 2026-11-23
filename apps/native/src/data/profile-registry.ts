import { isNotNull, isNull } from "drizzle-orm";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import * as Effect from "effect/Effect";

import { SYNCED_SPECS } from "@/data/sync-tables";
import { closeDatabase, openDatabase } from "@/db/client";
import type { Database } from "@/db/client";
import { ensureOutboxTriggers } from "@/db/outbox-triggers";
import { profiles } from "@/db/schema";
import { parseProfileId, PERSONAL_DATABASE } from "@/domain/profiles";
import { activeProfileId } from "@/lib/active-profile";
import { hasPendingQueueWork, retireLedger } from "@/lib/widget-bridge";

import migrationsBundle from "../../drizzle/migrations";
import { deleteProfileLedger, profileLedgerExists } from "./profile-ledger-files";

let registry: { db: Database; own: boolean } | null = null;

/** Tombstones arrive from the server, so this reruns after a Personal sync, not only when the registry opens. */
export const retireDeletedProfiles = Effect.fn("ProfileRegistry.retireDeleted")(function* retireDeletedProfiles(
    db: Database
) {
    const deleted = yield* Effect.tryPromise(() =>
        db.select({ id: profiles.id }).from(profiles).where(isNotNull(profiles.deletedAt))
    );
    for (const row of deleted) {
        // Registry rows arrive from the server, so an id that names no ledger is not ours to delete.
        const id = parseProfileId(row.id);
        if (id === undefined) {
            continue;
        }
        // A ledger already gone with nothing parked or routed for it was retired by an earlier pass.
        const work = yield* Effect.sync(() => profileLedgerExists(id) || hasPendingQueueWork(id));
        if (!work) {
            continue;
        }
        yield* Effect.sync(() => retireLedger(id));
        yield* deleteProfileLedger(id);
    }
});

export const openProfileRegistry = Effect.fn("ProfileRegistry.open")(function* openProfileRegistry(active: Database) {
    if (activeProfileId() === undefined) {
        registry = { db: active, own: false };
        yield* retireDeletedProfiles(active);
        return;
    }
    if (registry?.own) {
        return;
    }
    // Until `registry` owns this connection nothing else can close it, so no failure or interrupt may land in between.
    yield* Effect.uninterruptible(
        Effect.gen(function* own() {
            const personal = yield* Effect.try(() => openDatabase(PERSONAL_DATABASE));
            yield* Effect.gen(function* install() {
                yield* Effect.tryPromise(() => migrate(personal, migrationsBundle));
                // Profile edits from here must still queue for Personal's push; its triggers are built at boot.
                yield* Effect.try(() => ensureOutboxTriggers(personal, SYNCED_SPECS));
            }).pipe(Effect.onError(() => closeDatabase(personal).pipe(Effect.ignore)));
            registry = { db: personal, own: true };
        })
    );
});

export function profileRegistry(): Database {
    if (registry === null) {
        throw new Error("profileRegistry was read before LocalDatabase.open");
    }
    return registry.db;
}

export const closeProfileRegistry = Effect.fn("ProfileRegistry.close")(function* closeProfileRegistry() {
    const held = registry;
    registry = null;
    if (held?.own) {
        yield* closeDatabase(held.db);
    }
});

export function deviceHasProfiles(): boolean {
    return (
        activeProfileId() !== undefined ||
        profileRegistry().select({ id: profiles.id }).from(profiles).where(isNull(profiles.deletedAt)).limit(1).all()
            .length > 0
    );
}
