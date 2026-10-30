import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import * as Effect from "effect/Effect";
import { describe, expect, it, vi } from "vite-plus/test";

import { getMeta, META_KEYS } from "@/data/app-meta-core";
import { setBoolSetting } from "@/data/settings-core";
import { getTransactionById } from "@/data/transactions-core";
import type { Database } from "@/db/client";
import { tags, transactions } from "@/db/schema";
import { migratedSqlite, testDatabase, withAsyncTransactions } from "@/db/test-database";
import { Reminders } from "@/lib/reminders";

import { commitEntry } from "./entry-commit";
import type { EntryCommit, EntryDraft } from "./entry-commit";

vi.mock("expo-notifications", () => ({}));

const LONG_AGO = new Date(Date.UTC(2020, 0, 1, 12));

const DRAFT: EntryDraft = {
    accountId: null,
    amount: 100,
    categoryId: null,
    currency: "EUR",
    date: new Date(),
    details: null,
    income: false,
    merchant: "Bakery",
    schedule: null,
};

function ledger() {
    const sqlite = migratedSqlite({ foreignKeys: false });
    withAsyncTransactions(sqlite);
    return { db: testDatabase(sqlite), sqlite };
}

function commit(input: EntryCommit, reminders: { cancelled?: (ids: readonly string[]) => void } = {}) {
    return Effect.runPromise(
        commitEntry(input).pipe(
            Effect.provideService(Reminders, {
                cancel: (ids) => Effect.sync(() => reminders.cancelled?.(ids)),
                pendingIds: () => Effect.succeed(["outlayr.sub-due.gone"]),
                permission: () => Effect.succeed("granted"),
                request: () => Effect.succeed("granted"),
                schedule: () => Effect.void,
            })
        )
    );
}

const lookupOutbox = (db: Database) => Effect.runPromise(getMeta(db, META_KEYS.enrichmentOutbox));

describe("commitEntry", () => {
    it("keeps a custom rate freeze when an edit leaves the rate untouched", async () => {
        const { db } = ledger();
        const created = await commit({
            db,
            draft: { ...DRAFT, currency: "VES", date: LONG_AGO, exchangeRate: 55.5, exchangeRateType: "custom" },
            source: "form",
        });
        if (created.kind !== "saved") {
            throw new Error("The entry did not save");
        }
        const { id } = created;
        const initial = getTransactionById(db, id) ?? undefined;

        await commit({
            db,
            draft: { ...DRAFT, currency: "VES", date: LONG_AGO, merchant: "Renamed" },
            initial,
            source: "form",
        });

        expect(getTransactionById(db, id)).toMatchObject({
            amountUsd: 1.801802,
            exchangeRate: 55.5,
            exchangeRateType: "custom",
            note: "Renamed",
        });
    });

    it("writes neither the row nor its new tags when the split does not balance", async () => {
        const { db } = ledger();

        const outcome = await commit({
            db,
            draft: DRAFT,
            source: "form",
            splits: {
                allocations: [
                    { amount: 10, categoryId: "a" },
                    { amount: 5, categoryId: "b" },
                ],
                decimals: 2,
            },
            tags: { pendingNames: ["Trip"], tagIds: [] },
        });

        expect(outcome).toStrictEqual({ kind: "failed", missingCategory: false });
        await expect(db.select().from(transactions)).resolves.toStrictEqual([]);
        await expect(db.select().from(tags)).resolves.toStrictEqual([]);
    });

    it("keeps a subscription whose back-fill fails, flags it, and still syncs reminders", async () => {
        const { db, sqlite } = ledger();
        sqlite.exec(`
            CREATE TRIGGER no_charges BEFORE INSERT ON transactions WHEN (SELECT count(*) FROM transactions) > 0
            BEGIN SELECT RAISE(ABORT, 'no charges'); END;
        `);
        const synced = Promise.withResolvers<readonly string[]>();
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        const outcome = await commit(
            {
                db,
                draft: {
                    ...DRAFT,
                    date: threeMonthsAgo,
                    merchant: "Netflix",
                    schedule: { coefficient: 1, endDate: null, leadDays: null, type: RECURRING_TYPE.monthly },
                },
                source: "voice",
            },
            { cancelled: synced.resolve }
        );

        expect(outcome).toMatchObject({ kind: "saved", scheduleFailed: true });
        await expect(db.select().from(transactions)).resolves.toHaveLength(1);
        await expect(synced.promise).resolves.toStrictEqual(["outlayr.sub-due.gone"]);
    });

    it("sends no merchant to the lookup while AI enrichment is off", async () => {
        const { db } = ledger();
        await Effect.runPromise(setBoolSetting(db, "aiConsentV2", false));

        await commit({ db, draft: DRAFT, source: "form" });

        await expect(lookupOutbox(db)).resolves.toBeNull();
    });
});
