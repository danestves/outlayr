import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";

import * as schema from "./schema";

const DATABASE_NAME = "outlayr.db";

/** `enableChangeListener` powers `useLiveQuery`. Migrations run in `LocalDataProvider`, not here. */
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
            `[db] ${orphans.length} orphaned row(s) found — leaving foreign_keys off. ` +
                "The declared cascades stay inert until these are cleaned up."
        );
    }

    return drizzle(sqlite, { schema });
}

export type Database = ReturnType<typeof openDatabase>;

export async function closeDatabase(database: Database): Promise<void> {
    await database.$client.closeAsync();
}
