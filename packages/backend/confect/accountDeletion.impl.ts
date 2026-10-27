import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Clock from "effect/Clock";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import { components } from "../convex/_generated/api";
import refs from "./_generated/refs";
import databaseSchema from "./_generated/schema";
import { Auth, DatabaseReader, DatabaseWriter, MutationCtx, MutationRunner, QueryRunner } from "./_generated/services";
import {
    AUTH_DELETE_PAGE,
    CLEANUP_BATCH,
    consumeGoogleLocalReceipt,
    DELETE_JOB_TTL_MS,
    DELETION_JOBS_PER_USER,
    DeletionRefused,
    DeletionUnconfigured,
    publicStatus,
    randomSecret,
    UPSTREAM_ERASE_SECRETS,
    usage,
    USAGE_BY_TOKEN,
} from "./accountDeletion";
import type { DeletionJob } from "./accountDeletion";
import spec from "./accountDeletion.spec";
import { purgeUserBatch } from "./lib/account";
import { requireUserId } from "./lib/auth";
import { dieAsConvexError } from "./lib/convexError";
import { outboundHttp } from "./lib/http";
import { erasePostHogPerson } from "./lib/posthog";
import { sha256Hex } from "./lib/sha256Hex";
import { eraseUpstreamCustomer, revenuecat } from "./revenuecat";

const refusedAsConvexError = Effect.catchTags({ DeletionRefused: dieAsConvexError });

/** The TTL gates starting the destruction, not finishing it: a device offline mid-purge must be able to finish. */
const requireUnexpiredDeletionJob = Effect.fn("AccountDeletion.requireUnexpiredDeletionJob")(
    function* requireUnexpiredDeletionJob(job: DeletionJob) {
        const at = yield* Clock.currentTimeMillis;
        if (job.phase === "prepared" && job.expiresAt <= at) {
            return yield* new DeletionRefused({ reason: "expired" });
        }
    }
);

const requireUnexpiredPreparedJob = Effect.fn("AccountDeletion.requireUnexpiredPreparedJob")(
    function* requireUnexpiredPreparedJob(job: DeletionJob) {
        yield* requireUnexpiredDeletionJob(job);
        if (job.phase !== "prepared") {
            return yield* new DeletionRefused({ reason: "cannotRevokeProviders" });
        }
    }
);

const jobForSecret = Effect.fn("AccountDeletion.jobForSecret")(function* jobForSecret(secret: string) {
    const reader = yield* DatabaseReader;
    const secretHash = yield* sha256Hex(secret);
    return yield* reader
        .table("accountDeletionJobs")
        .get("by_secretHash", secretHash)
        .pipe(Effect.catchTags({ GetByIndexFailure: () => Effect.succeed(null) }));
});

const prepare = FunctionImpl.make(
    databaseSchema,
    spec,
    "prepare",
    Effect.fn("AccountDeletion.prepare")(
        function* prepare() {
            const unset = yield* Effect.all(
                UPSTREAM_ERASE_SECRETS.map((name) => Config.option(Config.String(name)).pipe(Effect.map(Option.isNone)))
            );
            const missing = UPSTREAM_ERASE_SECRETS.filter((_name, index) => unset[index]);
            if (missing.length > 0) {
                return yield* new DeletionUnconfigured({ missing });
            }
            const ctx = yield* MutationCtx;
            const auth = yield* Auth;
            const reader = yield* DatabaseReader;
            const writer = yield* DatabaseWriter;
            const userId = yield* requireUserId(ctx);
            const identity = yield* auth.getUserIdentity.pipe(
                Effect.catchTags({ NoUserIdentityFoundError: () => Effect.succeed(null) })
            );
            const open = yield* reader
                .table("accountDeletionJobs")
                .index("by_userId", (q) => q.eq("userId", userId))
                .take(DELETION_JOBS_PER_USER);
            if (open.length >= DELETION_JOBS_PER_USER) {
                return yield* new DeletionRefused({ reason: "tooManyOpen" });
            }
            const receiptChallenge = randomSecret();
            const resumeSecret = randomSecret();
            const now = yield* Clock.currentTimeMillis;
            yield* writer.table("accountDeletionJobs").insert({
                errorCode: null,
                expiresAt: now + DELETE_JOB_TTL_MS,
                googleReceiptChallengeHash: yield* sha256Hex(receiptChallenge),
                googleReceiptDigest: null,
                phase: "prepared",
                provider: null,
                secretHash: yield* sha256Hex(resumeSecret),
                tokenIdentifier: identity?.tokenIdentifier,
                userId,
            });
            return { receiptChallenge, resumeSecret };
        },
        Effect.catchTags({
            DeletionRefused: dieAsConvexError,
            DeletionUnconfigured: dieAsConvexError,
            Unauthenticated: dieAsConvexError,
        }),
        Effect.orDie
    )
);

