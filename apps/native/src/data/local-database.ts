import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

import { bootstrapLocalData } from "@/data/bootstrap";
import { settleLegacyOnboarding } from "@/data/onboarding-core";
import { openDatabase } from "@/db/client";
import type { Database } from "@/db/client";

import migrationsBundle from "../../drizzle/migrations";

const LocalDatabaseStage = Schema.Literals(["open", "migrate", "bootstrap", "settle"]);

export class LocalDatabaseError extends Schema.TaggedError<LocalDatabaseError>()("LocalDatabaseError", {
    cause: Schema.Defect(),
    stage: LocalDatabaseStage,
}) {
    override get message(): string {
        return `Local data failed to ${this.stage}`;
    }
}

export const OpenConnection = Context.Reference<() => Database>("outlayr/data/LocalDatabase/OpenConnection", {
    defaultValue: () => openDatabase,
});

export class LocalDatabase extends Context.Service<
    LocalDatabase,
    { readonly open: () => Effect.Effect<Database, LocalDatabaseError> }
>()("outlayr/data/LocalDatabase") {}

const failedAt = (stage: typeof LocalDatabaseStage.Type) => (cause: unknown) =>
    new LocalDatabaseError({ cause, stage });

export const make = Effect.gen(function* make() {
    const openConnection = yield* OpenConnection;

    const open = Effect.fn("LocalDatabase.open")(function* open() {
        const db = yield* Effect.try({ catch: failedAt("open"), try: openConnection });
        yield* Effect.tryPromise({ catch: failedAt("migrate"), try: () => migrate(db, migrationsBundle) });
        yield* Effect.tryPromise({ catch: failedAt("bootstrap"), try: () => bootstrapLocalData(db) });
        // Ahead of `ready`, so the onboarding guard's first read already sees post-backfill appMeta.
        yield* Effect.tryPromise({ catch: failedAt("settle"), try: () => settleLegacyOnboarding(db) });
        return db;
    });

    return LocalDatabase.of({ open });
});

export const layer = Layer.effect(LocalDatabase, make);
