import { isNotNull } from "drizzle-orm";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import * as Effect from "effect/Effect";
import { deleteDatabaseAsync } from "expo-sqlite";

import { closeDatabase, openDatabase } from "@/db/client";
import type { Database } from "@/db/client";
import { profiles } from "@/db/schema";
import { databaseNameFor, PERSONAL_DATABASE } from "@/domain/profiles";
import { activeProfileId } from "@/lib/active-profile";

import migrationsBundle from "../../drizzle/migrations";

let registry: { db: Database; own: boolean } | null = null;

export const openProfileRegistry = Effect.fn("ProfileRegistry.open")(function* openProfileRegistry(active: Database) {
    if (activeProfileId() === undefined) {
        registry = { db: active, own: false };
        const deleted = yield* Effect.tryPromise(() =>
            active.select({ id: profiles.id }).from(profiles).where(isNotNull(profiles.deletedAt))
        );
        for (const { id } of deleted) {
            yield* Effect.tryPromise(() => deleteDatabaseAsync(databaseNameFor(id))).pipe(Effect.ignore);
        }
        return;
    }
    if (registry?.own) {
        return;
    }
    const personal = yield* Effect.try(() => openDatabase(PERSONAL_DATABASE));
    yield* Effect.tryPromise(() => migrate(personal, migrationsBundle));
    registry = { db: personal, own: true };
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
        profileRegistry().select({ id: profiles.id }).from(profiles).limit(1).all().length > 0
    );
}
