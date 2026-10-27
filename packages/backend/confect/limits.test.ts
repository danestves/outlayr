/// <reference types="vite/client" />

import rateLimiterTest from "@convex-dev/rate-limiter/test";
import revenuecatTest from "convex-revenuecat/test";
import { convexTest } from "convex-test";
import { describe, expect, it } from "vite-plus/test";

import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { perUserBurst } from "./lib/limits";
import { runEdge } from "./lib/runEdge";
import { rateLimiter } from "./receiptScan";
import { authenticatedAs, grantPro, seedAuthUser } from "./test.helpers";

const modules = import.meta.glob("../convex/**/*.ts");

function harness() {
    const t = convexTest(schema, modules);
    rateLimiterTest.register(t);
    revenuecatTest.register(t);
    return t;
}

describe("limits.mine", () => {
    it("is null for a signed-out caller", async () => {
        await expect(harness().query(api.limits.mine, {})).resolves.toBeNull();
    });

    it("a free account reads the free pool and bursts, and what it spent", async () => {
        const t = harness();
        const asUser = authenticatedAs(t, await seedAuthUser(t));
        const key = await asUser.run(async (ctx) => (await ctx.auth.getUserIdentity())?.tokenIdentifier);
        const config = await runEdge(perUserBurst("receiptScan", false));
        await t.run((ctx) => rateLimiter.limit(ctx, "receiptScanPerUser", { config, count: 3, key }));

        const limits = await asUser.query(api.limits.mine, {});

        expect(limits).toMatchObject({
            captures: { capacity: 20, kind: "fixed window", value: 20 },
            csvImport: null,
            pro: false,
            receiptScan: { capacity: 10, kind: "token bucket", value: 7 },
        });
    });

    it("a Pro account reads the wider bursts", async () => {
        const t = harness();
        const identity = await seedAuthUser(t);
        await grantPro(t, identity);

        const limits = await authenticatedAs(t, identity).query(api.limits.mine, {});

        expect(limits).toMatchObject({
            captures: { capacity: 500 },
            csvImport: { capacity: 10 },
            pro: true,
            receiptScan: { capacity: 50 },
            voiceEntry: { capacity: 60 },
        });
    });
});
