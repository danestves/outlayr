/// <reference types="vite/client" />

import { createThread, getThreadMetadata } from "@convex-dev/agent";
import agentTest from "@convex-dev/agent/test";
import mcpTest from "@convex-dev/mcp/test";
import { RateLimiter } from "@convex-dev/rate-limiter";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import revenuecatTest from "convex-revenuecat/test";
import { convexTest } from "convex-test";
import type { TestConvex } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { api, components, internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import { consumeGoogleLocalReceipt, DELETION_JOBS_PER_USER } from "./accountDeletion";
import type { DeletionJob } from "./accountDeletion";
import { FREE_CAPTURE_CONFIG } from "./lib/captures";
import { fixedBurst } from "./lib/limits";
import { runEdge } from "./lib/runEdge";
import { sha256Hex } from "./lib/sha256Hex";
import { isPro } from "./revenuecat";
import { authenticatedAs, grantPro, seedAuthUser } from "./test.helpers";

const modules = import.meta.glob("../convex/**/*.ts");

/** Relative to the run, or the fixture expires on a calendar date. */
const UNEXPIRED = Date.now() + 60 * 60 * 1000;

const job: DeletionJob = {
    errorCode: null,
    expiresAt: UNEXPIRED,
    googleReceiptChallengeHash: null,
    googleReceiptDigest: null,
    phase: "prepared",
    provider: null,
    secretHash: "hash",
    userId: "user-id",
};

describe("resumable account deletion", () => {
    it("rejects a Google local receipt bound to another deletion job", async () => {
        const receipt = "receipt-for-job-a";
        const jobA: DeletionJob = {
            ...job,
            googleReceiptChallengeHash: await runEdge(sha256Hex(receipt)),
            phase: "prepared",
        };
        const jobB: DeletionJob = {
            ...job,
            googleReceiptChallengeHash: await runEdge(sha256Hex("receipt-for-job-b")),
            phase: "prepared",
        };

        await expect(runEdge(consumeGoogleLocalReceipt(jobB, receipt))).rejects.toThrow("does not match");
        await expect(runEdge(consumeGoogleLocalReceipt(jobA, receipt))).resolves.toMatchObject({
            phase: "providersRevoked",
            provider: "googleLocalReceipt",
        });
    });

    it("accepts one replay of the same Google local receipt without claiming provider attestation", async () => {
        const receipt = "receipt-for-job";
        const prepared: DeletionJob = {
            ...job,
            googleReceiptChallengeHash: await runEdge(sha256Hex(receipt)),
            phase: "prepared",
        };
        const consumed = await runEdge(consumeGoogleLocalReceipt(prepared, receipt));

        expect(consumed.provider).toBe("googleLocalReceipt");
        expect(consumed.googleReceiptChallengeHash).toBeNull();
        expect(consumed.googleReceiptDigest).toBe(await runEdge(sha256Hex(receipt)));
        await expect(runEdge(consumeGoogleLocalReceipt(consumed, receipt))).resolves.toBe(consumed);
    });
});

function stubUpstream(status: number, deletionErrors: unknown[] = []) {
    const fetchMock = vi.fn(async (_input: URL, _init?: RequestInit) =>
        Response.json({ deletion_errors: deletionErrors }, { status })
    );
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
}

async function purgedJob() {
    const t = convexTest(schema, modules);
    agentTest.register(t);
    mcpTest.register(t);
    rateLimiterTest.register(t);
    revenuecatTest.register(t);
    const owner = await seedAuthUser(t);
    await grantPro(t, owner);
    const { resumeSecret } = await authenticatedAs(t, owner).mutation(api.accountDeletion.prepare, {});
    await t.mutation(api.accountDeletion.recordAppleRevocation, { resumeSecret });
    await expect(t.mutation(api.accountDeletion.advance, { resumeSecret })).resolves.toMatchObject({ phase: "purged" });
    return { owner, resumeSecret, t };
}

describe("preparing a deletion", () => {
    it("refuses a new request once the account is holding the cap", async () => {
        const t = convexTest(schema, modules);
        revenuecatTest.register(t);
        const owner = await seedAuthUser(t);
        await grantPro(t, owner);

        for (let n = 0; n < DELETION_JOBS_PER_USER; n += 1) {
            await authenticatedAs(t, owner).mutation(api.accountDeletion.prepare, {});
        }

        await expect(authenticatedAs(t, owner).mutation(api.accountDeletion.prepare, {})).rejects.toThrow(
            "too many open deletion requests"
        );
    });
});

describe("sweeping abandoned jobs", () => {
    async function sweepWith(phase: DeletionJob["phase"], provider: DeletionJob["provider"]): Promise<number> {
        const t = convexTest(schema, modules);
        revenuecatTest.register(t);
        await t.run(async (ctx) => {
            await ctx.db.insert("accountDeletionJobs", { ...job, expiresAt: 0, phase, provider });
        });

        await t.mutation(internal.accountDeletion.cleanupExpired, {});

        return await t.run(async (ctx) => (await ctx.db.query("accountDeletionJobs").collect()).length);
    }

    it("reclaims one abandoned after a Google local receipt, which revoked nothing upstream", async () => {
        await expect(sweepWith("providersRevoked", "googleLocalReceipt")).resolves.toBe(0);
    });

    it("reclaims one abandoned on the password path, which had nothing to revoke", async () => {
        await expect(sweepWith("providersRevoked", "credentialOnly")).resolves.toBe(0);
    });

    it("keeps one that already revoked the user's Apple credential", async () => {
        await expect(sweepWith("providersRevoked", "appleServerRevoked")).resolves.toBe(1);
    });

    it("still reclaims an expired prepared job", async () => {
        await expect(sweepWith("prepared", null)).resolves.toBe(0);
    });

    it("leaves a mid-purge job alone", async () => {
        await expect(sweepWith("purged", null)).resolves.toBe(1);
    });
});

describe("billing erasure", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("erases upstream first, then the mirror, and only then lets auth deletion proceed", async () => {
        const fetchMock = stubUpstream(200);
        const { owner, resumeSecret, t } = await purgedJob();
        await expect(t.mutation(api.accountDeletion.advance, { resumeSecret })).rejects.toThrow("Billing erasure");
        await expect(t.run((ctx) => runEdge(isPro(ctx, owner.userId)))).resolves.toBeTruthy();

        await expect(t.action(api.accountDeletion.eraseBilling, { resumeSecret })).resolves.toMatchObject({
            phase: "billingErased",
        });

        const requests = fetchMock.mock.calls.map(([input, init]) => ({
            body: init?.body instanceof Uint8Array ? new TextDecoder().decode(init.body) : init?.body,
            method: init?.method,
            url: String(input),
        }));
        expect(requests).toContainEqual(
            expect.objectContaining({
                method: "DELETE",
                url: `https://api.revenuecat.com/v1/subscribers/${owner.userId}`,
            })
        );
        expect(requests).toContainEqual({
            body: JSON.stringify({ delete_events: true, distinct_ids: [owner.userId] }),
            method: "POST",
            url: "https://us.posthog.com/api/projects/12345/persons/bulk_delete/",
        });
        await expect(t.run((ctx) => runEdge(isPro(ctx, owner.userId)))).resolves.toBeFalsy();
        await expect(t.mutation(api.accountDeletion.advance, { resumeSecret })).resolves.toMatchObject({
            phase: "authDeleting",
        });
    });

    it("keeps the job at purged, mirror intact, when the upstream erase fails", async () => {
        stubUpstream(500);
        const { owner, resumeSecret, t } = await purgedJob();

        await expect(t.action(api.accountDeletion.eraseBilling, { resumeSecret })).rejects.toThrow("500");

        await expect(t.query(api.accountDeletion.poll, { resumeSecret })).resolves.toMatchObject({ phase: "purged" });
        await expect(t.run((ctx) => runEdge(isPro(ctx, owner.userId)))).resolves.toBeTruthy();
    });

    it("keeps the job at purged when PostHog reports a person it could not delete", async () => {
        stubUpstream(202, [{ person_uuid: "person" }]);
        const { resumeSecret, t } = await purgedJob();

        await expect(t.action(api.accountDeletion.eraseBilling, { resumeSecret })).rejects.toThrow("PostHog");

        await expect(t.query(api.accountDeletion.poll, { resumeSecret })).resolves.toMatchObject({ phase: "purged" });
    });
});

