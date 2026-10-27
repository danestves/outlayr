/// <reference types="vite/client" />

import rateLimiterTest from "@convex-dev/rate-limiter/test";
import revenuecatTest from "convex-revenuecat/test";
import { convexTest } from "convex-test";
import * as Effect from "effect/Effect";
import { describe, expect, it } from "vite-plus/test";

import schema from "../../convex/schema";
import { authenticatedAs, grantPro, seedAuthUser } from "../test.helpers";
import type { SeededIdentity } from "../test.helpers";
import { admitCapture, captureLimiter, FREE_CAPTURE_CONFIG, PRO_CAPTURE_CONFIG } from "./captures";
import { runEdge } from "./runEdge";

const modules = import.meta.glob("../../convex/**/*.ts");

function harness() {
    const t = convexTest(schema, modules);
    rateLimiterTest.register(t);
    revenuecatTest.register(t);
    return t;
}

async function caller(t: ReturnType<typeof harness>, identity: SeededIdentity) {
    const tokenIdentifier = await authenticatedAs(t, identity).run(
        async (ctx) => (await ctx.auth.getUserIdentity())?.tokenIdentifier
    );
    if (!tokenIdentifier) {
        throw new Error("Expected an authenticated identity");
    }
    return { subject: identity.userId, tokenIdentifier };
}

function spend(t: ReturnType<typeof harness>, name: "capturesFree" | "capturesPro", key: string, count: number) {
    return t.run((ctx) => captureLimiter.limit(ctx, name, { count, key }));
}

const admit = Effect.succeed({ ok: true });

describe(admitCapture, () => {
    it("a free user gets the whole pool, then notEntitled", async () => {
        const t = harness();
        const identity = await caller(t, await seedAuthUser(t));
        await spend(t, "capturesFree", identity.tokenIdentifier, FREE_CAPTURE_CONFIG.rate - 1);

        await expect(t.run((ctx) => runEdge(admitCapture(ctx, identity, admit)))).resolves.toBe("ok");
        await expect(t.run((ctx) => runEdge(admitCapture(ctx, identity, admit)))).resolves.toBe("notEntitled");
    });

    it("a Pro user is not metered by the free pool, and its ceiling reads as quotaExceeded", async () => {
        const t = harness();
        const seeded = await seedAuthUser(t);
        await grantPro(t, seeded);
        const identity = await caller(t, seeded);
        await spend(t, "capturesFree", identity.tokenIdentifier, FREE_CAPTURE_CONFIG.rate);
        await spend(t, "capturesPro", identity.tokenIdentifier, PRO_CAPTURE_CONFIG.rate - 1);

        await expect(t.run((ctx) => runEdge(admitCapture(ctx, identity, admit)))).resolves.toBe("ok");
        await expect(t.run((ctx) => runEdge(admitCapture(ctx, identity, admit)))).resolves.toBe("quotaExceeded");
    });

    it("pools are per user", async () => {
        const t = harness();
        const first = await caller(t, await seedAuthUser(t));
        const second = await caller(t, await seedAuthUser(t));
        await spend(t, "capturesFree", first.tokenIdentifier, FREE_CAPTURE_CONFIG.rate);

        await expect(t.run((ctx) => runEdge(admitCapture(ctx, first, admit)))).resolves.toBe("notEntitled");
        await expect(t.run((ctx) => runEdge(admitCapture(ctx, second, admit)))).resolves.toBe("ok");
    });
});
