import * as Context from "effect/Context";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import * as Queue from "effect/Queue";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import type * as Scope from "effect/Scope";
import * as Stream from "effect/Stream";
import * as SubscriptionRef from "effect/SubscriptionRef";
import type { PurchasesPackage } from "react-native-purchases";

import { WatchAppState } from "@/lib/app-events";
import { mirrorEntitlement } from "@/lib/entitlement-mirror";
import {
    configureRevenueCat,
    eligibleForTrial,
    getPackages,
    hasProEntitlement,
    identifyUser,
    logOutUser,
    onCustomerInfoUpdated,
    purchaseAndCheckPro,
    purchaseCancelled,
    refreshProEntitlement,
    restoreAndCheckPro,
    setCustomerProfile,
} from "@/lib/revenuecat";
import type { PurchasesError } from "@/lib/revenuecat";

const Operation = Schema.Literals([
    "configure",
    "identity",
    "profile",
    "mirror",
    "refresh",
    "offerings",
    "trial",
    "purchase",
    "restore",
]);

const FAILED = {
    configure: "RevenueCat could not be configured",
    identity: "RevenueCat identity sync failed",
    mirror: "RevenueCat entitlement mirror failed",
    offerings: "RevenueCat offerings read failed",
    profile: "RevenueCat profile sync failed",
    purchase: "RevenueCat purchase failed",
    refresh: "RevenueCat entitlement read failed",
    restore: "RevenueCat restore failed",
    trial: "RevenueCat trial eligibility read failed",
} as const satisfies Record<typeof Operation.Type, string>;

export class RevenueCatError extends Schema.TaggedError<RevenueCatError>()("RevenueCatError", {
    cause: Schema.Defect(),
    message: Schema.String,
    operation: Operation,
}) {}

const SessionStage = Schema.Literals(["queued", "running"]);

const SESSION_CHANGED = {
    queued: "RevenueCat identity does not match the signed-in account",
    running: "RevenueCat identity changed while the call was running",
} as const satisfies Record<typeof SessionStage.Type, string>;

export class RevenueCatSessionChanged extends Schema.TaggedError<RevenueCatSessionChanged>()(
    "RevenueCatSessionChanged",
    { message: Schema.String, stage: SessionStage }
) {}

export const PurchaseOutcome = Schema.Literals(["cancelled", "pro", "unentitled"]);

type Watch<A> = (listener: (value: A) => void) => () => void;

const watchEntitlement: Watch<boolean> = (listener) =>
    onCustomerInfoUpdated((customerInfo) => listener(hasProEntitlement(customerInfo)));

const revenueCatSdk = {
    configureRevenueCat,
    eligibleForTrial,
    getPackages,
    identifyUser,
    logOutUser,
    mirrorEntitlement,
    purchaseAndCheckPro,
    refreshProEntitlement,
    restoreAndCheckPro,
    setCustomerProfile,
    watchEntitlement,
};

export const RevenueCatSdk = Context.Reference<typeof revenueCatSdk>("outlayr/lib/RevenueCat/Sdk", {
    defaultValue: () => revenueCatSdk,
});

export interface Session {
    readonly accountId: string | null;
    readonly email: string | undefined;
    readonly name: string | undefined;
}

export interface Entitlement {
    readonly isConfigured: boolean;
    readonly isMirrored: boolean;
    readonly isPending: boolean;
    readonly isPro: boolean;
    readonly isResolved: boolean;
}

interface MirrorRequest {
    readonly account: string | null;
    readonly answer: Deferred.Deferred<boolean, RevenueCatError>;
    readonly ticket: number;
}

interface State {
    readonly applied: string | null | undefined;
    readonly identityPending: boolean;
    readonly identityTicket: number;
    readonly isConfigured: boolean;
    readonly isMirrored: boolean;
    readonly isPro: boolean;
    readonly isResolved: boolean;
    readonly mirrorAnswered: boolean;
    readonly mirroredFor: string | null;
    readonly mirrorInFlight: MirrorRequest | null;
    readonly mirrorTicket: number;
    readonly pendingRequest: { readonly target: string | null; readonly ticket: number } | null;
    readonly requested: string | null | undefined;
    readonly sessions: readonly { readonly session: Session }[];
}