async function expire(t: TestConvex<typeof schema>, resumeSecret: string) {
    const secretHash = await runEdge(sha256Hex(resumeSecret));
    await t.run(async (ctx) => {
        const row = await ctx.db
            .query("accountDeletionJobs")
            .withIndex("by_secretHash", (q) => q.eq("secretHash", secretHash))
            .unique();
        if (row) {
            await ctx.db.patch(row._id, { expiresAt: 0 });
        }
    });
}

describe("an abandoned deletion past its TTL", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("still finishes, because the ledger is already gone", async () => {
        stubUpstream(200);
        const { owner, resumeSecret, t } = await purgedJob();
        await expire(t, resumeSecret);

        await expect(t.query(api.accountDeletion.poll, { resumeSecret })).resolves.toMatchObject({
            phase: "purged",
        });
        await expect(t.action(api.accountDeletion.eraseBilling, { resumeSecret })).resolves.toMatchObject({
            phase: "billingErased",
        });
        await t.mutation(api.accountDeletion.advance, { resumeSecret });
        await expect(t.mutation(api.accountDeletion.advance, { resumeSecret })).resolves.toMatchObject({
            phase: "complete",
        });
        await expect(authRows(t, "user", owner.userId)).resolves.toHaveLength(0);
    });

    it("still refuses to START destroying without fresh reauthentication", async () => {
        const t = convexTest(schema, modules);
        revenuecatTest.register(t);
        const owner = await seedAuthUser(t);
        await grantPro(t, owner);
        const { resumeSecret } = await authenticatedAs(t, owner).mutation(api.accountDeletion.prepare, {});
        await expire(t, resumeSecret);

        await expect(t.mutation(api.accountDeletion.recordAppleRevocation, { resumeSecret })).rejects.toThrow(
            "expired"
        );
    });
});

