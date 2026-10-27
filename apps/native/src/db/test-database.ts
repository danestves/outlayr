import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import BetterSqlite3 from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import type { SpendDb } from "@/data/budget-spent";
import type { Database } from "@/db/client";

export const testDatabase = (sqlite: BetterSqlite3.Database): Database =>
    drizzle({ client: sqlite }) as unknown as Database;

export const testSpendDb = (sqlite: BetterSqlite3.Database): SpendDb =>
    drizzle({ client: sqlite }) as unknown as SpendDb;

/**
 * Inert, not throwing: jest matchers probe the handle (`asymmetricMatch`), so a throwing stub would fail the
 * assertion instead of the call.
 */
// SAFETY: an empty object has none of Database's members, and these suites touch none of them.
export const unusedDatabase = (): Database => ({}) as Database;

const MIGRATIONS = join(import.meta.dirname, "..", "..", "drizzle");

const MIGRATION_FOLDER = /^\d{14}_(.+)$/;

const migrationFolders = (): Map<string, string> =>
    new Map(
        readdirSync(MIGRATIONS)
            .sort()
            .flatMap((folder) => {
                const tag = MIGRATION_FOLDER.exec(folder)?.[1];
                return tag === undefined ? [] : [[`${tag}.sql`, folder] as const];
            })
    );

const migrationFiles = (): string[] => [...migrationFolders().keys()];

export function applyMigration(sqlite: BetterSqlite3.Database, file: string): void {
    const folder = migrationFolders().get(file);
    if (folder === undefined) {
        throw new Error(`No migration ${file}`);
    }
    for (const statement of readFileSync(join(MIGRATIONS, folder, "migration.sql"), "utf-8").split(
        "--> statement-breakpoint"
    )) {
        if (statement.trim()) {
            sqlite.exec(statement);
        }
    }
}

/**
 * `include` can stop short of a migration to get the ledger as an earlier build left it.
 */
export function applyMigrations(sqlite: BetterSqlite3.Database, include: (file: string) => boolean = () => true): void {
    for (const file of migrationFiles().filter(include)) {
        applyMigration(sqlite, file);
    }
}

/**
 * `foreignKeys: false` matches the app on a store with orphans (see `db/client.ts`).
 */
export function migratedSqlite({ foreignKeys = true } = {}): BetterSqlite3.Database {
    const sqlite = new BetterSqlite3(":memory:");
    applyMigrations(sqlite);
    if (!foreignKeys) {
        sqlite.pragma("foreign_keys = OFF");
    }
    return sqlite;
}

export const migratedDatabase = (options?: { foreignKeys?: boolean }): Database =>
    testDatabase(migratedSqlite(options));

export function withAsyncTransactions(sqlite: BetterSqlite3.Database): void {
    Object.assign(sqlite, {
        withTransactionAsync: async (task: () => Promise<void>) => {
            try {
                sqlite.exec("BEGIN");
                await task();
                sqlite.exec("COMMIT");
            } catch (error) {
                sqlite.exec("ROLLBACK");
                throw error;
            }
        },
    });
}

export function transactionalDatabase(options?: { foreignKeys?: boolean }): Database {
    const sqlite = migratedSqlite(options);
    withAsyncTransactions(sqlite);
    return testDatabase(sqlite);
}