type SessionError = RevenueCatError | RevenueCatSessionChanged;

export class RevenueCat extends Context.Service<
    RevenueCat,
    {
        readonly eligibleForTrial: (
            account: string | null,
            productIds: readonly string[]
        ) => Effect.Effect<ReadonlySet<string>, SessionError>;
        readonly entitlement: Stream.Stream<Entitlement>;
        readonly follow: (session: Session) => Effect.Effect<void, never, Scope.Scope>;
        readonly getPackages: (account: string | null) => Effect.Effect<PurchasesPackage[], SessionError>;
        readonly mirror: (account: string | null) => Effect.Effect<boolean, RevenueCatError>;
        readonly purchase: (
            account: string | null,
            pack: PurchasesPackage
        ) => Effect.Effect<typeof PurchaseOutcome.Type, SessionError>;
        readonly refresh: (account: string | null) => Effect.Effect<boolean, SessionError>;
        readonly restore: (account: string | null) => Effect.Effect<boolean, SessionError>;
        readonly run: () => Effect.Effect<void>;
    }
>()("outlayr/lib/RevenueCat") {}

const initialState = (isConfigured: boolean): State => ({
    applied: undefined,
    // Starts closed: the identity sync is requested on mount, so a waiter must not see a gap first.
    identityPending: isConfigured,
    identityTicket: 0,
    isConfigured,
    isMirrored: false,
    isPro: false,
    isResolved: false,
    // Answered at all, success or refusal. Apart from `isMirrored` so the gap between the store's yes and the mirror
    // request still counts as pending, while a refusal leaves nothing waiting forever.
    mirrorAnswered: false,
    mirroredFor: null,
    mirrorInFlight: null,
    mirrorTicket: 0,
    pendingRequest: null,
    requested: undefined,
    sessions: [],
});

const entitlementOf = (state: State): Entitlement => ({
    isConfigured: state.isConfigured,
    isMirrored: state.isMirrored,
    // `isPro && !mirrorAnswered` covers the render before the mirror request starts, or a gate reads the gap as
    // "not entitled".
    isPending: state.identityPending || state.mirrorInFlight !== null || (state.isPro && !state.mirrorAnswered),
    isPro: state.isPro,
    isResolved: state.isResolved,
});

// Every entitlement write goes through here: losing Pro invalidates the server mirror, and a mirror still in
// flight must not land its answer afterwards.
const withPro = (state: State, pro: boolean): State => {
    if (pro) {
        return { ...state, isPro: true };
    }
    return {
        ...state,
        isMirrored: false,
        isPro: false,
        // Dropping the in-flight entry orphans its cleanup, so its flags are released here or `isPending`
        // never clears.
        mirrorAnswered: false,
        mirrorInFlight: null,
        mirrorTicket: state.mirrorTicket + 1,
        mirroredFor: null,
    };
};

const currentSession = (state: State): Session | undefined => state.sessions.at(-1)?.session;

const profileTarget = (state: State) => {
    const session = currentSession(state);
    if (
        !state.isResolved ||
        session === undefined ||
        session.accountId !== state.applied ||
        session.email === undefined ||
        session.name === undefined
    ) {
        return null;
    }
    return { accountId: session.accountId, email: session.email, name: session.name };
};

const mirrorTarget = (state: State): string | null => (state.isPro ? (currentSession(state)?.accountId ?? null) : null);

const failedAt = (operation: typeof Operation.Type) => (cause: unknown) =>
    new RevenueCatError({ cause, message: FAILED[operation], operation });

const sessionChanged = (stage: typeof SessionStage.Type) =>
    new RevenueCatSessionChanged({ message: SESSION_CHANGED[stage], stage });