const submitGoogleLocalReceipt = FunctionImpl.make(
    databaseSchema,
    spec,
    "submitGoogleLocalReceipt",
    Effect.fn("AccountDeletion.submitGoogleLocalReceipt")(
        function* submitGoogleLocalReceipt(args) {
            const writer = yield* DatabaseWriter;
            const job = yield* jobForSecret(args.resumeSecret);
            if (!job) {
                return yield* new DeletionRefused({ reason: "notFound" });
            }
            yield* requireUnexpiredDeletionJob(job);
            if (job.phase === "providersRevoked" && job.provider === "googleLocalReceipt") {
                yield* consumeGoogleLocalReceipt(job, args.receiptChallenge);
                return publicStatus(job);
            }
            yield* requireUnexpiredPreparedJob(job);
            const consumed = yield* consumeGoogleLocalReceipt(job, args.receiptChallenge);
            yield* writer.table("accountDeletionJobs").patch(job._id, {
                googleReceiptChallengeHash: null,
                googleReceiptDigest: consumed.googleReceiptDigest,
                phase: consumed.phase,
                provider: consumed.provider,
            });
            return publicStatus(consumed);
        },
        refusedAsConvexError,
        Effect.orDie
    )
);

const recordAppleRevocation = FunctionImpl.make(
    databaseSchema,
    spec,
    "recordAppleRevocation",
    Effect.fn("AccountDeletion.recordAppleRevocation")(
        function* recordAppleRevocation(args) {
            const writer = yield* DatabaseWriter;
            const job = yield* jobForSecret(args.resumeSecret);
            if (!job) {
                return yield* new DeletionRefused({ reason: "notFound" });
            }
            yield* requireUnexpiredDeletionJob(job);
            if (job.phase === "providersRevoked" && job.provider === "appleServerRevoked") {
                return publicStatus(job);
            }
            yield* requireUnexpiredPreparedJob(job);
            yield* writer
                .table("accountDeletionJobs")
                .patch(job._id, { phase: "providersRevoked", provider: "appleServerRevoked" });
            return publicStatus({ ...job, phase: "providersRevoked" });
        },
        refusedAsConvexError,
        Effect.orDie
    )
);

/** A password account has no provider to revoke, so this only checks that it really has none. */
const recordCredentialOnly = FunctionImpl.make(
    databaseSchema,
    spec,
    "recordCredentialOnly",
    Effect.fn("AccountDeletion.recordCredentialOnly")(
        function* recordCredentialOnly(args) {
            const ctx = yield* MutationCtx;
            const writer = yield* DatabaseWriter;
            const job = yield* jobForSecret(args.resumeSecret);
            if (!job) {
                return yield* new DeletionRefused({ reason: "notFound" });
            }
            yield* requireUnexpiredDeletionJob(job);
            if (job.phase === "providersRevoked" && job.provider === "credentialOnly") {
                return publicStatus(job);
            }
            yield* requireUnexpiredPreparedJob(job);
            const { userId } = job;
            if (!userId) {
                return yield* new DeletionRefused({ reason: "missingUserLinkage" });
            }
            const accounts = yield* Effect.promise(() =>
                ctx.runQuery(components.betterAuth.adapter.findMany, {
                    model: "account",
                    paginationOpts: { cursor: null, numItems: AUTH_DELETE_PAGE },
                    where: [{ field: "userId", operator: "eq", value: userId }],
                })
            );
            if (accounts.page.some((account: { providerId: string }) => account.providerId !== "credential")) {
                return yield* new DeletionRefused({ reason: "providerLinked" });
            }
            yield* writer
                .table("accountDeletionJobs")
                .patch(job._id, { phase: "providersRevoked", provider: "credentialOnly" });
            return publicStatus({ ...job, phase: "providersRevoked" });
        },
        refusedAsConvexError,
        Effect.orDie
    )
);

const forgetUsage = Effect.fn("AccountDeletion.forgetUsage")(function* forgetUsage(
    userId: string,
    tokenIdentifier: string | undefined
) {
    const ctx = yield* MutationCtx;
    yield* Effect.promise(() => usage.reset(ctx, "enrichmentQueue", { key: userId }));
    if (tokenIdentifier === undefined) {
        return;
    }
    // Component mutations inside a mutation run one at a time.
    for (const name of USAGE_BY_TOKEN) {
        yield* Effect.promise(() => usage.reset(ctx, name, { key: tokenIdentifier }));
    }
    yield* Effect.promise(() =>
        ctx.runMutation(components.agent.users.deleteAllForUserIdAsync, { userId: tokenIdentifier })
    );
});

