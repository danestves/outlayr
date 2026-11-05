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

describe("ledger", () => {
    it("refuses a signed-in user without Pro", async () => {
        const t = setup();
        const asFree = authenticatedAs(t, await seedAuthUser(t));

        await expect(asFree.query(api.ledger.recentTransactions, {})).rejects.toThrow(/Pro is required/);
    });

    it("refuses an anonymous caller", async () => {
        const t = setup();

        await expect(t.query(api.ledger.accountBalances, {})).rejects.toThrow(/sign in/);
    });

    it("reads only the caller's own entries that already happened", async () => {
        const t = setup();
        const owner = await seedProUser(t);
        const other = await seedProUser(t);
        await t.run(async (ctx) => {
            await ctx.db.insert("transactions", entryOf(owner.userId, "mine"));
            await ctx.db.insert("transactions", entryOf(other.userId, "theirs"));
            await ctx.db.insert("transactions", { ...entryOf(owner.userId, "rent"), date: Date.now() + 86_400_000 });
        });

        const entries = await authenticatedAs(t, owner).query(api.ledger.recentTransactions, {});

        expect(entries.map((row) => row.note)).toStrictEqual(["mine"]);
    });

    it("dates an entry on the owner's wall clock, with its account", async () => {
        const t = setup();
        const owner = await seedProUser(t);
        await t.run(async (ctx) => {
            await ctx.db.insert("appMeta", {
                deviceId: "device",
                key: "timeZone",
                seq: 0,
                updatedAt: 0,
                userId: owner.userId,
                value: "America/Caracas",
            });
            await ctx.db.insert("accounts", {
                currency: "USD",
                customColor: null,
                dateCreated: 0,
                deletedAt: null,
                deviceId: "device",
                emoji: null,
                icon: null,
                imageColor: null,
                imageKey: "photos/chase.webp",
                initialBalance: 0,
                initialBalanceDate: 0,
                initialBalanceUsd: 0,
                localId: "chase",
                name: "Chase",
                seq: 1,
                sortOrder: 0,
                updatedAt: 0,
                userId: owner.userId,
            });
            // 02:30 UTC on 9 Oct is 22:30 on 8 Oct in Caracas.
            await ctx.db.insert("transactions", {
                ...entryOf(owner.userId, "late dinner"),
                accountId: "chase",
                date: Date.UTC(2026, 9, 9, 2, 30),
                day: Date.UTC(2026, 9, 8, 4),
            });
        });

        const [entry] = await authenticatedAs(t, owner).query(api.ledger.recentTransactions, {});

        expect(entry).toMatchObject({ account: "Chase", date: "2026-10-08", time: "22:30" });
    });

    it("reads an entry's time at its own offset on the day the clocks go back", async () => {
        const t = setup();
        const owner = await seedProUser(t);
        await t.run(async (ctx) => {
            await ctx.db.insert("appMeta", {
                deviceId: "device",
                key: "timeZone",
                seq: 0,
                updatedAt: 0,
                userId: owner.userId,
                value: "America/New_York",
            });
            // New York's 1 Nov 2026 starts on EDT (-4) and reaches noon on EST (-5).
            await ctx.db.insert("transactions", {
                ...entryOf(owner.userId, "lunch"),
                date: Date.UTC(2026, 10, 1, 17),
                day: Date.UTC(2026, 10, 1, 4),
            });
        });

        const [entry] = await authenticatedAs(t, owner).query(api.ledger.recentTransactions, {});

        expect(entry).toMatchObject({ date: "2026-11-01", time: "12:00" });
    });
});
