import BetterSqlite3 from "better-sqlite3";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import { describe, expect, it, vi } from "vite-plus/test";

import * as LocalDatabase from "@/data/local-database";
import { UnmatchedMigrationLogError } from "@/db/legacy-migration-log";
import { LEGACY_MIGRATION_NAMES } from "@/db/legacy-migration-names";
import { applyMigrations, testDatabase, withAsyncTransactions } from "@/db/test-database";

import bundle from "../../drizzle/migrations";

vi.mock("expo-localization", () => ({ getLocales: () => [] }));

const BUNDLE_NAMES = Object.keys(bundle.migrations).sort();
const LAST_LEGACY_MIGRATION = "20261025034640_0037_transaction_attachments";

interface LogRow {
    id: number | null;
    hash: string;
    created_at: number;
    name: string | null;
    applied_at: string | null;
}

const legacyLog = (sqlite: BetterSqlite3.Database, upTo = "9999"): void => {
    sqlite.exec(`CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at numeric
    )`);
    const insert = sqlite.prepare(`INSERT INTO "__drizzle_migrations" ("hash", "created_at") VALUES ('', ?)`);
    for (const [when, name] of LEGACY_MIGRATION_NAMES) {
        if (name.split("_")[1] <= upTo) {
            insert.run(when);
        }
    }
};

const olderBuild = (upTo: string): BetterSqlite3.Database => {
    const sqlite = new BetterSqlite3(":memory:");
    applyMigrations(sqlite, (file) => file.slice(0, 4) <= upTo);
    legacyLog(sqlite, upTo);
    sqlite.prepare(`INSERT INTO appMeta (key, value) VALUES ('kept-by-user', 'yes')`).run();
    return sqlite;
};

const log = (sqlite: BetterSqlite3.Database): LogRow[] =>
    sqlite.prepare(`SELECT * FROM "__drizzle_migrations" ORDER BY rowid`).all() as LogRow[];

const opening = (sqlite: BetterSqlite3.Database) => {
    withAsyncTransactions(sqlite);
    const db = testDatabase(sqlite);
    return LocalDatabase.make.pipe(
        Effect.flatMap(({ open }) => open()),
        Effect.provideService(LocalDatabase.OpenConnection, () => db)
    );
};

const open = (sqlite: BetterSqlite3.Database) => Effect.runPromiseExit(opening(sqlite));

const openFailure = (sqlite: BetterSqlite3.Database) => Effect.runPromise(Effect.flip(opening(sqlite)));

const keptByUser = (sqlite: BetterSqlite3.Database) =>
    sqlite.prepare(`SELECT value FROM appMeta WHERE key = 'kept-by-user'`).pluck().get();

describe("legacy migration names", () => {
    it("name exactly the migrations the 0.45 migrator shipped, each stamped with its own second", () => {
        expect([...LEGACY_MIGRATION_NAMES.values()].sort()).toStrictEqual(
            BUNDLE_NAMES.filter((name) => name <= LAST_LEGACY_MIGRATION)
        );
        for (const [when, name] of LEGACY_MIGRATION_NAMES) {
            expect(name.slice(0, 14)).toBe(new Date(when).toISOString().replaceAll(/[-:T]/g, "").slice(0, 14));
        }
    });
});

describe("opening local data across the drizzle 1.0 upgrade", () => {
    it("adopts a log written by the 0.45 migrator without re-running anything", async () => {
        const sqlite = olderBuild("0037");

        const exit = await open(sqlite);

        expect(Exit.isSuccess(exit)).toBe(true);
        expect(log(sqlite).map((row) => row.name)).toStrictEqual(BUNDLE_NAMES);
        expect(keptByUser(sqlite)).toBe("yes");
    });

    it("applies only what the older build had not, once its log is named", async () => {
        const sqlite = olderBuild("0030");
        expect(log(sqlite)).toHaveLength(31);

        const exit = await open(sqlite);

        expect(Exit.isSuccess(exit)).toBe(true);
        const rows = log(sqlite);
        expect(rows.map((row) => row.name)).toStrictEqual(BUNDLE_NAMES);
        const [adopted, applied] = [rows.slice(0, 31), rows.slice(31)];
        expect(adopted.every((row) => row.applied_at === null && row.hash === "")).toBe(true);
        expect(applied.map((row) => row.name?.split("_")[1])).toStrictEqual([
            "0031",
            "0032",
            "0033",
            "0034",
            "0035",
            "0036",
            "0037",
            "0038",
            "0039",
            "0040",
            "0041",
            "0042",
            "0043",
        ]);
        expect(applied.every((row) => row.applied_at !== null)).toBe(true);
        expect(
            sqlite.prepare(`SELECT 1 FROM pragma_table_info('transactions') WHERE name = 'paidVia'`).get()
        ).toBeDefined();
        expect(keptByUser(sqlite)).toBe("yes");
    });

    it("applies every migration to a fresh database", async () => {
        const sqlite = new BetterSqlite3(":memory:");

        const exit = await open(sqlite);

        expect(Exit.isSuccess(exit)).toBe(true);
        expect(log(sqlite).map((row) => row.name)).toStrictEqual(BUNDLE_NAMES);
        expect(sqlite.prepare(`SELECT 1 FROM sqlite_master WHERE name = 'installmentPlans'`).get()).toBeDefined();
    });

    it("refuses a log row no migration produced and leaves the log as it was", async () => {
        const sqlite = olderBuild("0037");
        sqlite.prepare(`INSERT INTO "__drizzle_migrations" ("hash", "created_at") VALUES ('', 1)`).run();
        const before = log(sqlite);
        const columnsBefore = sqlite.prepare(`SELECT name FROM pragma_table_info('__drizzle_migrations')`).all();

        const error = await openFailure(sqlite);

        expect(error).toBeInstanceOf(LocalDatabase.LocalDatabaseError);
        expect(error.stage).toBe("migrate");
        expect(error.cause).toBeInstanceOf(UnmatchedMigrationLogError);
        expect(log(sqlite)).toStrictEqual(before);
        expect(sqlite.prepare(`SELECT name FROM pragma_table_info('__drizzle_migrations')`).all()).toStrictEqual(
            columnsBefore
        );
    });

    it("leaves an adopted log alone the second time", async () => {
        const sqlite = olderBuild("0030");
        await open(sqlite);
        const afterFirst = log(sqlite);

        const exit = await open(sqlite);

        expect(Exit.isSuccess(exit)).toBe(true);
        expect(log(sqlite)).toStrictEqual(afterFirst);
    });
});