/** Better Auth's user cascade is off (`lib/betterAuth.ts`), so these are ours; `deleteMany` takes one page per call. */
const deleteAuthRows = Effect.fn("AccountDeletion.deleteAuthRows")(function* deleteAuthRows(
    model: "account" | "session",
    userId: string
) {
    const ctx = yield* MutationCtx;
    let cursor: string | null = null;
    let done = false;
    // Each page's cursor is the next request's argument.
    while (!done) {
        const paginationOpts = { cursor, numItems: AUTH_DELETE_PAGE };
        // SAFETY: as in the `deleteOne` call in `advance`.
        const page = (yield* Effect.promise(() =>
            ctx.runMutation(
                components.betterAuth.adapter.deleteMany as never,
                {
                    input: { model, where: [{ field: "userId", operator: "eq", value: userId }] },
                    paginationOpts,
                } as never
            )
        )) as { continueCursor: string; isDone: boolean };
        done = page.isDone;
        cursor = page.continueCursor;
    }
});

const revokeAgentConnections = Effect.fn("AccountDeletion.revokeAgentConnections")(function* revokeAgentConnections(
    userId: string
) {
    const ctx = yield* MutationCtx;
    let grants = yield* Effect.promise(() => ctx.runQuery(components.mcp.grants.list, { userId }));
    // Each page must be gone before the next read.
    while (grants.length > 0) {
        yield* Effect.all(
            grants.map((grant) =>
                Effect.promise(() => ctx.runMutation(components.mcp.grants.revoke, { grantId: grant._id, userId }))
            ),
            { concurrency: "unbounded", discard: true }
        );
        grants = yield* Effect.promise(() => ctx.runQuery(components.mcp.grants.list, { userId }));
    }
});

const advance = FunctionImpl.make(
    databaseSchema,
    spec,
    "advance",
    Effect.fn("AccountDeletion.advance")(
        function* advance(args) {
            const ctx = yield* MutationCtx;
            const writer = yield* DatabaseWriter;
            const job = yield* jobForSecret(args.resumeSecret);
            if (!job) {
                return yield* new DeletionRefused({ reason: "notFound" });
            }
            if (job.phase === "complete") {
                return publicStatus(job);
            }
            yield* requireUnexpiredDeletionJob(job);
            if (job.phase === "prepared" || job.provider === null) {
                return yield* new DeletionRefused({ reason: "revocationRequired" });
            }
            const { userId } = job;
            if (!userId) {
                return yield* new DeletionRefused({ reason: "missingUserLinkage" });
            }
            if (job.phase === "providersRevoked") {
                const result = yield* purgeUserBatch(ctx, userId);
                if (!result.done) {
                    return publicStatus(job);
                }
                yield* writer.table("accountDeletionJobs").patch(job._id, { phase: "purged" });
                return publicStatus({ ...job, phase: "purged" });
            }
            if (job.phase === "purged") {
                return yield* new DeletionRefused({ reason: "billingErasureRequired" });
            }
            if (job.phase === "billingErased") {
                yield* writer.table("accountDeletionJobs").patch(job._id, { phase: "authDeleting" });
                return publicStatus({ ...job, phase: "authDeleting" });
            }
            yield* forgetUsage(userId, job.tokenIdentifier);
            yield* revokeAgentConnections(userId);
            yield* deleteAuthRows("session", userId);
            yield* deleteAuthRows("account", userId);
            // SAFETY: the component types its references against its own generated api, which this app does not
            // import.
            yield* Effect.promise(() =>
                ctx.runMutation(
                    components.betterAuth.adapter.deleteOne as never,
                    {
                        input: { model: "user", where: [{ field: "_id", operator: "eq", value: userId }] },
                    } as never
                )
            );
            yield* writer
                .table("accountDeletionJobs")
                .patch(job._id, { phase: "complete", tokenIdentifier: undefined, userId: null });
            return { errorCode: null, phase: "complete" as const };
        },
        refusedAsConvexError,
        Effect.orDie
    )
);

const billingTarget = FunctionImpl.make(
    databaseSchema,
    spec,
    "billingTarget",
    Effect.fn("AccountDeletion.billingTarget")(
        function* billingTarget(args) {
            const job = yield* jobForSecret(args.resumeSecret);
            if (!job) {
                return yield* new DeletionRefused({ reason: "notFound" });
            }
            yield* requireUnexpiredDeletionJob(job);
            if (job.phase === "providersRevoked" || job.phase === "prepared") {
                return yield* new DeletionRefused({ reason: "purgeRequired" });
            }
            return job.phase === "purged" ? job.userId : null;
        },
        refusedAsConvexError,
        Effect.orDie
    )
);