interface AuthRow {
    _id: string;
    userId?: string;
}

function authRows(t: TestConvex<typeof schema>, model: "account" | "session" | "user", userId: string) {
    return t.run(async (ctx) => {
        const page = (await ctx.runQuery(components.betterAuth.adapter.findMany, {
            model,
            paginationOpts: { cursor: null, numItems: 100 },
            where: [{ field: model === "user" ? "_id" : "userId", operator: "eq", value: userId }],
        })) as { page: AuthRow[] };
        return page.page;
    });
}

async function linkAppleAccount(t: TestConvex<typeof schema>, userId: string) {
    const now = Date.now();
    await t.run((ctx) =>
        ctx.runMutation(components.betterAuth.adapter.create, {
            input: {
                data: {
                    accessToken: "apple-access-token",
                    accountId: "apple-subject",
                    createdAt: now,
                    providerId: "apple",
                    refreshToken: "apple-refresh-token",
                    updatedAt: now,
                    userId,
                },
                model: "account",
            },
        })
    );
}

describe("deleting a password account", () => {
    async function preparedFor(link?: (t: TestConvex<typeof schema>, userId: string) => Promise<void>) {
        const t = convexTest(schema, modules);
        rateLimiterTest.register(t);
        revenuecatTest.register(t);
        const owner = await seedAuthUser(t);
        await link?.(t, owner.userId);
        const { resumeSecret } = await authenticatedAs(t, owner).mutation(api.accountDeletion.prepare, {});
        return { resumeSecret, t };
    }

    it("goes on to the purge with no provider to revoke", async () => {
        const { resumeSecret, t } = await preparedFor();

        await expect(t.mutation(api.accountDeletion.recordCredentialOnly, { resumeSecret })).resolves.toMatchObject({
            phase: "providersRevoked",
        });
        await expect(t.mutation(api.accountDeletion.advance, { resumeSecret })).resolves.toMatchObject({
            phase: "purged",
        });
    });

    it("refuses an account that also signs in with Apple", async () => {
        const { resumeSecret, t } = await preparedFor(linkAppleAccount);

        await expect(t.mutation(api.accountDeletion.recordCredentialOnly, { resumeSecret })).rejects.toThrow(
            "has to be revoked first"
        );
    });
});

async function connectAgent(t: TestConvex<typeof schema>, userId: string) {
    vi.stubEnv("CONVEX_SITE_URL", "https://example.convex.site");
    await t.action(internal.mcp.createApiKeyForUser, { userId });
}

const agentConnections = (t: TestConvex<typeof schema>, userId: string) =>
    t.run((ctx) => ctx.runQuery(components.mcp.grants.list, { userId }));

