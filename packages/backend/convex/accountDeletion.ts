import { RateLimiter } from "@convex-dev/rate-limiter";
import { env } from "@outlayr/env/backend";
import { ConvexError, v } from "convex/values";

import { components, internal } from "./_generated/api";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { purgeUserBatch } from "./account";
import { requireUserId } from "./lib/auth";
import { erasePostHogPerson } from "./lib/posthog";
import { sha256Hex } from "./lib/sha256Hex";
import { eraseUpstreamCustomer, revenuecat } from "./revenuecat";

const DELETE_JOB_TTL_MS = 24 * 60 * 60 * 1000;
const UPSTREAM_ERASE_SECRETS = ["REVENUECAT_SECRET_KEY", "POSTHOG_PERSONAL_API_KEY", "POSTHOG_PROJECT_ID"] as const;
const AUTH_DELETE_PAGE = 100;

const usage = new RateLimiter(components.rateLimiter);

const USAGE_BY_TOKEN = [
    "capturesFree",
    "capturesPro",
    "csvImportPerUser",
    "enrichmentBackground",
    "enrichmentPerUser",
    "groundedPerUser",
    "receiptScanPerUser",
    "revenuecatSync",
    "voiceEntryPerUser",
    "voiceThreadPerUser",
] as const;

type DeletionProvider = "appleServerRevoked" | "credentialOnly" | "googleLocalReceipt" | null;
export type DeletionPhase = "prepared" | "providersRevoked" | "purged" | "billingErased" | "authDeleting" | "complete";

export interface DeletionJob {
    errorCode: string | null;
    expiresAt: number;
    googleReceiptChallengeHash: string | null;
    googleReceiptDigest: string | null;
    phase: DeletionPhase;
    provider: DeletionProvider;
    secretHash: string;
    tokenIdentifier?: string;
    userId: string | null;
}

/** The TTL gates starting the destruction, not finishing it: a device offline mid-purge must be able to finish. */
export function requireUnexpiredDeletionJob(job: DeletionJob, at: number = Date.now()): void {
    if (job.phase === "prepared" && job.expiresAt <= at) {
        throw new ConvexError("Deletion job expired; reauthentication is required");
    }
}

function randomSecret(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    return btoa(String.fromCodePoint(...bytes))
        .replaceAll("+", "-")
        .replaceAll("/", "_")
        .replaceAll("=", "");
}

export async function consumeGoogleLocalReceipt(job: DeletionJob, receiptChallenge: string): Promise<DeletionJob> {
    const receiptDigest = await sha256Hex(receiptChallenge);
    if (job.phase === "providersRevoked" && job.provider === "googleLocalReceipt") {
        if (receiptDigest !== job.googleReceiptDigest) {
            throw new Error("Google local receipt does not match this deletion job");
        }
        return job;
    }
    if (job.phase !== "prepared" || !job.googleReceiptChallengeHash) {
        throw new Error("Google local receipt cannot be accepted for this deletion job");
    }
    if (receiptDigest !== job.googleReceiptChallengeHash) {
        throw new Error("Google local receipt does not match this deletion job");
    }
    return {
        ...job,
        googleReceiptChallengeHash: null,
        googleReceiptDigest: receiptDigest,
        phase: "providersRevoked",
        provider: "googleLocalReceipt",
    };
}

async function jobForSecret(ctx: QueryCtx, secret: string) {
    const secretHash = await sha256Hex(secret);
    return ctx.db
        .query("accountDeletionJobs")
        .withIndex("by_secretHash", (q) => q.eq("secretHash", secretHash))
        .unique();
}

function publicStatus(job: { errorCode: string | null; phase: DeletionPhase }) {
    return { errorCode: job.errorCode, phase: job.phase };
}

function requireUnexpiredPreparedJob(job: DeletionJob) {
    requireUnexpiredDeletionJob(job);
    if (job.phase !== "prepared") {
        throw new ConvexError("Deletion job cannot revoke providers now");
    }
}

/** Capped so `sync.refuseWhileDeleting` reads jobs cheaply and no client can bury the job that refuses a push. */
export const DELETION_JOBS_PER_USER = 20;

export const prepare = mutation({
    args: {},
    handler: async (ctx) => {
        const missing = UPSTREAM_ERASE_SECRETS.filter((name) => !env[name]);
        if (missing.length > 0) {
            throw new ConvexError(`Account deletion needs ${missing.join(", ")} before it can erase upstream copies`);
        }
        const userId = await requireUserId(ctx);
        const identity = await ctx.auth.getUserIdentity();
        const open = await ctx.db
            .query("accountDeletionJobs")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .take(DELETION_JOBS_PER_USER);
        if (open.length >= DELETION_JOBS_PER_USER) {
            throw new ConvexError("This account already has too many open deletion requests");
        }
        const receiptChallenge = randomSecret();
        const resumeSecret = randomSecret();
        await ctx.db.insert("accountDeletionJobs", {
            errorCode: null,
            expiresAt: Date.now() + DELETE_JOB_TTL_MS,
            googleReceiptChallengeHash: await sha256Hex(receiptChallenge),
            googleReceiptDigest: null,
            phase: "prepared",
            provider: null,
            secretHash: await sha256Hex(resumeSecret),
            tokenIdentifier: identity?.tokenIdentifier,
            userId,
        });
        return { receiptChallenge, resumeSecret };
    },
});