const recordBillingErased = FunctionImpl.make(
    databaseSchema,
    spec,
    "recordBillingErased",
    Effect.fn("AccountDeletion.recordBillingErased")(
        function* recordBillingErased(args) {
            const ctx = yield* MutationCtx;
            const writer = yield* DatabaseWriter;
            const job = yield* jobForSecret(args.resumeSecret);
            if (!job) {
                return yield* new DeletionRefused({ reason: "notFound" });
            }
            yield* requireUnexpiredDeletionJob(job);
            if (job.phase !== "purged") {
                return publicStatus(job);
            }
            const { userId } = job;
            if (!userId) {
                return yield* new DeletionRefused({ reason: "missingUserLinkage" });
            }
            yield* Effect.promise(() => revenuecat.deleteCustomer(ctx, { appUserId: userId }));
            yield* writer.table("accountDeletionJobs").patch(job._id, { phase: "billingErased" });
            return publicStatus({ ...job, phase: "billingErased" });
        },
        refusedAsConvexError,
        Effect.orDie
    )
);

const eraseBilling = FunctionImpl.make(
    databaseSchema,
    spec,
    "eraseBilling",
    Effect.fn("AccountDeletion.eraseBilling")(function* eraseBilling(args) {
        const { runQuery } = yield* QueryRunner;
        const { runMutation } = yield* MutationRunner;
        const appUserId = yield* runQuery(refs.internal.accountDeletion.billingTarget, args);
        if (appUserId !== null) {
            yield* eraseUpstreamCustomer(appUserId).pipe(Effect.provide(outboundHttp));
            yield* erasePostHogPerson(appUserId).pipe(Effect.provide(outboundHttp));
        }
        return yield* runMutation(refs.internal.accountDeletion.recordBillingErased, args);
    }, Effect.orDie)
);

const poll = FunctionImpl.make(
    databaseSchema,
    spec,
    "poll",
    Effect.fn("AccountDeletion.poll")(function* poll(args) {
        const job = yield* jobForSecret(args.resumeSecret);
        if (!job) {
            return null;
        }
        // Nothing writes the job when it merely expires, so a subscriber would keep the old phase.
        if (job.phase === "prepared" && job.expiresAt <= (args.at ?? (yield* Clock.currentTimeMillis))) {
            return null;
        }
        return publicStatus(job);
    }, Effect.orDie)
);

const resumeUserId = FunctionImpl.make(
    databaseSchema,
    spec,
    "resumeUserId",
    Effect.fn("AccountDeletion.resumeUserId")(
        function* resumeUserId(args) {
            const job = yield* jobForSecret(args.resumeSecret);
            if (!job) {
                return yield* new DeletionRefused({ reason: "cannotRevokeApple" });
            }
            yield* requireUnexpiredDeletionJob(job);
            if (job.phase !== "prepared" || !job.userId) {
                return yield* new DeletionRefused({ reason: "cannotRevokeApple" });
            }
            return job.userId;
        },
        refusedAsConvexError,
        Effect.orDie
    )
);

const cleanupExpired = FunctionImpl.make(
    databaseSchema,
    spec,
    "cleanupExpired",
    Effect.fn("AccountDeletion.cleanupExpired")(function* cleanupExpired() {
        const reader = yield* DatabaseReader;
        const writer = yield* DatabaseWriter;
        const now = yield* Clock.currentTimeMillis;
        const expired = (phase: "prepared" | "complete" | "providersRevoked") =>
            reader
                .table("accountDeletionJobs")
                .index("by_phase_and_expiresAt", (q) => q.eq("phase", phase).lt("expiresAt", now))
                .take(CLEANUP_BATCH);
        const [prepared, complete, revoked] = yield* Effect.all(
            [expired("prepared"), expired("complete"), expired("providersRevoked")],
            { concurrency: "unbounded" }
        );
        const jobs = [
            ...prepared,
            ...complete,
            ...revoked.filter((job) => job.provider === "googleLocalReceipt" || job.provider === "credentialOnly"),
        ];
        yield* Effect.all(
            jobs.map((job) => writer.table("accountDeletionJobs").delete(job._id)),
            { concurrency: "unbounded", discard: true }
        );
        return null;
    }, Effect.orDie)
);

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(prepare),
    Layer.provide(submitGoogleLocalReceipt),
    Layer.provide(recordAppleRevocation),
    Layer.provide(recordCredentialOnly),
    Layer.provide(advance),
    Layer.provide(billingTarget),
    Layer.provide(recordBillingErased),
    Layer.provide(eraseBilling),
    Layer.provide(poll),
    Layer.provide(resumeUserId),
    Layer.provide(cleanupExpired),
    GroupImpl.finalize
);