describe("auth deletion", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    it("erases the user, its sessions, its OAuth links and its agent connections, then reports complete", async () => {
        stubUpstream(200);
        const { owner, resumeSecret, t } = await purgedJob();
        await linkAppleAccount(t, owner.userId);
        await connectAgent(t, owner.userId);
        await expect(agentConnections(t, owner.userId)).resolves.toHaveLength(1);
        await t.action(api.accountDeletion.eraseBilling, { resumeSecret });
        await expect(t.mutation(api.accountDeletion.advance, { resumeSecret })).resolves.toMatchObject({
            phase: "authDeleting",
        });

        await expect(t.mutation(api.accountDeletion.advance, { resumeSecret })).resolves.toMatchObject({
            phase: "complete",
        });

        await expect(authRows(t, "user", owner.userId)).resolves.toHaveLength(0);
        await expect(authRows(t, "session", owner.userId)).resolves.toHaveLength(0);
        await expect(authRows(t, "account", owner.userId)).resolves.toHaveLength(0);
        await expect(agentConnections(t, owner.userId)).resolves.toHaveLength(0);
        await expect(t.query(api.accountDeletion.poll, { resumeSecret })).resolves.toMatchObject({
            phase: "complete",
        });
    });

    it("leaves no suggestion requests, usage counters or voice threads behind", async () => {
        stubUpstream(200);
        const t = convexTest(schema, modules);
        agentTest.register(t);
        mcpTest.register(t);
        rateLimiterTest.register(t);
        revenuecatTest.register(t);
        const usage = new RateLimiter(components.rateLimiter);
        const queue = fixedBurst("enrichmentQueue", false);
        const owner = await seedAuthUser(t);
        await grantPro(t, owner);
        const asOwner = authenticatedAs(t, owner);
        const key = (await asOwner.run(async (ctx) => (await ctx.auth.getUserIdentity())?.tokenIdentifier)) ?? "";
        const threadId = await t.run(async (ctx) => {
            await ctx.db.insert("enrichmentJobs", {
                categoryTree: [],
                grounded: false,
                income: false,
                localId: "entry",
                name: "Blue Bottle",
                status: "queued",
                userId: owner.userId,
            });
            await usage.limit(ctx, "capturesFree", { config: FREE_CAPTURE_CONFIG, count: 3, key });
            await usage.limit(ctx, "enrichmentQueue", { config: queue, count: 3, key: owner.userId });
            return await createThread(ctx, components.agent, { userId: key });
        });

        const { resumeSecret } = await asOwner.mutation(api.accountDeletion.prepare, {});
        await t.mutation(api.accountDeletion.recordAppleRevocation, { resumeSecret });
        await t.mutation(api.accountDeletion.advance, { resumeSecret });
        await expect(t.mutation(api.accountDeletion.advance, { resumeSecret })).resolves.toMatchObject({
            phase: "purged",
        });
        await t.action(api.accountDeletion.eraseBilling, { resumeSecret });
        await t.mutation(api.accountDeletion.advance, { resumeSecret });
        vi.useFakeTimers();
        await expect(t.mutation(api.accountDeletion.advance, { resumeSecret })).resolves.toMatchObject({
            phase: "complete",
        });
        await t.finishAllScheduledFunctions(vi.runAllTimers);
        vi.useRealTimers();

        await expect(t.run(async (ctx) => await ctx.db.query("enrichmentJobs").collect())).resolves.toHaveLength(0);
        await expect(
            t.run(async (ctx) => await usage.getValue(ctx, "capturesFree", { config: FREE_CAPTURE_CONFIG, key }))
        ).resolves.toMatchObject({ value: FREE_CAPTURE_CONFIG.rate });
        await expect(
            t.run(async (ctx) => await usage.getValue(ctx, "enrichmentQueue", { config: queue, key: owner.userId }))
        ).resolves.toMatchObject({ value: queue.capacity });
        await expect(
            t.run(async (ctx) => await getThreadMetadata(ctx, components.agent, { threadId }).catch(() => null))
        ).resolves.toBeNull();
        await expect(
            t.run(async (ctx) => await ctx.db.query("accountDeletionJobs").first())
        ).resolves.not.toHaveProperty("tokenIdentifier");
    });
});
