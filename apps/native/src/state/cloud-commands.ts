import * as Effect from "effect/Effect";

import { setSyncEnabled } from "@/data/sync-outbox-core";
import type { Database } from "@/db/client";
import { closeDatabase } from "@/db/client";
import { runAccountLifecycle } from "@/lib/account-lifecycle";
import type { AccountLifecycleAction } from "@/lib/account-lifecycle";
import { requestUnlock } from "@/lib/app-lock";
import type { authClient } from "@/lib/auth-client";
import { cloudAction, cloudMutation, convex } from "@/lib/convex";
import {
    DeletionResumeError,
    deletionResumeSecretKey,
    resumePersistedCloudDeletion,
    resumeProviderRevocation,
} from "@/lib/deletion-resume";
import type { StoredDeletionPreparation } from "@/lib/deletion-resume";
import { createDeviceResetGate, writeDeviceResetMarker } from "@/lib/device-data-reset";
import { providerBindingFor } from "@/lib/provider-revocation";
import { signInWithProvider } from "@/lib/provider-sign-in";
import { appRuntime } from "@/lib/runtime";
import { SecureStorage } from "@/lib/secure-storage";

import { createCommand, createRuntimeCommand } from "./atom-command";

type AuthClient = NonNullable<typeof authClient>;

interface DeletionStatus {
    phase: "authDeleting" | "billingErased" | "complete" | "prepared" | "providersRevoked" | "purged";
}

export const requestUnlockCommand = createCommand({ execute: requestUnlock, label: "app-lock:request-unlock" });

export const providerSignInCommand = createRuntimeCommand(appRuntime, {
    execute: signInWithProvider,
    label: "cloud:provider-sign-in",
});

const cloudConfigured = Effect.suspend(() =>
    convex === null ? Effect.fail(new DeletionResumeError({ reason: "unavailable" })) : Effect.void
);

const quiesce = (db: Database) => () => setSyncEnabled(db, false).pipe(Effect.mapError((error) => error.cause));

export const signOutCommand = createRuntimeCommand(appRuntime, {
    execute: (input: { allowLocal: () => void; client: AuthClient; db: Database; navigateToLedger: () => void }) =>
        runAccountLifecycle("signOut", {
            allowLocal: input.allowLocal,
            navigateToLedger: input.navigateToLedger,
            quiesce: quiesce(input.db),
            signOut: () => Effect.tryPromise(() => input.client.signOut()).pipe(Effect.asVoid),
        }),
    label: "cloud:sign-out",
});

export const deleteAccountCommand = createRuntimeCommand(appRuntime, {
    execute: Effect.fn("Cloud.deleteAccount")(function* deleteAccount(input: {
        action: Exclude<AccountLifecycleAction, "signOut">;
        allowLocal: () => void;
        db: Database;
        navigateToLedger: () => void;
        navigateToOnboarding: () => void;
        userId: string;
    }) {
        const { db, userId } = input;
        const storage = yield* SecureStorage;
        const deleteAll = input.action === "deleteAll";
        const resetGate = deleteAll
            ? createDeviceResetGate({
                  closeDatabase: closeDatabase(db),
                  completeCloudDeletion: resumePersistedCloudDeletion({ clearOnComplete: false, required: true }).pipe(
                      Effect.asVoid
                  ),
              })
            : null;
        yield* runAccountLifecycle<unknown, SecureStorage>(input.action, {
            advanceDeletion: (resumeSecret) =>
                cloudConfigured.pipe(
                    Effect.andThen(
                        cloudMutation<{ resumeSecret: string }, DeletionStatus>("accountDeletion:advance", {
                            resumeSecret,
                        })
                    )
                ),
            allowLocal: input.allowLocal,
            beginDeviceReset: deleteAll ? () => writeDeviceResetMarker({ phase: "cloud", v: 1 }) : undefined,
            clearDeletionSecret: () => storage.remove(deletionResumeSecretKey),
            eraseBilling: (resumeSecret) =>
                cloudConfigured.pipe(
                    Effect.andThen(
                        cloudAction<{ resumeSecret: string }, DeletionStatus>("accountDeletion:eraseBilling", {
                            resumeSecret,
                        })
                    )
                ),
            markDeviceCleanupReady: deleteAll ? () => writeDeviceResetMarker({ phase: "device", v: 1 }) : undefined,
            navigateToLedger: input.navigateToLedger,
            navigateToOnboarding: input.navigateToOnboarding,
            persistDeletionSecret: (preparation) => storage.set(deletionResumeSecretKey, JSON.stringify(preparation)),
            prepareDeletion: Effect.fn("Cloud.prepareDeletion")(function* prepareDeletion() {
                yield* cloudConfigured;
                const binding = yield* providerBindingFor(userId);
                const preparation = yield* cloudMutation<
                    Record<string, never>,
                    { receiptChallenge: string; resumeSecret: string }
                >("accountDeletion:prepare", {});
                return { ...preparation, provider: binding.provider, providerSubject: binding.providerSubject };
            }),
            quiesce: quiesce(db),
            resetDevice: resetGate ? () => resetGate.recover() : undefined,
            revokeProvider: (preparation) =>
                // SAFETY: `prepareDeletion` is the only producer and adds the pair `StoredDeletionPreparation` needs.
                resumeProviderRevocation(preparation as StoredDeletionPreparation),
        });
    }),
    label: "cloud:delete-account",
});

export interface FeatureRequest {
    appVersion: string;
    linkAccount: boolean;
    locale: string;
    notify: boolean;
    osName: string;
    osVersion: string;
    reason: string;
    submissionId: string;
    wish: string;
}

export type FeatureRequestStatus = "ok" | "invalid" | "rateLimited" | "notConfigured" | "providerError";

const FEATURE_REQUEST_TIMEOUT_MS = 15_000;

export const submitFeatureRequestCommand = createCommand({
    execute: (request: FeatureRequest) =>
        cloudAction<FeatureRequest, FeatureRequestStatus>("featureRequests:submit", request).pipe(
            Effect.timeout(FEATURE_REQUEST_TIMEOUT_MS)
        ),
    label: "cloud:feature-request",
});
