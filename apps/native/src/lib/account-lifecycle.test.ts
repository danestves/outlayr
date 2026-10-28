import * as Effect from "effect/Effect";
import { describe, expect, it, test } from "vite-plus/test";

import { resumeCloudDeletion, runAccountLifecycle } from "./account-lifecycle";

const record = (calls: string[], name: string) => () => Effect.sync(() => calls.push(name));

describe("runAccountLifecycle", () => {
    it("keeps deletion incomplete and retryable when revocation fails", async () => {
        const calls: string[] = [];
        const failure = await Effect.runPromise(
            runAccountLifecycle("deleteCloud", {
                advanceDeletion: () => Effect.succeed({ phase: "complete" as const }),
                allowLocal: () => calls.push("allowLocal"),
                clearDeletionSecret: () => Effect.void,
                eraseBilling: () => Effect.succeed({ phase: "billingErased" as const }),
                navigateToLedger: () => calls.push("navigate"),
                persistDeletionSecret: () => Effect.void,
                prepareDeletion: () =>
                    Effect.succeed({ receiptChallenge: "receipt-challenge", resumeSecret: "resume-secret" }),
                quiesce: record(calls, "quiesce"),
                revokeProvider: () =>
                    Effect.sync(() => calls.push("revokeProvider")).pipe(
                        Effect.andThen(Effect.fail(new Error("revocation unavailable")))
                    ),
            }).pipe(Effect.flip)
        );

        expect(failure).toMatchObject({ _tag: "AccountLifecycleError", stage: "revokeProvider" });
        expect(calls).toStrictEqual(["allowLocal", "quiesce", "revokeProvider"]);
    });

    it("signs out without revoking provider authorization", async () => {
        const calls: string[] = [];
        await Effect.runPromise(
            runAccountLifecycle("signOut", {
                allowLocal: () => calls.push("allowLocal"),
                navigateToLedger: () => calls.push("navigate"),
                quiesce: record(calls, "quiesce"),
                revokeProvider: record(calls, "revokeProvider"),
                signOut: record(calls, "signOut"),
            })
        );

        expect(calls).toStrictEqual(["allowLocal", "quiesce", "signOut", "navigate"]);
    });
});

test("persists the resume secret before revocation and advances idempotently", async () => {
    const calls: string[] = [];
    await Effect.runPromise(
        runAccountLifecycle("deleteCloud", {
            advanceDeletion: () => Effect.succeed({ phase: "complete" as const }),
            allowLocal: () => calls.push("allowLocal"),
            clearDeletionSecret: record(calls, "clear"),
            eraseBilling: () => Effect.succeed({ phase: "billingErased" as const }),
            navigateToLedger: () => calls.push("navigate"),
            persistDeletionSecret: record(calls, "persist"),
            prepareDeletion: () =>
                Effect.succeed({ receiptChallenge: "receipt-challenge", resumeSecret: "resume-secret" }),
            quiesce: record(calls, "quiesce"),
            revokeProvider: record(calls, "revoke"),
        })
    );

    expect(calls).toStrictEqual(["allowLocal", "quiesce", "persist", "revoke", "clear", "navigate"]);
});

test("erases billing when the purge lands, and resumes from purged the same way", async () => {
    const calls: string[] = [];
    const phases = ["purged", "authDeleting", "complete"] as const;
    let advances = 0;
    const deps = {
        advanceDeletion: () =>
            Effect.sync(() => {
                calls.push("advance");
                advances += 1;
                return { phase: phases[advances - 1] ?? ("complete" as const) };
            }),
        eraseBilling: () =>
            Effect.sync(() => {
                calls.push("erase");
                return { phase: "billingErased" as const };
            }),
        revokeProvider: record(calls, "revoke"),
    };

    await Effect.runPromise(resumeCloudDeletion("prepared", { receiptChallenge: "c", resumeSecret: "s" }, deps));
    expect(calls).toStrictEqual(["revoke", "advance", "erase", "advance", "advance"]);

    calls.length = 0;
    await Effect.runPromise(resumeCloudDeletion("purged", { receiptChallenge: "c", resumeSecret: "s" }, deps));
    expect(calls[0]).toBe("erase");
});

test("does not clean the device before cloud deletion completes", async () => {
    const calls: string[] = [];
    await Effect.runPromise(
        runAccountLifecycle("deleteAll", {
            advanceDeletion: () =>
                Effect.sync(() => {
                    calls.push("advance");
                    return { phase: "complete" as const };
                }),
            allowLocal: () => calls.push("allowLocal"),
            beginDeviceReset: record(calls, "marker-cloud"),
            clearDeletionSecret: record(calls, "clear-secret"),
            eraseBilling: () => Effect.succeed({ phase: "billingErased" as const }),
            markDeviceCleanupReady: record(calls, "marker-device"),
            navigateToLedger: () => calls.push("ledger"),
            navigateToOnboarding: () => calls.push("onboarding"),
            persistDeletionSecret: record(calls, "persist-secret"),
            prepareDeletion: () =>
                Effect.succeed({ receiptChallenge: "receipt-challenge", resumeSecret: "resume-secret" }),
            quiesce: record(calls, "quiesce"),
            resetDevice: () =>
                Effect.sync(() => {
                    calls.push("reset-device");
                    return { failures: [] };
                }),
            revokeProvider: record(calls, "revoke"),
        })
    );

    expect(calls).toStrictEqual([
        "allowLocal",
        "quiesce",
        "marker-cloud",
        "persist-secret",
        "revoke",
        "advance",
        "marker-device",
        "clear-secret",
        "reset-device",
        "onboarding",
    ]);
});

test("stops a device erase at the step that failed, before any store is cleared or the app navigates", async () => {
    const calls: string[] = [];
    const failure = await Effect.runPromise(
        runAccountLifecycle("deleteAll", {
            advanceDeletion: () => Effect.succeed({ phase: "complete" as const }),
            allowLocal: () => calls.push("allowLocal"),
            beginDeviceReset: record(calls, "marker-cloud"),
            clearDeletionSecret: () => Effect.fail(new Error("keychain locked")),
            eraseBilling: () => Effect.succeed({ phase: "billingErased" as const }),
            markDeviceCleanupReady: record(calls, "marker-device"),
            navigateToLedger: () => calls.push("ledger"),
            navigateToOnboarding: () => calls.push("onboarding"),
            persistDeletionSecret: record(calls, "persist-secret"),
            prepareDeletion: () =>
                Effect.succeed({ receiptChallenge: "receipt-challenge", resumeSecret: "resume-secret" }),
            quiesce: record(calls, "quiesce"),
            resetDevice: () =>
                Effect.sync(() => {
                    calls.push("reset-device");
                    return { failures: [] };
                }),
            revokeProvider: record(calls, "revoke"),
        }).pipe(Effect.flip)
    );

    expect(failure).toMatchObject({ _tag: "AccountLifecycleError", stage: "resetDevice" });
    expect(calls).toStrictEqual(["allowLocal", "quiesce", "marker-cloud", "persist-secret", "revoke", "marker-device"]);
});
