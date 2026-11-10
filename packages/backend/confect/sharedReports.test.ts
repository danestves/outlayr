/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vite-plus/test";

import { api, internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import { purgeUserBatch } from "./lib/account";
import { runEdge } from "./lib/runEdge";
import type { SharedReport } from "./sharedReports.spec";
import { authenticatedAs, seedAuthUser } from "./test.helpers";

const modules = import.meta.glob("../convex/**/*.ts");

const DAY_MS = 86_400_000;

const report: SharedReport = {
    columns: [{ from: "2026-10-01", key: "2026-10", to: "2026-10-31" }],
    currency: "USD",
    grouping: "month",
    measure: "spending",
    name: "Month by category",
    rise: null,
    rows: [{ average: 1850, change: null, color: "#b0623c", name: "Rent", total: 1850, values: [1850] }],
    rowsBy: "category",
    totals: { average: 1850, change: null, total: 1850, values: [1850] },
    unit: "amount",
};

const shared = { expires: "week", report, reportId: "report-1" } as const;

afterEach(() => {
    vi.useRealTimers();
});

test("anyone with the link reads the report, and only its owner can turn it off", async () => {
    const t = convexTest(schema, modules);
    const owner = await seedAuthUser(t);
    const other = await seedAuthUser(t);
    const { slug } = await authenticatedAs(t, owner).mutation(api.sharedReports.publish, shared);

    await authenticatedAs(t, other).mutation(api.sharedReports.remove, { reportId: shared.reportId });

    await expect(authenticatedAs(t, other).query(api.sharedReports.mine, {})).resolves.toStrictEqual([]);
    await expect(t.query(api.sharedReports.view, { slug })).resolves.toMatchObject({ report });

    await authenticatedAs(t, owner).mutation(api.sharedReports.remove, { reportId: shared.reportId });

    await expect(t.query(api.sharedReports.view, { slug })).resolves.toBeNull();
    await expect(t.run((ctx) => ctx.db.query("sharedReports").collect())).resolves.toStrictEqual([]);
});

test("a link can't be made without an account", async () => {
    const t = convexTest(schema, modules);

    await expect(t.mutation(api.sharedReports.publish, shared)).rejects.toThrow();
});

test("an expired link shows nothing, and sharing again makes a new address", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-01T12:00:00Z"));
    const t = convexTest(schema, modules);
    const owner = await seedAuthUser(t);
    const first = await authenticatedAs(t, owner).mutation(api.sharedReports.publish, shared);

    vi.setSystemTime(Date.now() + 8 * DAY_MS);

    await expect(t.query(api.sharedReports.view, { slug: first.slug })).resolves.toBeNull();
    await expect(authenticatedAs(t, owner).query(api.sharedReports.mine, {})).resolves.toStrictEqual([]);

    const second = await authenticatedAs(t, owner).mutation(api.sharedReports.publish, { ...shared, expires: "keep" });

    expect(second.slug).not.toBe(first.slug);
    await expect(t.query(api.sharedReports.view, { slug: first.slug })).resolves.toBeNull();
});

test("one sweep deletes every expired copy, however many, and keeps the rest", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-01T12:00:00Z"));
    const t = convexTest(schema, modules);
    const owner = await seedAuthUser(t);
    const as = authenticatedAs(t, owner);
    for (const index of Array.from({ length: 40 }).keys()) {
        await as.mutation(api.sharedReports.publish, { ...shared, reportId: `expiring-${index}` });
    }
    await as.mutation(api.sharedReports.publish, { ...shared, expires: "never", reportId: "kept" });

    vi.setSystemTime(Date.now() + 8 * DAY_MS);
    await t.mutation(internal.sharedReports.dropExpired, {});
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const left = await t.run((ctx) => ctx.db.query("sharedReports").collect());
    expect(left.map((row) => row.reportId)).toStrictEqual(["kept"]);
});

test("refreshing a live link keeps its address and its expiry", async () => {
    const t = convexTest(schema, modules);
    const owner = await seedAuthUser(t);
    const as = authenticatedAs(t, owner);
    const first = await as.mutation(api.sharedReports.publish, shared);

    const second = await as.mutation(api.sharedReports.publish, {
        ...shared,
        expires: "keep",
        report: { ...report, unit: "percent" },
    });

    expect(second).toStrictEqual(first);
    await expect(t.query(api.sharedReports.view, { slug: first.slug })).resolves.toMatchObject({
        report: { unit: "percent" },
    });
});

test("deleting the account deletes its shared reports", async () => {
    const t = convexTest(schema, modules);
    const owner = await seedAuthUser(t);
    const { slug } = await authenticatedAs(t, owner).mutation(api.sharedReports.publish, shared);

    let done = false;
    while (!done) {
        ({ done } = await t.run((ctx) => runEdge(purgeUserBatch(ctx, owner.userId))));
    }

    await expect(t.query(api.sharedReports.view, { slug })).resolves.toBeNull();
});

test("a report wider than its columns is refused", async () => {
    const t = convexTest(schema, modules);
    const owner = await seedAuthUser(t);

    await expect(
        authenticatedAs(t, owner).mutation(api.sharedReports.publish, {
            ...shared,
            report: { ...report, totals: { ...report.totals, values: [1, 2] } },
        })
    ).rejects.toThrow();
});

test("a report with a row for every category is shared, and one too large to store is refused", async () => {
    const t = convexTest(schema, modules);
    const owner = await seedAuthUser(t);
    const ones = (width: number) => Array.from({ length: width }, () => 1);
    const sized = (rows: number, width: number) => ({
        ...shared,
        report: {
            ...report,
            columns: ones(width).map((_, index) => ({ from: "2026-10-01", key: `c${index}`, to: "2026-10-31" })),
            rows: ones(rows).map(() => ({
                average: 1,
                change: null,
                color: null,
                name: "Rent",
                total: 1,
                values: ones(width),
            })),
            totals: { ...report.totals, values: ones(width) },
        },
    });

    const { slug } = await authenticatedAs(t, owner).mutation(api.sharedReports.publish, sized(40, 12));

    // The site redirects every public path to its lower-case form, so an address must survive that.
    expect(slug).toBe(slug.toLowerCase());
    await expect(authenticatedAs(t, owner).mutation(api.sharedReports.publish, sized(400, 200))).rejects.toThrow();
});

test("a colour that could load another site on the public page is refused", async () => {
    const t = convexTest(schema, modules);
    const owner = await seedAuthUser(t);

    await expect(
        authenticatedAs(t, owner).mutation(api.sharedReports.publish, {
            ...shared,
            report: {
                ...report,
                rows: report.rows.map((row) => ({ ...row, color: "url(https://example.com/pixel)" })),
            },
        })
    ).rejects.toThrow();
});