export const submitGoogleLocalReceipt = mutation({
    args: { receiptChallenge: v.string(), resumeSecret: v.string() },
    handler: async (ctx, args) => {
        const job = await jobForSecret(ctx, args.resumeSecret);
        if (!job) {
            throw new ConvexError("Deletion job not found");
        }
        requireUnexpiredDeletionJob(job);
        if (job.phase === "providersRevoked" && job.provider === "googleLocalReceipt") {
            await consumeGoogleLocalReceipt(job, args.receiptChallenge);
            return publicStatus(job);
        }
        requireUnexpiredPreparedJob(job);
        const consumed = await consumeGoogleLocalReceipt(job, args.receiptChallenge);
        await ctx.db.patch(job._id, {
            googleReceiptChallengeHash: null,
            googleReceiptDigest: consumed.googleReceiptDigest,
            phase: consumed.phase,
            provider: consumed.provider,
        });
        return publicStatus(consumed);
    },
});

export const recordAppleRevocation = mutation({
    args: { resumeSecret: v.string() },
    handler: async (ctx, args) => {
        const job = await jobForSecret(ctx, args.resumeSecret);
        if (!job) {
            throw new ConvexError("Deletion job not found");
        }
        requireUnexpiredDeletionJob(job);
        if (job.phase === "providersRevoked" && job.provider === "appleServerRevoked") {
            return publicStatus(job);
        }
        requireUnexpiredPreparedJob(job);
        await ctx.db.patch(job._id, { phase: "providersRevoked", provider: "appleServerRevoked" });
        return publicStatus({ ...job, phase: "providersRevoked" });
    },
});

/** A password account has no provider to revoke, so this only checks that it really has none. */
export const recordCredentialOnly = mutation({
    args: { resumeSecret: v.string() },
    handler: async (ctx, args) => {
        const job = await jobForSecret(ctx, args.resumeSecret);
        if (!job) {
            throw new ConvexError("Deletion job not found");
        }
        requireUnexpiredDeletionJob(job);
        if (job.phase === "providersRevoked" && job.provider === "credentialOnly") {
            return publicStatus(job);
        }
        requireUnexpiredPreparedJob(job);
        if (!job.userId) {
            throw new ConvexError("Deletion job is missing its private user linkage");
        }
        const accounts = await ctx.runQuery(components.betterAuth.adapter.findMany, {
            model: "account",
            paginationOpts: { cursor: null, numItems: AUTH_DELETE_PAGE },
            where: [{ field: "userId", operator: "eq", value: job.userId }],
        });
        if (accounts.page.some((account: { providerId: string }) => account.providerId !== "credential")) {
            throw new ConvexError("This account is linked to a provider that has to be revoked first");
        }
        await ctx.db.patch(job._id, { phase: "providersRevoked", provider: "credentialOnly" });
        return publicStatus({ ...job, phase: "providersRevoked" });
    },
});

async function forgetUsage(ctx: MutationCtx, userId: string, tokenIdentifier: string | undefined): Promise<void> {
    await usage.reset(ctx, "enrichmentQueue", { key: userId });
    if (tokenIdentifier === undefined) {
        return;
    }
    /* oxlint-disable no-await-in-loop -- component mutations inside a mutation run one at a time */
    for (const name of USAGE_BY_TOKEN) {
        await usage.reset(ctx, name, { key: tokenIdentifier });
    }
    /* oxlint-enable no-await-in-loop */
    await ctx.runMutation(components.agent.users.deleteAllForUserIdAsync, { userId: tokenIdentifier });
}

/** Better Auth's user cascade is off (`auth.ts`), so these are ours; `deleteMany` takes one page per call. */
async function deleteAuthRows(
    ctx: MutationCtx,
    model: "account" | "oauthAccessToken" | "oauthConsent" | "session",
    userId: string
): Promise<void> {
    let cursor: string | null = null;
    let done = false;
    /* oxlint-disable no-await-in-loop -- each page's cursor is the next request's argument */
    while (!done) {
        // SAFETY: as in the `deleteOne` call in `advance`.
        const page = (await ctx.runMutation(
            components.betterAuth.adapter.deleteMany as never,
            {
                input: { model, where: [{ field: "userId", operator: "eq", value: userId }] },
                paginationOpts: { cursor, numItems: AUTH_DELETE_PAGE },
            } as never
        )) as { continueCursor: string; isDone: boolean };
        done = page.isDone;
        cursor = page.continueCursor;
    }
    /* oxlint-enable no-await-in-loop */
}