const warn = (error: RevenueCatError) => Effect.logWarning(error.message, error.cause);

const listen = <A>(watch: Watch<A>): Stream.Stream<A> =>
    Stream.callback<A>((queue) =>
        Effect.acquireRelease(
            Effect.sync(() =>
                watch((value) => {
                    Queue.offerUnsafe(queue, value);
                })
            ),
            (unwatch) => Effect.sync(unwatch)
        )
    );

export const make = Effect.gen(function* make() {
    const sdk = yield* RevenueCatSdk;
    const watchAppState = yield* WatchAppState;
    const scope = yield* Effect.scope;
    const configured = yield* Effect.result(Effect.try({ catch: failedAt("configure"), try: sdk.configureRevenueCat }));
    const isConfigured = Result.isSuccess(configured) && configured.success;
    const ref = yield* SubscriptionRef.make(initialState(isConfigured));
    const lane = yield* Queue.unbounded<Effect.Effect<unknown>>();

    const call = <A>(operation: typeof Operation.Type, run: () => Effect.Effect<A, PurchasesError>) =>
        Effect.suspend(run).pipe(Effect.mapError((error) => failedAt(operation)(error.cause)));

    const enqueue = (job: Effect.Effect<unknown>) => Queue.offer(lane, job).pipe(Effect.asVoid);

    const transition = <A>(step: (state: State) => readonly [A, State]): Effect.Effect<A> =>
        SubscriptionRef.modify(ref, (before) => {
            const [result, after] = step(before);
            return [{ after, before, result }, after] as const;
        }).pipe(Effect.flatMap(({ after, before, result }) => react(before, after).pipe(Effect.as(result))));

    const identify = Effect.fn("RevenueCat.identify")(function* identify(target: string | null, ticket: number) {
        const answer = yield* Effect.result(
            call("identity", () => (target === null ? sdk.logOutUser() : sdk.identifyUser(target)))
        );
        yield* transition((state) => {
            let next = state;
            if (Result.isSuccess(answer)) {
                next = { ...next, applied: target };
                if (ticket === state.identityTicket) {
                    next = { ...withPro(next, answer.success), isResolved: true };
                }
            }
            if (state.pendingRequest?.ticket === ticket) {
                next = { ...next, identityPending: false, pendingRequest: null };
            }
            return [undefined, next];
        });
        if (Result.isFailure(answer)) {
            yield* warn(answer.failure);
        }
    }, Effect.uninterruptible);

    const syncIdentity = Effect.fn("RevenueCat.syncIdentity")(function* syncIdentity(target: string | null) {
        const requested = yield* transition((state) => {
            if (state.pendingRequest?.target === target) {
                return [null, state];
            }
            const ticket = state.identityTicket + 1;
            const reset = target === state.applied ? state : { ...withPro(state, false), isResolved: false };
            return [
                ticket,
                {
                    ...reset,
                    identityPending: true,
                    identityTicket: ticket,
                    pendingRequest: { target, ticket },
                    requested: target,
                },
            ];
        });
        if (requested !== null) {
            yield* enqueue(identify(target, requested));
        }
    }, Effect.uninterruptible);

    const forSession = Effect.fn("RevenueCat.forSession")(function* forSession<A>(
        account: string | null,
        operation: Effect.Effect<A, RevenueCatError>,
        apply?: (state: State, result: A) => State
    ) {
        const state = yield* SubscriptionRef.get(ref);
        if (state.applied !== account || state.requested !== account) {
            yield* syncIdentity(account);
        }
        const { identityTicket: ticket } = yield* SubscriptionRef.get(ref);
        const done = yield* Deferred.make<A, SessionError>();
        const job = Effect.gen(function* job() {
            const queued = yield* SubscriptionRef.get(ref);
            if (ticket !== queued.identityTicket || queued.applied !== account) {
                return yield* sessionChanged("queued");
            }
            const result = yield* operation;
            const kept = yield* transition((latest) =>
                ticket === latest.identityTicket
                    ? [true, apply === undefined ? latest : apply(latest, result)]
                    : [false, latest]
            );
            if (!kept) {
                return yield* sessionChanged("running");
            }
            return result;
        });
        yield* enqueue(Deferred.into(job, done));
        return yield* Deferred.await(done);
    });

    const answerMirror = Effect.fn("RevenueCat.answerMirror")(function* answerMirror(request: MirrorRequest) {
        const exit = yield* Effect.exit(sdk.mirrorEntitlement());
        const answer = yield* transition((state): readonly [Exit.Exit<boolean, RevenueCatError>, State] => {
            const released =
                state.mirrorInFlight === request ? { ...state, mirrorAnswered: true, mirrorInFlight: null } : state;
            if (Exit.isFailure(exit)) {
                return [exit, released];
            }
            // The entitlement was lost meanwhile, so this answer describes a customer no longer being gated.
            if (request.ticket !== state.mirrorTicket) {
                return [Exit.succeed(false), released];
            }
            // Recorded only on success, so a refusal (`false`) is retried rather than remembered.
            const mirroredFor = exit.value ? request.account : null;
            return [exit, { ...released, isMirrored: exit.value, mirroredFor }];
        });
        yield* Deferred.done(request.answer, answer);
    });

    // The server reads its own mirror, not the store. The reaction to Pro below covers a customer who owned Pro
    // before the mirror shipped, and any purchase whose webhook was missed.
    const mirror = Effect.fn("RevenueCat.mirror")(function* mirror(account: string | null) {
        const fresh = yield* Deferred.make<boolean, RevenueCatError>();
        const request = yield* transition((state) => {
            // Checkout and the reaction overlap, so one request answers both, or a transient failure on the second
            // would overwrite the first's success. Keyed by account: a previous customer's request answers nothing
            // for this one.
            if (state.mirrorInFlight !== null && state.mirrorInFlight.account === account) {
                return [state.mirrorInFlight, state];
            }
            const started = { account, answer: fresh, ticket: state.mirrorTicket };
            return [started, { ...state, mirrorInFlight: started }];
        }).pipe(
            Effect.tap((started) =>
                started.answer === fresh ? Effect.forkIn(answerMirror(started), scope) : Effect.void
            ),
            Effect.uninterruptible
        );
        return yield* Deferred.await(request.answer);
    });

    const mirrorOnce = Effect.fn("RevenueCat.mirrorOnce")(function* mirrorOnce(account: string | null) {
        const state = yield* SubscriptionRef.get(ref);
        if (!state.isConfigured || !state.isPro || account === null || state.mirroredFor === account) {
            return;
        }
        yield* mirror(account).pipe(Effect.catchTags({ RevenueCatError: warn }));
    });

    const react = Effect.fn("RevenueCat.react")(function* react(before: State, after: State) {
        const session = currentSession(after);
        if (session !== undefined && currentSession(before)?.accountId !== session.accountId) {
            return yield* syncIdentity(session.accountId);
        }
        const profile = profileTarget(after);
        if (profile !== null && !Equal.equals(profileTarget(before), profile)) {
            yield* enqueue(
                call("profile", () => sdk.setCustomerProfile({ email: profile.email, name: profile.name })).pipe(
                    Effect.catchTags({ RevenueCatError: warn })
                )
            );
        }
        const account = mirrorTarget(after);
        if (account !== null && account !== mirrorTarget(before)) {
            yield* Effect.forkIn(mirrorOnce(account), scope);
        }
    });

    const refresh = Effect.fn("RevenueCat.refresh")(function* refresh(account: string | null) {
        if (!isConfigured) {
            return false;
        }
        return yield* forSession(account, call("refresh", sdk.refreshProEntitlement), withPro);
    });

    const purchaseOutcome = (pack: PurchasesPackage) =>
        call("purchase", () => sdk.purchaseAndCheckPro(pack)).pipe(
            Effect.map((pro): typeof PurchaseOutcome.Type => (pro ? "pro" : "unentitled")),
            Effect.catchTags({
                RevenueCatError: (error) =>
                    Schema.is(purchaseCancelled)(error.cause)
                        ? call("refresh", sdk.refreshProEntitlement).pipe(
                              Effect.map((pro): typeof PurchaseOutcome.Type => (pro ? "pro" : "cancelled"))
                          )
                        : Effect.fail(error),
            })
        );

    const run = Effect.fn("RevenueCat.run")(function* run() {
        if (Result.isFailure(configured)) {
            return yield* Effect.die(configured.failure.cause);
        }
        if (!isConfigured) {
            return yield* Effect.never;
        }
        const entitlementUpdates = listen(sdk.watchEntitlement).pipe(
            Stream.runForEach((pro) =>
                transition((state) => [
                    undefined,
                    state.pendingRequest === null && state.applied === state.requested ? withPro(state, pro) : state,
                ])
            )
        );
        const foregrounds = listen(watchAppState).pipe(
            Stream.filter((status) => status === "active"),
            Stream.runForEach(() =>
                Effect.gen(function* onForeground() {
                    const session = currentSession(yield* SubscriptionRef.get(ref));
                    if (session === undefined) {
                        return;
                    }
                    yield* refresh(session.accountId).pipe(
                        // A refused mirror retries here: the entitlement does not change, so nothing else asks again.
                        Effect.andThen(mirrorOnce(session.accountId)),
                        Effect.catchTags({
                            RevenueCatError: warn,
                            RevenueCatSessionChanged: (error) => Effect.logWarning(error.message),
                        }),
                        Effect.forkIn(scope)
                    );
                })
            )
        );
        const jobs = Queue.take(lane).pipe(
            Effect.flatMap((job) =>
                job.pipe(Effect.catchDefect((defect) => Effect.logWarning("RevenueCat job failed", defect)))
            ),
            Effect.forever
        );
        yield* Effect.all([jobs, entitlementUpdates, foregrounds], { concurrency: "unbounded", discard: true });
    });

    const follow = Effect.fn("RevenueCat.follow")(function* follow(session: Session) {
        if (!isConfigured) {
            return;
        }
        const entry = { session };
        yield* Effect.acquireRelease(
            transition((state) => [undefined, { ...state, sessions: [...state.sessions, entry] }]),
            () =>
                transition((state) => [
                    undefined,
                    { ...state, sessions: state.sessions.filter((live) => live !== entry) },
                ])
        );
        yield* Effect.never;
    });

    return RevenueCat.of({
        eligibleForTrial: Effect.fn("RevenueCat.eligibleForTrial")(function* trialEligibility(account, productIds) {
            if (!isConfigured) {
                return new Set<string>();
            }
            return yield* forSession(
                account,
                call("trial", () => sdk.eligibleForTrial(productIds))
            );
        }),
        entitlement: SubscriptionRef.changes(ref).pipe(Stream.map(entitlementOf), Stream.changes),
        follow,
        getPackages: Effect.fn("RevenueCat.getPackages")(function* packages(account) {
            if (!isConfigured) {
                return [];
            }
            return yield* forSession(account, call("offerings", sdk.getPackages));
        }),
        mirror,
        purchase: Effect.fn("RevenueCat.purchase")(function* purchase(account, pack) {
            if (!isConfigured) {
                return "cancelled";
            }
            return yield* forSession(account, purchaseOutcome(pack), (state, outcome) =>
                withPro(state, outcome === "pro")
            );
        }),
        refresh,
        restore: Effect.fn("RevenueCat.restore")(function* restore(account) {
            if (!isConfigured) {
                return false;
            }
            return yield* forSession(account, call("restore", sdk.restoreAndCheckPro), withPro);
        }),
        run,
    });
});

export const layer = Layer.effect(RevenueCat, make);
