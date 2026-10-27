import { drizzle } from "drizzle-orm/expo-sqlite";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Schema from "effect/Schema";
import { openDatabaseSync } from "expo-sqlite";

const DATABASE_NAME = "outlayr.db";

/** `enableChangeListener` powers `useLiveQuery`. Migrations run in `LocalDatabase.open`, not here. */
export function openDatabase() {
    const sqlite = openDatabaseSync(DATABASE_NAME, {
        enableChangeListener: true,
    });

    // WAL, so the `useLiveQuery` SELECTs a write wakes are not serialised against it.
    sqlite.execSync("PRAGMA journal_mode = WAL");

    // SQLite ignores the schema's cascades until foreign keys are on per connection, and enabling them over orphaned
    // rows would fail every write touching one, so only a clean store turns them on.
    const orphans = sqlite.getAllSync("PRAGMA foreign_key_check");
    if (orphans.length === 0) {
        sqlite.execSync("PRAGMA foreign_keys = ON");
    } else {
        console.warn(
            `[db] ${orphans.length} orphaned row(s) found, leaving foreign_keys off. ` +
                "The declared cascades stay inert until these are cleaned up."
        );
    }

    return Equal.byReferenceUnsafe(drizzle(sqlite));
}

export type Database = ReturnType<typeof openDatabase>;

export class CloseDatabaseError extends Schema.TaggedError<CloseDatabaseError>()("CloseDatabaseError", {
    cause: Schema.Defect(),
}) {
    // oxlint-disable-next-line class-methods-use-this -- one cause, no attribute: the message has nothing on the instance to read
    override get message(): string {
        return "Closing the local database failed";
    }
}

export const closeDatabase = Effect.fn("Database.closeDatabase")(function* closeDatabase(database: Database) {
    yield* Effect.tryPromise({
        catch: (cause) => new CloseDatabaseError({ cause }),
        try: () => database.$client.closeAsync(),
    });
});
