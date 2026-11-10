/// <reference types="vite/client" />
import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import revenuecatTest from "convex-revenuecat/test";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vite-plus/test";

import { api } from "../convex/_generated/api";
import type { Doc } from "../convex/_generated/dataModel";
import schema from "../convex/schema";
import { ledgerOverview, settingsOf } from "./ledgerView";
import type { LedgerBooks } from "./ledgerView";
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

const NO_BOOKS: LedgerBooks = {
    accounts: [],
    appMeta: [],
    budgets: [],
    categories: [],
    exchangeRates: [],
    installmentPlans: [],
    installments: [],
    savingsGoals: [],
    mainBudget: [],
    outsideMoves: [],
    outsidePayments: [],
    transactions: [],
    transfers: [],
};

const docOf = <Table extends "accounts" | "transactions">(
    table: Table,
    row: Omit<Doc<Table>, "_creationTime" | "_id">
) => ({ _creationTime: 0, _id: `${table}:${JSON.stringify(row).length}`, ...row }) as unknown as Doc<Table>;

const entry = (note: string, row: Partial<Doc<"transactions">> = {}) =>
    docOf("transactions", { ...entryOf("owner", note), ...row });

const zone = (value: string) => [{ key: "timeZone", value }];

const chase = docOf("accounts", {
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
    userId: "owner",
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

describe("settingsOf", () => {
    it("reads what the phone stored", () => {
        const stored = (key: string, value: string) => ({ key, value });
        const settings = settingsOf([
            stored("accentColor", "3"),
            stored("firstWeekday", "2"),
            stored("showCents", "false"),
            stored("use24HourClock", "true"),
        ]);

        expect(settings).toMatchObject({
            accent: { key: "prussian" },
            firstWeekday: 2,
            showCents: false,
            use24HourClock: true,
        });
    });

    it("falls back to the phone's own defaults when nothing is stored", () => {
        expect(settingsOf([])).toMatchObject({
            accent: { key: "vermilion" },
            animatedCharts: true,
            firstDayOfMonth: 1,
            firstWeekday: 1,
            incomeTracking: true,
            showCents: true,
            use24HourClock: false,
        });
    });
});

describe("ledgerOverview", () => {
    it("leaves entries that have not happened yet out of the log", () => {
        const now = Date.UTC(2026, 9, 10);
        const { log } = ledgerOverview(
            { ...NO_BOOKS, transactions: [entry("mine"), entry("rent", { date: now + 86_400_000 })] },
            now
        );

        expect(log.flatMap((day) => day.rows.map((row) => row.note))).toStrictEqual(["mine"]);
    });

    it("dates an entry on the owner's wall clock, with its account", () => {
        const {
            log: [first],
        } = ledgerOverview(
            {
                ...NO_BOOKS,
                accounts: [chase],
                appMeta: zone("America/Caracas"),
                transactions: [
                    entry("late dinner", {
                        accountId: "chase",
                        date: Date.UTC(2026, 9, 9, 2, 30),
                        day: Date.UTC(2026, 9, 8, 4),
                    }),
                ],
            },
            Date.UTC(2026, 9, 10)
        );

        expect(first).toMatchObject({ date: "2026-10-08", rows: [{ account: "Chase", time: "22:30" }] });
    });

    it("keeps one day together when its entries were saved in different zones", () => {
        const { log } = ledgerOverview(
            {
                ...NO_BOOKS,
                appMeta: zone("America/Caracas"),
                transactions: [
                    entry("lunch", { date: Date.UTC(2026, 9, 8, 16), day: Date.UTC(2026, 9, 8, 4) }),
                    entry("saved in Paris", { date: Date.UTC(2026, 9, 8, 23), day: Date.UTC(2026, 9, 8, 22) }),
                ],
            },
            Date.UTC(2026, 9, 10)
        );

        expect(log.map((day) => [day.date, day.rows.length])).toStrictEqual([["2026-10-08", 2]]);
    });

    it("reads an entry's time at its own offset on the day the clocks go back", () => {
        const {
            log: [first],
        } = ledgerOverview(
            {
                ...NO_BOOKS,
                appMeta: zone("America/New_York"),
                transactions: [entry("lunch", { date: Date.UTC(2026, 10, 1, 17), day: Date.UTC(2026, 10, 1, 4) })],
            },
            Date.UTC(2026, 10, 2)
        );

        expect(first).toMatchObject({ date: "2026-11-01", rows: [{ time: "12:00" }] });
    });

    it("reads today at the offset it dates entries with when no zone is stored", () => {
        const { summary } = ledgerOverview(
            { ...NO_BOOKS, transactions: [entry("taxi", { day: Date.UTC(2026, 9, 8, 4) })] },
            Date.UTC(2026, 9, 10, 2, 30)
        );

        expect(summary.today).toBe("2026-10-09");
    });

    it("puts an entry's daily bar on the day the log shows it", () => {
        const {
            log: [first],
            summary,
        } = ledgerOverview(
            {
                ...NO_BOOKS,
                appMeta: zone("America/Caracas"),
                transactions: [
                    entry("late taxi", { date: Date.UTC(2026, 9, 8, 23, 30), day: Date.UTC(2026, 9, 8, 22) }),
                ],
            },
            Date.UTC(2026, 9, 20, 12)
        );

        expect(summary.spentByDay.map((bar) => bar.date)).toStrictEqual([first?.date]);
    });

    it("counts the first hour of a month the clocks go back in", () => {
        const { summary } = ledgerOverview(
            {
                ...NO_BOOKS,
                appMeta: zone("America/New_York"),
                transactions: [
                    entry("last night", {
                        amount: 100,
                        date: Date.UTC(2026, 10, 1, 3, 30),
                        day: Date.UTC(2026, 9, 31, 4),
                    }),
                    entry("after midnight", {
                        amount: 7,
                        date: Date.UTC(2026, 10, 1, 4, 30),
                        day: Date.UTC(2026, 10, 1, 4),
                    }),
                ],
            },
            Date.UTC(2026, 10, 9, 17)
        );

        expect(summary).toMatchObject({
            from: "2026-11-01",
            spent: 7,
            spentByDay: [{ amount: 7, date: "2026-11-01" }],
            to: "2026-11-30",
        });
    });

    it("cuts the month at the latest entry's offset when no zone is stored", () => {
        const { summary } = ledgerOverview(
            {
                ...NO_BOOKS,
                transactions: [
                    entry("last month", {
                        amount: 100,
                        date: Date.UTC(2026, 9, 31, 20),
                        day: Date.UTC(2026, 9, 31, 4),
                    }),
                    entry("this month", {
                        amount: 7,
                        date: Date.UTC(2026, 10, 9, 15),
                        day: Date.UTC(2026, 10, 9, 5),
                    }),
                ],
            },
            Date.UTC(2026, 10, 9, 17)
        );

        expect(summary).toMatchObject({ from: "2026-11-01", spent: 7, to: "2026-11-30", today: "2026-11-09" });
    });

    it("turns over at the owner's midnight unless an entry lands first", () => {
        const now = Date.UTC(2026, 9, 9, 15);
        const books = { ...NO_BOOKS, appMeta: zone("America/Caracas") };

        expect(ledgerOverview(books, now).nextChangeAt).toBe(Date.UTC(2026, 9, 10, 4));
        expect(
            ledgerOverview(
                {
                    ...books,
                    transactions: [
                        entry("late dinner", { date: Date.UTC(2026, 9, 10, 1), day: Date.UTC(2026, 9, 9, 4) }),
                    ],
                },
                now
            ).nextChangeAt
        ).toBe(Date.UTC(2026, 9, 10, 1));
    });

    it("turns over when a balance adjustment comes due", () => {
        const now = Date.UTC(2026, 9, 9, 15);
        const due = now + 60_000;

        expect(
            ledgerOverview(
                {
                    ...NO_BOOKS,
                    appMeta: zone("America/Caracas"),
                    outsideMoves: [{ date: due, deletedAt: null } as Doc<"outsideMoves">],
                },
                now
            ).nextChangeAt
        ).toBe(due);
    });
});
