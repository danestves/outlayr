import { sql } from "drizzle-orm";
import * as Schema from "effect/Schema";

import type { Database } from "@/db/client";

import { LEGACY_MIGRATION_NAMES } from "./legacy-migration-names";

const LOG_TABLE = sql.identifier("__drizzle_migrations");

export class UnmatchedMigrationLogError extends Schema.TaggedError<UnmatchedMigrationLogError>()(
    "UnmatchedMigrationLogError",
    { createdAt: Schema.Array(Schema.Unknown) }
) {
    override get message(): string {
        return `Migration log has ${this.createdAt.length} row(s) no known migration produced: created_at ${this.createdAt.join(", ")}`;
    }
}

export function adoptLegacyMigrationLog(db: Database): void {
    const columns = db.all<{ name: string }>(sql`SELECT name FROM pragma_table_info('__drizzle_migrations')`);
    if (columns.length === 0 || columns.some((column) => column.name === "name")) {
        return;
    }
    db.run(sql`BEGIN`);
    try {
        db.run(sql`ALTER TABLE ${LOG_TABLE} ADD COLUMN "name" text`);
        db.run(sql`ALTER TABLE ${LOG_TABLE} ADD COLUMN "applied_at" TEXT`);
        for (const [createdAt, name] of LEGACY_MIGRATION_NAMES) {
            db.run(
                sql`UPDATE ${LOG_TABLE} SET "name" = ${name}, "applied_at" = NULL WHERE "created_at" = ${createdAt}`
            );
        }
        const unmatched = db.all<{ created_at: unknown }>(
            sql`SELECT "created_at" FROM ${LOG_TABLE} WHERE "name" IS NULL`
        );
        if (unmatched.length > 0) {
            throw new UnmatchedMigrationLogError({ createdAt: unmatched.map((row) => row.created_at) });
        }
        db.run(sql`COMMIT`);
    } catch (error) {
        try {
            db.run(sql`ROLLBACK`);
            // oxlint-disable-next-line no-empty -- SQLite already rolled back after a disk or I/O failure, so keep the original error
        } catch {}
        throw error;
    }
}
