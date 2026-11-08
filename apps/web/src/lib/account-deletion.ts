import { api } from "@outlayr/backend/convex/_generated/api";
import type { ConvexReactClient } from "convex/react";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

const STORE_KEY = "outlayr-account-deletion";

export type DeletionProvider = "apple" | "google" | "password";

export interface Preparation {
    provider: DeletionProvider;
    receiptChallenge: string;
    resumeSecret: string;
    userId: string;
}

type Phase = "authDeleting" | "billingErased" | "complete" | "prepared" | "providersRevoked" | "purged";

export interface DeletionSteps {
    advance: (resumeSecret: string) => Promise<{ phase: Phase }>;
    eraseBilling: (resumeSecret: string) => Promise<{ phase: Phase }>;
    poll: (resumeSecret: string) => Promise<{ phase: Phase } | null>;
    prepare: () => Promise<Pick<Preparation, "receiptChallenge" | "resumeSecret">>;
    revoke: (preparation: Preparation) => Promise<void>;
}

export function deletionProvider(providerIds: readonly string[]): DeletionProvider {
    if (providerIds.includes("apple")) {
        return "apple";
    }
    return providerIds.includes("google") ? "google" : "password";
}

const decodePreparation = Schema.decodeUnknownOption(
    Schema.fromJsonString(
        Schema.Struct({
            provider: Schema.Literals(["apple", "google", "password"]),
            receiptChallenge: Schema.String,
            resumeSecret: Schema.String,
            userId: Schema.String,
        })
    )
);

function readDeletion() {
    try {
        return Option.getOrNull(decodePreparation(localStorage.getItem(STORE_KEY)));
    } catch {
        return null;
    }
}

export function storedDeletion(userId: string): Preparation | null {
    const stored = readDeletion();
    return stored?.userId === userId ? stored : null;
}

function rememberDeletion(preparation: Preparation | null) {
    try {
        if (preparation === null) {
            localStorage.removeItem(STORE_KEY);
        } else {
            localStorage.setItem(STORE_KEY, JSON.stringify(preparation));
        }
    } catch (error) {
        console.warn("Could not store the deletion job", error);
    }
}

export async function runDeletion(provider: DeletionProvider, userId: string, steps: DeletionSteps) {
    let preparation = storedDeletion(userId);
    let status = preparation === null ? null : await steps.poll(preparation.resumeSecret);
    if (preparation === null || status === null) {
        preparation = { ...(await steps.prepare()), provider, userId };
        rememberDeletion(preparation);
        status = { phase: "prepared" };
    }
    if (status.phase === "prepared") {
        await steps.revoke(preparation);
        status = { phase: "providersRevoked" };
    }
    let { phase } = status;
    while (phase !== "complete") {
        const step: Phase = phase;
        // oxlint-disable-next-line no-await-in-loop -- every phase needs the previous one committed.
        ({ phase } = await (step === "purged"
            ? steps.eraseBilling(preparation.resumeSecret)
            : steps.advance(preparation.resumeSecret)));
    }
    rememberDeletion(null);
}

export async function settleFinishedDeletion(poll: DeletionSteps["poll"], forgetCopy: () => Promise<void>) {
    const stored = readDeletion();
    if (stored === null) {
        return;
    }
    const status = await poll(stored.resumeSecret);
    if (status?.phase === "complete") {
        rememberDeletion(null);
        await forgetCopy();
    }
}

export function convexDeletionSteps(
    convex: ConvexReactClient,
    revokeApple: (resumeSecret: string) => Promise<void>
): DeletionSteps {
    return {
        advance: (resumeSecret) => convex.mutation(api.accountDeletion.advance, { resumeSecret }),
        eraseBilling: (resumeSecret) => convex.action(api.accountDeletion.eraseBilling, { resumeSecret }),
        poll: (resumeSecret) => convex.query(api.accountDeletion.poll, { at: Date.now(), resumeSecret }),
        prepare: () => convex.mutation(api.accountDeletion.prepare, {}),
        revoke: async ({ provider, receiptChallenge, resumeSecret }) => {
            if (provider === "apple") {
                await revokeApple(resumeSecret);
                await convex.mutation(api.accountDeletion.recordAppleRevocation, { resumeSecret });
            } else if (provider === "google") {
                await convex.mutation(api.accountDeletion.submitGoogleLocalReceipt, {
                    receiptChallenge,
                    resumeSecret,
                });
            } else {
                await convex.mutation(api.accountDeletion.recordCredentialOnly, { resumeSecret });
            }
        },
    };
}