export const advance = mutation({
    args: { resumeSecret: v.string() },
    handler: async (ctx, args) => {
        const job = await jobForSecret(ctx, args.resumeSecret);
        if (!job) {
            throw new ConvexError("Deletion job not found");
        }
        if (job.phase === "complete") {
            return publicStatus(job);
        }
        requireUnexpiredDeletionJob(job);
        if (job.phase === "prepared" || job.provider === null) {
            throw new ConvexError("Provider revocation is required before purge");
        }
        if (!job.userId) {
            throw new ConvexError("Deletion job is missing its private user linkage");
        }
        if (job.phase === "providersRevoked") {
            const result = await purgeUserBatch(ctx, job.userId);
            if (!result.done) {
                return publicStatus(job);
            }
            await ctx.db.patch(job._id, { phase: "purged" });
            return publicStatus({ ...job, phase: "purged" });
        }
        if (job.phase === "purged") {
            throw new ConvexError("Billing erasure is required before auth deletion");
        }
        if (job.phase === "billingErased") {
            await ctx.db.patch(job._id, { phase: "authDeleting" });
            return publicStatus({ ...job, phase: "authDeleting" });
        }
        await forgetUsage(ctx, job.userId, job.tokenIdentifier);
        await deleteAuthRows(ctx, "oauthAccessToken", job.userId);
        await deleteAuthRows(ctx, "oauthConsent", job.userId);
        await deleteAuthRows(ctx, "session", job.userId);
        await deleteAuthRows(ctx, "account", job.userId);
        // SAFETY: the component types its references against its own generated api, which this app does not import.
        await ctx.runMutation(
            components.betterAuth.adapter.deleteOne as never,
            {
                input: { model: "user", where: [{ field: "_id", operator: "eq", value: job.userId }] },
            } as never
        );
        await ctx.db.patch(job._id, { phase: "complete", tokenIdentifier: undefined, userId: null });
        return { errorCode: null, phase: "complete" as const };
    },
});

export const billingTarget = internalQuery({
    args: { resumeSecret: v.string() },
    handler: async (ctx, args) => {
        const job = await jobForSecret(ctx, args.resumeSecret);
        if (!job) {
            throw new ConvexError("Deletion job not found");
        }
        requireUnexpiredDeletionJob(job);
        if (job.phase === "providersRevoked" || job.phase === "prepared") {
            throw new ConvexError("Purge is required before billing erasure");
        }
        return job.phase === "purged" ? job.userId : null;
    },
});

export const recordBillingErased = internalMutation({
    args: { resumeSecret: v.string() },
    handler: async (ctx, args) => {
        const job = await jobForSecret(ctx, args.resumeSecret);
        if (!job) {
            throw new ConvexError("Deletion job not found");
        }
        requireUnexpiredDeletionJob(job);
        if (job.phase !== "purged") {
            return publicStatus(job);
        }
        if (!job.userId) {
            throw new ConvexError("Deletion job is missing its private user linkage");
        }
        await revenuecat.deleteCustomer(ctx, { appUserId: job.userId });
        await ctx.db.patch(job._id, { phase: "billingErased" });
        return publicStatus({ ...job, phase: "billingErased" });
    },
});

export const eraseBilling = action({
    args: { resumeSecret: v.string() },
    handler: async (ctx, args): Promise<{ errorCode: string | null; phase: DeletionPhase }> => {
        const appUserId = await ctx.runQuery(internal.accountDeletion.billingTarget, args);
        if (appUserId !== null) {
            await eraseUpstreamCustomer(appUserId);
            await erasePostHogPerson(appUserId);
        }
        return await ctx.runMutation(internal.accountDeletion.recordBillingErased, args);
    },
});

export const poll = query({
    args: { at: v.optional(v.number()), resumeSecret: v.string() },
    handler: async (ctx, args) => {
        const job = await jobForSecret(ctx, args.resumeSecret);
        if (!job) {
            return null;
        }
        // Nothing writes the job when it merely expires, so a subscriber would keep the old phase.
        if (job.phase === "prepared" && job.expiresAt <= (args.at ?? Date.now())) {
            return null;
        }
        return publicStatus(job);
    },
});

export const resumeUserId = internalQuery({
    args: { resumeSecret: v.string() },
    handler: async (ctx, args) => {
        const job = await jobForSecret(ctx, args.resumeSecret);
        if (!job) {
            throw new ConvexError("Deletion job cannot revoke Apple credentials now");
        }
        requireUnexpiredDeletionJob(job);
        if (job.phase !== "prepared" || !job.userId) {
            throw new ConvexError("Deletion job cannot revoke Apple credentials now");
        }
        return job.userId;
    },
});

const CLEANUP_BATCH = 200;

export const cleanupExpired = internalMutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();
        const expired = (phase: "prepared" | "complete" | "providersRevoked") =>
            ctx.db
                .query("accountDeletionJobs")
                .withIndex("by_phase_and_expiresAt", (q) => q.eq("phase", phase).lt("expiresAt", now))
                .take(CLEANUP_BATCH);
        const [prepared, complete, revoked] = await Promise.all([
            expired("prepared"),
            expired("complete"),
            expired("providersRevoked"),
        ]);
        const jobs = [
            ...prepared,
            ...complete,
            ...revoked.filter((job) => job.provider === "googleLocalReceipt" || job.provider === "credentialOnly"),
        ];
        await Promise.all(jobs.map(async (job) => await ctx.db.delete(job._id)));
    },
});
