import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { ProviderBinding } from "./provider-revocation";

export type AccountLifecycleAction = "deleteAll" | "deleteCloud" | "signOut";

type DeletionPhase = "authDeleting" | "billingErased" | "complete" | "prepared" | "providersRevoked" | "purged";

export interface DeletionPreparation {
    provider?: ProviderBinding["provider"];
    providerSubject?: string;
    receiptChallenge: string;
    resumeSecret: string;
}

export interface AccountLifecycleDependencies<E = never, R = never> {
    advanceDeletion?: (resumeSecret: string) => Effect.Effect<{ phase: DeletionPhase }, E, R>;
    allowLocal: () => void;
    beginDeviceReset?: () => Effect.Effect<void, E, R>;
    clearDeletionSecret?: () => Effect.Effect<void, E, R>;
    eraseBilling?: (resumeSecret: string) => Effect.Effect<{ phase: DeletionPhase }, E, R>;
    markDeviceCleanupReady?: () => Effect.Effect<void, E, R>;
    navigateToLedger: () => void;
    navigateToOnboarding?: () => void;
    persistDeletionSecret?: (preparation: DeletionPreparation) => Effect.Effect<void, E, R>;
    prepareDeletion?: () => Effect.Effect<DeletionPreparation, E, R>;
    quiesce: () => Effect.Effect<void, E, R>;
    resetDevice?: () => Effect.Effect<{ failures: readonly string[] }, E, R>;
    revokeProvider?: (preparation: DeletionPreparation) => Effect.Effect<void, E, R>;
    signOut?: () => Effect.Effect<void, E, R>;
}

export class AccountLifecycleError extends Schema.TaggedError<AccountLifecycleError>()("AccountLifecycleError", {
    cause: Schema.Defect(),
    stage: Schema.Literals(["deleteAccount", "resetDevice", "revokeProvider", "signOut"]),
}) {
    override get message(): string {
        return `Account lifecycle failed during ${this.stage}`;
    }
}

const NOT_CONFIGURED = "Resumable account deletion is not configured";

export const resumeCloudDeletion = Effect.fn("AccountLifecycle.resumeCloudDeletion")(function* resumeCloudDeletion<
    E,
    R,
>(
    phase: DeletionPhase,
    preparation: DeletionPreparation,
    deps: Required<Pick<AccountLifecycleDependencies<E, R>, "advanceDeletion" | "eraseBilling" | "revokeProvider">>
) {
    const { advanceDeletion, eraseBilling, revokeProvider } = deps;
    if (phase === "prepared") {
        yield* revokeProvider(preparation);
    }
    let current: DeletionPhase = phase === "prepared" ? "providersRevoked" : phase;
    while (current !== "complete" && current !== "prepared") {
        const next: { phase: DeletionPhase } =
            current === "purged"
                ? yield* eraseBilling(preparation.resumeSecret)
                : yield* advanceDeletion(preparation.resumeSecret);
        current = next.phase;
    }
});

const completeCloudDeletion = Effect.fn("AccountLifecycle.completeCloudDeletion")(function* completeCloudDeletion<E, R>(
    deps: AccountLifecycleDependencies<E, R>,
    clearSecret: boolean
) {
    if (
        !(
            deps.prepareDeletion &&
            deps.persistDeletionSecret &&
            deps.revokeProvider &&
            deps.advanceDeletion &&
            deps.eraseBilling &&
            deps.clearDeletionSecret
        )
    ) {
        return yield* Effect.fail(new Error(NOT_CONFIGURED));
    }
    const {
        advanceDeletion,
        clearDeletionSecret,
        eraseBilling,
        persistDeletionSecret,
        prepareDeletion,
        revokeProvider,
    } = deps;
    const preparation = yield* prepareDeletion();
    yield* persistDeletionSecret(preparation);
    yield* resumeCloudDeletion("prepared", preparation, { advanceDeletion, eraseBilling, revokeProvider });
    if (clearSecret) {
        yield* clearDeletionSecret();
    }
});

const inStage = (stage: typeof AccountLifecycleError.Type.stage) =>
    Effect.mapError((cause: unknown) => new AccountLifecycleError({ cause, stage }));

export const runAccountLifecycle = Effect.fn("AccountLifecycle.run")(function* runAccountLifecycle<E, R>(
    action: AccountLifecycleAction,
    deps: AccountLifecycleDependencies<E, R>
) {
    deps.allowLocal();
    yield* deps.quiesce();

    if (action === "signOut") {
        if (deps.signOut) {
            yield* deps.signOut().pipe(inStage("signOut"));
        }
        deps.navigateToLedger();
        return;
    }

    if (action === "deleteAll" && deps.beginDeviceReset) {
        yield* deps.beginDeviceReset().pipe(inStage("resetDevice"));
    }

    yield* completeCloudDeletion(deps, action !== "deleteAll").pipe(inStage("revokeProvider"));
    if (action === "deleteAll") {
        yield* Effect.gen(function* resetDevice() {
            if (deps.markDeviceCleanupReady) {
                yield* deps.markDeviceCleanupReady();
            }
            if (deps.clearDeletionSecret) {
                yield* deps.clearDeletionSecret();
            }
            const result = deps.resetDevice ? yield* deps.resetDevice() : undefined;
            if (result && result.failures.length > 0) {
                return yield* Effect.fail(new Error(`Device cleanup incomplete: ${result.failures.join(", ")}`));
            }
        }).pipe(inStage("resetDevice"));
        (deps.navigateToOnboarding ?? deps.navigateToLedger)();
        return;
    }
    deps.navigateToLedger();
});
