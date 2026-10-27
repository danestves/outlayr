/// <reference types="vite/client" />

import { canonicalUsd } from "@outlayr/money/canonical-usd";
import revenuecatTest from "convex-revenuecat/test";
import { convexTest } from "convex-test";
import type { TestConvex } from "convex-test";
import type { FunctionArgs } from "convex/server";
import * as Effect from "effect/Effect";
import { describe, expect, it } from "vite-plus/test";

import { api, internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import { transactionFields } from "./lib/syncTables";
import { authenticatedAs, seedAuthUser, seedProUser } from "./test.helpers";
import type { SeededIdentity } from "./test.helpers";

const modules = import.meta.glob("../convex/**/*.ts");

type TestClient = TestConvex<typeof schema>;
type PushRows = FunctionArgs<typeof api.sync.push>["rows"];
type LogArgs = Omit<FunctionArgs<typeof internal.mcpEntries.logEntry>, "user">;

const HOUR = 3_600_000;
const at = (iso: string) => Date.parse(iso);

const category = (localId: string, name: string, income = false): PushRows[number] => ({
    deletedAt: null,
    fields: { color: null, dateCreated: null, emoji: null, icon: null, income, name, parentId: null, sortOrder: 0 },
    localId,
    table: "categories",
    updatedAt: 1,
});

const caracasEntry: PushRows[number] = {
    deletedAt: null,
    fields: {
        accountId: null,
        amount: 4.5,
        amountUsd: 4.5,
        categoryId: "coffee",
        currency: "USD",
        customColor: null,
        date: at("2026-10-08T15:00:00Z"),
        day: at("2026-10-08T04:00:00Z"),
        details: null,
        emoji: null,
        exchangeRate: 1,
        exchangeRateType: null,
        icon: null,
        imageColor: null,
        imageKey: null,
        income: false,
        month: at("2026-10-01T04:00:00Z"),
        note: "Blue Bottle",
        onceRecurring: false,
        recurringCoefficient: 1,
        recurringEndDate: null,
        recurringType: 0,
    },
    localId: "earlier",
    table: "transactions",
    updatedAt: 1,
};

async function ledger(t: TestClient): Promise<SeededIdentity> {
    revenuecatTest.register(t);
    const owner = await seedProUser(t);
    await authenticatedAs(t, owner).mutation(api.sync.push, {
        deviceId: "phone",
        rows: [
            category("groceries", "Groceries"),
            category("coffee", "Coffee"),
            category("salary", "Salary", true),
            { deletedAt: null, fields: { value: "EUR" }, localId: "currency", table: "appMeta", updatedAt: 1 },
            caracasEntry,
        ],
    });
    await t.run(async (ctx) => {
        await ctx.db.insert("exchangeRates", {
            date: "2026-09-30",
            fetchedAt: 0,
            quote: "EUR",
            rate: 0.9,
            rateType: "official",
            source: "openexchangerates",
        });
    });
    return owner;
}

const log = (t: TestClient, who: SeededIdentity, args: LogArgs) =>
    t.mutation(internal.mcpEntries.logEntry, {
        user: { connectionId: "test", scopes: ["ledger:write"], userId: who.userId },
        ...args,
    });

describe("log_entry", () => {
    it("lands as the next seq, with every synced field, for the owner's devices only", async () => {
        const t = convexTest(schema, modules);
        const owner = await ledger(t);
        const stranger = await seedProUser(t);
        const before = await authenticatedAs(t, owner).query(api.sync.currentSeq, {});

        const entry = await log(t, owner, {
            amount: -12.345,
            category: "  groceries ",
            currency: "usd",
            date: "2026-10-01",
            kind: "expense",
        });

        expect(entry).toStrictEqual({
            account: null,
            amount: 12.34,
            category: "Groceries",
            currency: "USD",
            date: "2026-10-01",
            kind: "expense",
            note: "Groceries",
        });
        const page = await authenticatedAs(t, owner).query(api.sync.pullSince, { cursor: before - 1 });
        expect(page.rows).toHaveLength(1);
        const [row] = page.rows;
        expect(row).toMatchObject({ deletedAt: null, deviceId: "mcp", seq: before, table: "transactions" });
        expect(row?.localId).toMatch(/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);
        expect(Object.keys(row?.fields ?? {}).toSorted()).toStrictEqual(Object.keys(transactionFields).toSorted());
        expect(row?.fields).toMatchObject({
            accountId: null,
            amount: 12.34,
            amountUsd: 12.34,
            categoryId: "groceries",
            currency: "USD",
            date: at("2026-10-01T16:00:00Z"),
            day: at("2026-10-01T04:00:00Z"),
            exchangeRate: 1,
            exchangeRateType: null,
            income: false,
            month: at("2026-10-01T04:00:00Z"),
            note: "Groceries",
            onceRecurring: false,
            recurringCoefficient: 1,
            recurringType: 0,
        });
        await expect(authenticatedAs(t, owner).query(api.sync.currentSeq, {})).resolves.toBe(before + 1);
        await expect(authenticatedAs(t, stranger).query(api.sync.pullSince, { cursor: 0 })).resolves.toMatchObject({
            rows: [],
        });
    });

    it("refuses a caller without Pro and writes nothing", async () => {
        const t = convexTest(schema, modules);
        revenuecatTest.register(t);
        const free = await seedAuthUser(t);

        await expect(log(t, free, { amount: 5, kind: "expense" })).rejects.toThrow(/Outlayr Pro/);
        await expect(t.run((ctx) => ctx.db.query("transactions").collect())).resolves.toHaveLength(0);
    });

    it("matches categories on the entry's own side and lists them on a miss", async () => {
        const t = convexTest(schema, modules);
        const owner = await ledger(t);

        await expect(log(t, owner, { amount: 5, category: "Salary", kind: "expense" })).rejects.toThrow(
            'No expense category is named "Salary". Use one of: Groceries, Coffee.'
        );
        await expect(log(t, owner, { amount: 5, kind: "expense", note: "Corner shop" })).rejects.toThrow(
            "Pass a category for this expense. Use one of: Groceries, Coffee."
        );
        await expect(log(t, owner, { amount: 5, kind: "expense", note: "blue bottle" })).resolves.toMatchObject({
            category: "Coffee",
            note: "blue bottle",
        });
        await expect(log(t, owner, { amount: 900, category: "SALARY", kind: "income" })).resolves.toMatchObject({
            category: "Salary",
            kind: "income",
        });
    });

    it("freezes a foreign entry exactly as the device's canonicalUsd would", async () => {
        const t = convexTest(schema, modules);
        const owner = await ledger(t);

        await log(t, owner, { amount: 100, category: "Groceries", date: "2026-10-02", kind: "expense" });
        await log(t, owner, { amount: 100, category: "Groceries", currency: "GBP", kind: "expense" });

        const rows = await t.run((ctx) =>
            ctx.db
                .query("transactions")
                .filter((q) => q.eq(q.field("deviceId"), "mcp"))
                .collect()
        );
        const expected = await Effect.runPromise(
            canonicalUsd((quote) => Effect.succeed(quote === "EUR" ? { date: "2026-09-30", rate: 0.9 } : null), {
                amount: 100,
                currency: "EUR",
                date: new Date(at("2026-10-02T16:00:00Z")),
                displayCurrency: "EUR",
            })
        );
        expect(
            rows.map(({ amountUsd, currency, exchangeRate, exchangeRateType }) => ({
                amountUsd,
                currency,
                exchangeRate,
                exchangeRateType,
            }))
        ).toStrictEqual([
            { ...expected, currency: "EUR" },
            { amountUsd: null, currency: "GBP", exchangeRate: null, exchangeRateType: "official" },
        ]);
        expect(expected.amountUsd).toBe(111.111111);
    });

    it("logs a retried call once, and refuses a reused key for a different entry", async () => {
        const t = convexTest(schema, modules);
        const owner = await ledger(t);
        const args = { amount: 7, category: "Coffee", idempotencyKey: "call-1", kind: "expense" } as const;

        const first = await log(t, owner, args);
        await expect(log(t, owner, args)).resolves.toStrictEqual(first);
        await expect(log(t, owner, { ...args, amount: 8 })).rejects.toThrow(/already used/);

        const logged = await t.run((ctx) =>
            ctx.db
                .query("transactions")
                .filter((q) => q.eq(q.field("deviceId"), "mcp"))
                .collect()
        );
        expect(logged).toHaveLength(1);
        expect(logged[0]?.date).toBeGreaterThan(Date.now() - HOUR);
    });
});
