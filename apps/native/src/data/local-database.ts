import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

import { bootstrapLocalData } from "@/data/bootstrap";
import { localizePresetCategories } from "@/data/categories-core";
import { settleLegacyOnboarding } from "@/data/onboarding-core";
import { openDatabase } from "@/db/client";
import type { Database } from "@/db/client";
import { adoptLegacyMigrationLog } from "@/db/legacy-migration-log";
import { deviceLanguage } from "@/i18n/device-language";
import { warnAndContinue } from "@/lib/warn-and-continue";

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
        yield* Effect.try({ catch: failedAt("migrate"), try: () => adoptLegacyMigrationLog(db) });
        yield* Effect.tryPromise({ catch: failedAt("migrate"), try: () => migrate(db, migrationsBundle) });
        yield* bootstrapLocalData(db).pipe(Effect.mapError((error) => failedAt("bootstrap")(error.cause)));
        yield* localizePresetCategories(db, deviceLanguage()).pipe(
            warnAndContinue("Failed to localize the preset categories")
        );
        // Ahead of `ready`, so the onboarding guard's first read already sees post-backfill appMeta.
        yield* settleLegacyOnboarding(db).pipe(Effect.mapError((error) => failedAt("settle")(error.cause)));
        return db;
    });

    return LocalDatabase.of({ open });
});

export const layer = Layer.effect(LocalDatabase, make);
