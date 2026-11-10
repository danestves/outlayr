/// <reference types="vite/client" />
import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import revenuecatTest from "convex-revenuecat/test";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vite-plus/test";

import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { authenticatedAs, seedAuthUser, seedProUser } from "./test.helpers";

const modules = import.meta.glob("../convex/**/*.ts");

function setup() {
    const t = convexTest(schema, modules);
    revenuecatTest.register(t);
    return t;
}

const entryOf = (userId: string, note: string) => ({
    accountId: null,
    amount: 12,
    amountUsd: 12,
    categoryId: null,
    currency: "USD",
    customColor: null,
    date: Date.UTC(2026, 9, 9, 15),
    day: Date.UTC(2026, 9, 9),
    deletedAt: null,
    details: null,
    deviceId: "device",
    emoji: null,
    exchangeRate: null,
    exchangeRateType: null,
    icon: null,
    imageColor: null,
    imageKey: null,
    income: false,
    localId: `${userId}-${note}`,
    month: 0,
    note,
    onceRecurring: false,
    recurringCoefficient: 1,
    recurringEndDate: null,
    recurringType: RECURRING_TYPE.none,
    seq: 1,
    updatedAt: 0,
    userId,
});

describe("ledger queries", () => {
    it("refuses a signed-in user without Pro", async () => {
        const t = setup();
        const asFree = authenticatedAs(t, await seedAuthUser(t));

        await expect(asFree.query(api.ledger.accounts, {})).rejects.toThrow(/Pro is required/);
    });

    it("refuses an anonymous caller", async () => {
        const t = setup();

        await expect(
            t.query(api.ledger.transactions, { paginationOpts: { cursor: null, numItems: 10 } })
        ).rejects.toThrow(/sign in/);
    });

    it("reads only the caller's own live entries", async () => {
        const t = setup();
        const owner = await seedProUser(t);
        const other = await seedProUser(t);
        await t.run(async (ctx) => {
            await ctx.db.insert("transactions", entryOf(owner.userId, "mine"));
            await ctx.db.insert("transactions", entryOf(other.userId, "theirs"));
            await ctx.db.insert("transactions", { ...entryOf(owner.userId, "gone"), deletedAt: 1 });
        });

        const { page } = await authenticatedAs(t, owner).query(api.ledger.transactions, {
            paginationOpts: { cursor: null, numItems: 10 },
        });

        expect(page.map((row) => row.note)).toStrictEqual(["mine"]);
    });

    it("reads only the caller's own tags and tag links", async () => {
        const t = setup();
        const owner = await seedProUser(t);
        const other = await seedProUser(t);
        const synced = (userId: string, localId: string) => ({
            deletedAt: null,
            deviceId: "device",
            localId,
            seq: 1,
            updatedAt: 0,
            userId,
        });
        await t.run(async (ctx) => {
            for (const { userId } of [owner, other]) {
                await ctx.db.insert("tags", {
                    ...synced(userId, `${userId}-tag`),
                    color: null,
                    name: "online",
                    sortOrder: 0,
                });
                await ctx.db.insert("transactionTags", {
                    ...synced(userId, `${userId}-link`),
                    restoredAt: null,
                    tagId: `${userId}-tag`,
                    transactionId: `${userId}-entry`,
                });
            }
        });

        const asOwner = authenticatedAs(t, owner);
        const tags = await asOwner.query(api.ledger.tags, {});
        const { page } = await asOwner.query(api.ledger.transactionTags, {
            paginationOpts: { cursor: null, numItems: 10 },
        });

        expect(tags.map((row) => row.localId)).toStrictEqual([`${owner.userId}-tag`]);
        expect(page.map((row) => row.localId)).toStrictEqual([`${owner.userId}-link`]);
    });

    it("hands over the display settings, not the ones that stay on a device", async () => {
        const t = setup();
        const owner = await seedProUser(t);
        const other = await seedProUser(t);
        const setting = (userId: string, key: string, value: string) => ({
            deviceId: "device",
            key,
            seq: 1,
            updatedAt: 0,
            userId,
            value,
        });
        await t.run(async (ctx) => {
            await ctx.db.insert("appMeta", setting(owner.userId, "accentColor", "3"));
            await ctx.db.insert("appMeta", setting(owner.userId, "use24HourClock", "true"));
            await ctx.db.insert("appMeta", setting(owner.userId, "biometricLock", "true"));
            await ctx.db.insert("appMeta", setting(other.userId, "firstWeekday", "2"));
        });

        const rows = await authenticatedAs(t, owner).query(api.ledger.appMeta, {});

        expect(rows.map((row) => row.key).toSorted()).toStrictEqual(["accentColor", "use24HourClock"]);
    });
});
