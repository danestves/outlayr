import { describe, expect, it } from "@jest/globals";
import BetterSqlite3 from "better-sqlite3";

import { applyMigration, applyMigrations } from "@/db/test-database";

const REBUILD = "0024_goal_start_and_required_date";

// A ledger as it stood BEFORE `0024`: other suites replay every migration at once, leaving nothing for it to find.
function beforeRebuild(): BetterSqlite3.Database {
    const sqlite = new BetterSqlite3(":memory:");
    applyMigrations(sqlite, (file) => file < REBUILD);
    sqlite.exec(
        "INSERT INTO accounts (id, name, currency, initialBalance, initialBalanceDate, dateCreated, updatedAt) VALUES ('acct', 'Savings', 'USD', 0, 0, 0, 0)"
    );
    return sqlite;
}

function seedGoal(sqlite: BetterSqlite3.Database, id: string, targetDate: number | null): void {
    sqlite
        .prepare(
            "INSERT INTO savingsGoals (id, accountId, currency, name, sortOrder, targetAmount, targetAmountUsd, targetDate, dateCreated, deletedAt, updatedAt) VALUES (?, 'acct', 'USD', ?, 0, 1000, 1000, ?, 5000, NULL, 5000)"
        )
        .run(id, id, targetDate);
}

describe("the rebuild that made a goal's date required", () => {
    it("keeps a dated goal untouched", () => {
        const sqlite = beforeRebuild();
        seedGoal(sqlite, "dated", 9000);
        applyMigration(sqlite, `${REBUILD}.sql`);

        const row = sqlite.prepare("SELECT * FROM savingsGoals WHERE id = 'dated'").get() as {
            deletedAt: number | null;
            targetDate: number;
        };
        expect(row.deletedAt).toBeNull();
        expect(row.targetDate).toBe(9000);
    });

    it("tombstones a dateless goal rather than dropping it", () => {
        const sqlite = beforeRebuild();
        seedGoal(sqlite, "dateless", null);
        applyMigration(sqlite, `${REBUILD}.sql`);

        const row = sqlite.prepare("SELECT * FROM savingsGoals WHERE id = 'dateless'").get() as {
            deletedAt: number | null;
            targetDate: number;
        };
        expect(row.deletedAt).not.toBeNull();
        expect(row.targetDate).toBe(5000);
    });

    it("queues that removal when the ledger syncs", () => {
        const sqlite = beforeRebuild();
        sqlite.exec("INSERT OR REPLACE INTO appMeta (key, value) VALUES ('syncEnabled', '1')");
        seedGoal(sqlite, "dateless", null);
        applyMigration(sqlite, `${REBUILD}.sql`);

        const queued = sqlite.prepare("SELECT localId FROM outbox WHERE tableName = 'savingsGoals'").all() as {
            localId: string;
        }[];
        expect(queued.map((entry) => entry.localId)).toStrictEqual(["dateless"]);
    });

    it("queues nothing on a ledger that does not sync", () => {
        const sqlite = beforeRebuild();
        seedGoal(sqlite, "dateless", null);
        applyMigration(sqlite, `${REBUILD}.sql`);

        const queued = sqlite.prepare("SELECT localId FROM outbox WHERE tableName = 'savingsGoals'").all();
        expect(queued).toStrictEqual([]);
    });
});
