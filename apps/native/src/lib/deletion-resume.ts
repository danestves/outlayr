import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { resumeCloudDeletion } from "./account-lifecycle";
import type { DeletionPreparation } from "./account-lifecycle";
import { authClient } from "./auth-client";
import { cloudAction, cloudMutation, cloudQuery, convex } from "./convex";
import { posthog } from "./posthog";
import { revokeGoogleProviderSubject } from "./provider-revocation";
import type { ProviderBinding } from "./provider-revocation";
import { SecureStorage } from "./secure-storage";

export const deletionResumeSecretKey = "outlayr.account-deletion-resume";

type DeletionPhase = "authDeleting" | "billingErased" | "complete" | "prepared" | "providersRevoked" | "purged";

interface DeletionStatus {
    phase: DeletionPhase;
}

export interface StoredDeletionPreparation extends DeletionPreparation {
    provider: ProviderBinding["provider"];
    providerSubject: string;
}

const MESSAGES = {
    apple: "Apple provider revocation failed",
    reauthenticate: "Cloud deletion recovery requires reauthentication",
    unavailable: "Cloud deletion is unavailable",
} as const;

export class DeletionResumeError extends Schema.TaggedError<DeletionResumeError>()("DeletionResumeError", {
    cause: Schema.optional(Schema.Defect()),
    reason: Schema.Literals(["apple", "reauthenticate", "unavailable"]),
}) {
    override get message(): string {
        return MESSAGES[this.reason];
    }
}

/**
 * Loose: `resumeProviderRevocation` writes the record back with a `googleLocalReceipt`, and rejecting that extra
 * field would strand the deletion the record exists to survive.
 */
const StoredPreparation = Schema.StructWithRest(
    Schema.Struct({
        provider: Schema.Literals(["apple", "google", "password"]),
        providerSubject: Schema.String,
        receiptChallenge: Schema.String,
        resumeSecret: Schema.String,
    }),
    [Schema.Record(Schema.String, Schema.Unknown)]
);

const decodeStoredPreparation = Schema.decodeUnknownOption(Schema.fromJsonString(StoredPreparation));

export const resumeProviderRevocation = Effect.fn("DeletionResume.resumeProviderRevocation")(
    function* resumeProviderRevocation(preparation: StoredDeletionPreparation) {
        if (convex === null) {
            return yield* new DeletionResumeError({ reason: "reauthenticate" });
        }
        if (preparation.provider === "password") {
            yield* cloudMutation("accountDeletion:recordCredentialOnly", { resumeSecret: preparation.resumeSecret });
            return;
        }
        if (preparation.provider === "google") {
            const storage = yield* SecureStorage;
            yield* revokeGoogleProviderSubject(preparation.providerSubject);
            yield* storage.set(
                deletionResumeSecretKey,
                JSON.stringify({ ...preparation, googleLocalReceipt: preparation.receiptChallenge })
            );
            yield* cloudMutation("accountDeletion:submitGoogleLocalReceipt", {
                receiptChallenge: preparation.receiptChallenge,
                resumeSecret: preparation.resumeSecret,
            });
            return;
        }
        if (authClient === null) {
            return yield* new DeletionResumeError({ reason: "reauthenticate" });
        }
        const client = authClient;
        const response = yield* Effect.tryPromise({
            catch: (cause) => new DeletionResumeError({ cause, reason: "apple" }),
            try: () =>
                client.$fetch("/apple/revoke", {
                    body: { resumeSecret: preparation.resumeSecret },
                    method: "POST",
                }),
        });
        if (response.error) {
            return yield* new DeletionResumeError({ reason: "apple" });
        }
        yield* cloudMutation("accountDeletion:recordAppleRevocation", { resumeSecret: preparation.resumeSecret });
    }
);

export const resumePersistedCloudDeletion = Effect.fn("DeletionResume.resumePersisted")(
    function* resumePersistedCloudDeletion({
        clearOnComplete = true,
        required = false,
    }: {
        clearOnComplete?: boolean;
        required?: boolean;
    } = {}) {
        if (convex === null) {
            if (required) {
                return yield* new DeletionResumeError({ reason: "reauthenticate" });
            }
            return false;
        }
        const storage = yield* SecureStorage;
        const raw = yield* storage.get(deletionResumeSecretKey);
        const preparation = raw === null ? null : Option.getOrNull(decodeStoredPreparation(raw));
        if (preparation === null) {
            if (required) {
                return yield* new DeletionResumeError({ reason: "reauthenticate" });
            }
            return false;
        }
        posthog?.reset();
        const poll = Effect.fn("DeletionResume.poll")(function* poll() {
            const at = yield* Clock.currentTimeMillis;
            return yield* cloudQuery<{ at: number; resumeSecret: string }, DeletionStatus | null>(
                "accountDeletion:poll",
                { at, resumeSecret: preparation.resumeSecret }
            );
        });
        const status = yield* poll();
        if (status === null) {
            return yield* new DeletionResumeError({ reason: "reauthenticate" });
        }
        if (status.phase !== "complete") {
            yield* resumeCloudDeletion(status.phase, preparation, {
                advanceDeletion: (resumeSecret) =>
                    cloudMutation<{ resumeSecret: string }, DeletionStatus>("accountDeletion:advance", {
                        resumeSecret,
                    }),
                eraseBilling: (resumeSecret) =>
                    cloudAction<{ resumeSecret: string }, DeletionStatus>("accountDeletion:eraseBilling", {
                        resumeSecret,
                    }),
                revokeProvider: () => resumeProviderRevocation(preparation),
            });
            const completed = yield* poll();
            if (completed?.phase !== "complete") {
                return yield* new DeletionResumeError({ reason: "reauthenticate" });
            }
        }
        if (clearOnComplete) {
            yield* storage.remove(deletionResumeSecretKey);
        }
        return true;
    }
);
