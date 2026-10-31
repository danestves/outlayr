import { isNull } from "drizzle-orm";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import * as Effect from "effect/Effect";

import { closeDatabase, openDatabase } from "@/db/client";
import type { Database } from "@/db/client";
import { profiles } from "@/db/schema";
import { newId } from "@/domain/ids";
import { databaseNameFor } from "@/domain/profiles";

import migrationsBundle from "../../drizzle/migrations";
import { bootstrapLocalData } from "./bootstrap";
import { useLiveQuery } from "./live-query";
import { profileRegistry } from "./profile-registry";
import { insertProfile, ProfilesError, seedProfileLedger, tombstoneProfile } from "./profiles-core";
import type { Profile, ProfileIdentity } from "./profiles-core";

export function useProfiles(): Profile[] {
    const registry = profileRegistry();
    return useLiveQuery(profiles, () =>
        registry.select().from(profiles).where(isNull(profiles.deletedAt)).orderBy(profiles.sortOrder)
    );
}

const failed = (operation: "create") => (cause: unknown) => new ProfilesError({ cause, operation });

export const createProfile = Effect.fn("Profiles.create")(function* createProfile(input: {
    currency: string;
    from: Database;
    identity: ProfileIdentity;
    name: string;
}) {
    const id = newId();
    const ledger = yield* Effect.try({ catch: failed("create"), try: () => openDatabase(databaseNameFor(id)) });
    yield* Effect.gen(function* seed() {
        yield* Effect.tryPromise({ catch: failed("create"), try: () => migrate(ledger, migrationsBundle) });
        yield* bootstrapLocalData(ledger);
        yield* seedProfileLedger(input.from, ledger, input.currency);
    }).pipe(Effect.ensuring(closeDatabase(ledger).pipe(Effect.ignore)));
    yield* insertProfile(profileRegistry(), { ...input.identity, id, name: input.name });
    return id;
});

export const deleteProfile = Effect.fn("Profiles.delete")(function* deleteProfile(id: string) {
    yield* tombstoneProfile(profileRegistry(), id);
});
