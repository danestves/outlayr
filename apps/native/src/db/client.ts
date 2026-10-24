import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";

import { getMetaSync, META_KEYS } from "@/data/app-meta-core";

import migrationsBundle from "../../drizzle/migrations";
import * as schema from "./schema";

const DATABASE_NAME = "outlayr.db";

/** Reread whenever a migration is appended: the journal's newest stamp names the schema the check conceded.
 * Sparse: a later schema also invalidates the recorded verdict below.
 */
const FOREIGN_KEYS_STAMP = String(migrationsBundle.journal.entries.at(-1)?.when ?? 0);

/** `enableChangeListener` powers `useLiveQuery`. Migrations, the foreign-key gate and the bootstrap run in
 * `LocalDataProvider`, not here.
 */
export function openDatabase() {
    const sqlite = openDatabaseSync(DATABASE_NAME, {
        enableChangeListener: true,
    });

    // WAL, so the `useLiveQuery` SELECTs a write wakes are not serialised against it.
    sqlite.execSync("PRAGMA journal_mode = WAL");

    return drizzle(sqlite, { schema });
}

export type Database = ReturnType<typeof openDatabase>;

export async function closeDatabase(database: Database): Promise<void> {
    await database.$client.closeAsync();
}

/** `foreign_key_check` walks tombstones included; zero means declared cascades may enforce outright. */
function foreignKeyConflicts(db: Database): number {
    const conflicts = db.all<{ table: string; rowid: number; parent: string; fkid: number }>(
        sql`PRAGMA foreign_key_check`
    );
    if (conflicts.length > 0) {
        console.warn(
            `[db] ${conflicts.length} orphaned row(s) found — leaving foreign_keys off. ` +
                "The declared cascades stay inert until these are cleaned up."
        );
    }
    return conflicts.length;
}

function recordForeignKeysPassed(db: Database): void {
    db.insert(schema.appMeta)
        .values({ key: META_KEYS.fkCheckPass, value: FOREIGN_KEYS_STAMP })
        .onConflictDoUpdate({ target: schema.appMeta.key, set: { value: FOREIGN_KEYS_STAMP } });
}

function forgetForeignKeysRecord(db: Database): void {
    db.delete(schema.appMeta).where(eq(schema.appMeta.key, META_KEYS.fkCheckPass));
}

/**
 * SQLite ignores the schema's cascades until foreign keys are on per connection, and enabling them over orphaned
 * rows would fail every write touching one, so the scan runs synchronously on `ready`'s only open either way. A
 * conceded store records the schema stamp, and later cold starts read it instead of rescanning on the JS thread.
 */
export function gateForeignKeys(db: Database): void {
    if (getMetaSync(db, META_KEYS.fkCheckPass) === FOREIGN_KEYS_STAMP) {
        db.$client.execSync("PRAGMA foreign_keys = ON");
        return;
    }
    if (foreignKeyConflicts(db) === 0) {
        db.$client.execSync("PRAGMA foreign_keys = ON");
        recordForeignKeysPassed(db);
        return;
    }
    forgetForeignKeysRecord(db);
}

/**
 * Restore, import and erase rewrite the ledger wholesale, so the recorded verdict may describe a store that no
 * longer exists: rerun the same synchronous scan and rewrite or drop the stamp behind it.
 */
export function revalidateForeignKeys(db: Database): void {
    if (foreignKeyConflicts(db) === 0) {
        recordForeignKeysPassed(db);
        return;
    }
    forgetForeignKeysRecord(db);
}
