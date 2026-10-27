import { RateLimiter } from "@convex-dev/rate-limiter";
import * as Schema from "effect/Schema";

import { components } from "../convex/_generated/api";
import type accountDeletionJobs from "./_generated/tables/accountDeletionJobs";
import { sha256Hex } from "./lib/sha256Hex";

export const DELETE_JOB_TTL_MS = 24 * 60 * 60 * 1000;
export const UPSTREAM_ERASE_SECRETS = [
    "REVENUECAT_SECRET_KEY",
    "POSTHOG_PERSONAL_API_KEY",
    "POSTHOG_PROJECT_ID",
] as const;
export const AUTH_DELETE_PAGE = 100;

export const usage = new RateLimiter(components.rateLimiter);

export const USAGE_BY_TOKEN = [
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

export type DeletionJob = typeof accountDeletionJobs.Fields.Type;

const DeletionRefusal = Schema.Literals([
    "notFound",
    "expired",
    "cannotRevokeProviders",
    "missingUserLinkage",
    "revocationRequired",
    "billingErasureRequired",
    "purgeRequired",
    "cannotRevokeApple",
    "tooManyOpen",
    "providerLinked",
]);

const REFUSAL_MESSAGES = {
    billingErasureRequired: "Billing erasure is required before auth deletion",
    cannotRevokeApple: "Deletion job cannot revoke Apple credentials now",
    cannotRevokeProviders: "Deletion job cannot revoke providers now",
    expired: "Deletion job expired; reauthentication is required",
    missingUserLinkage: "Deletion job is missing its private user linkage",
    notFound: "Deletion job not found",
    providerLinked: "This account is linked to a provider that has to be revoked first",
    purgeRequired: "Purge is required before billing erasure",
    revocationRequired: "Provider revocation is required before purge",
    tooManyOpen: "This account already has too many open deletion requests",
} satisfies Record<typeof DeletionRefusal.Type, string>;

export class DeletionRefused extends Schema.TaggedError<DeletionRefused>()("DeletionRefused", {
    reason: DeletionRefusal,
}) {
    override get message(): string {
        return REFUSAL_MESSAGES[this.reason];
    }
}

export class DeletionUnconfigured extends Schema.TaggedError<DeletionUnconfigured>()("DeletionUnconfigured", {
    missing: Schema.Array(Schema.String),
}) {
    override get message(): string {
        return `Account deletion needs ${this.missing.join(", ")} before it can erase upstream copies`;
    }
}

export function randomSecret(): string {
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

export function publicStatus(job: Pick<DeletionJob, "errorCode" | "phase">) {
    return { errorCode: job.errorCode, phase: job.phase };
}

/** Capped so `sync.refuseWhileDeleting` reads jobs cheaply and no client can bury the job that refuses a push. */
export const DELETION_JOBS_PER_USER = 20;

export const CLEANUP_BATCH = 200;
