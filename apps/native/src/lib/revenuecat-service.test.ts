import * as Cause from "effect/Cause";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Logger from "effect/Logger";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import type { AppStateStatus } from "react-native";
import type { PurchasesPackage } from "react-native-purchases";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { entitlementAtom, revenueCatAtom, revenueCatSessionAtom } from "@/contexts/revenuecat-context";
import { WatchAppState } from "@/lib/app-events";
import { appRuntime } from "@/lib/runtime";

import { PurchasesError } from "./revenuecat";
import * as RevenueCat from "./revenuecat-service";

function watchable<A>() {
    const listeners = new Set<(value: A) => void>();
    return {
        emit: (value: A) => {
            for (const listener of listeners) {
                listener(value);
            }
        },
        listeners,
        watch: (listener: (value: A) => void) => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
    };
}

const customerInfo = watchable<boolean>();
const appState = watchable<AppStateStatus>();
const cloudAuth = watchable<boolean>();

let disk: { destination: string | null } | null = null;

const sdk = {
    cloudAuthenticated: vi.fn<() => boolean>(),
    configureRevenueCat: () => true,
    eligibleForTrial: vi.fn<(productIds: readonly string[]) => Effect.Effect<Set<string>, PurchasesError>>(),
    getPackages: vi.fn<() => Effect.Effect<PurchasesPackage[], PurchasesError>>(),
    identifyUser: vi.fn<(accountId: string) => Effect.Effect<boolean, PurchasesError>>(),
    logOutUser: vi.fn<() => Effect.Effect<boolean, PurchasesError>>(),
    mirrorEntitlement: vi.fn<() => Effect.Effect<boolean>>(),
    purchaseAndCheckPro: vi.fn<(pack: PurchasesPackage) => Effect.Effect<boolean, PurchasesError>>(),
    readGuestClaim: () => Effect.sync(() => disk),
    refreshProEntitlement: vi.fn<() => Effect.Effect<boolean, PurchasesError>>(),
    restoreAndCheckPro: vi.fn<() => Effect.Effect<boolean, PurchasesError>>(),
    setCustomerProfile: vi.fn<(profile: { email: string; name: string }) => Effect.Effect<void, PurchasesError>>(),
    syncAndCheckPro: vi.fn<() => Effect.Effect<boolean, PurchasesError>>(),
    watchCloudAuthenticated: cloudAuth.watch,
    watchEntitlement: customerInfo.watch,
    writeGuestClaim: (claim: { destination: string | null } | null) =>
        Effect.sync(() => {
            disk = claim;
        }),
};

// SAFETY: the service hands the package straight to the fake SDK; nothing on it is read.
const PACK = { identifier: "$rc_annual" } as unknown as PurchasesPackage;

const scheduleTask = (task: () => void) => {
    const timer = setTimeout(task, 0);
    return () => {
        clearTimeout(timer);
    };
};

const flush = () => vi.advanceTimersByTimeAsync(50);

function held<A>() {
    const { promise, reject, resolve } = Promise.withResolvers<A>();
    return { promise, reject, resolve };
}

describe("revenueCat", () => {
    let registry: AtomRegistry.AtomRegistry;
    let leaveSession: (() => void) | undefined;

    const signIn = (accountId: string | null, guest = false) => {
        leaveSession?.();
        const named = accountId !== null && !guest;
        leaveSession = registry.mount(
            revenueCatSessionAtom({
                accountId,
                email: named ? `${accountId}@example.com` : undefined,
                guest,
                name: named ? "Ana" : undefined,
            })
        );
    };

    const start = (accountId: string | null, client = sdk, rest: Layer.Layer<never> = Layer.empty) => {
        const layer = Layer.mergeAll(
            RevenueCat.layer.pipe(
                Layer.provide(
                    Layer.mergeAll(
                        Layer.succeed(RevenueCat.RevenueCatSdk, client),
                        Layer.succeed(WatchAppState, appState.watch)
                    )
                )
            ),
            Logger.layer([]),
            rest
        );
        registry = AtomRegistry.make({ initialValues: [[appRuntime.layer, layer]], scheduleTask });
        registry.mount(entitlementAtom);
        registry.mount(revenueCatAtom);
        signIn(accountId);
        return flush();
    };

    const entitlement = () => registry.get(entitlementAtom);

    const call = <A, E>(operation: (revenueCat: RevenueCat.RevenueCat["Service"]) => Effect.Effect<A, E>) => {
        const services = Effect.runSync(AtomRegistry.getResult(registry, appRuntime));
        const promise = Effect.runPromise(operation(Context.get(services, RevenueCat.RevenueCat)));
        promise.catch(() => undefined);
        return promise;
    };

    beforeEach(() => {
        vi.useFakeTimers();
        vi.resetAllMocks();
        customerInfo.listeners.clear();
        appState.listeners.clear();
        cloudAuth.listeners.clear();
        sdk.cloudAuthenticated.mockReturnValue(true);
        leaveSession = undefined;
        disk = null;
        sdk.eligibleForTrial.mockReturnValue(Effect.succeed(new Set()));
        sdk.getPackages.mockReturnValue(Effect.succeed([]));
        sdk.identifyUser.mockReturnValue(Effect.succeed(false));
        sdk.logOutUser.mockReturnValue(Effect.succeed(false));
        sdk.mirrorEntitlement.mockReturnValue(Effect.succeed(true));
        sdk.purchaseAndCheckPro.mockReturnValue(Effect.succeed(false));
        sdk.refreshProEntitlement.mockReturnValue(Effect.succeed(false));
        sdk.restoreAndCheckPro.mockReturnValue(Effect.succeed(false));
        sdk.setCustomerProfile.mockReturnValue(Effect.succeed(undefined));
        sdk.syncAndCheckPro.mockReturnValue(Effect.succeed(false));
    });

    afterEach(() => {
        registry.dispose();
        vi.useRealTimers();
    });

    it("follows customer info updates once the account's sign-in has landed", async () => {
        await start("user-1");
        expect(entitlement()).toStrictEqual({ kind: "free", pending: false });

        customerInfo.emit(true);
        await flush();
        expect(entitlement()).toMatchObject({ kind: "pro" });

        customerInfo.emit(false);
        await flush();
        expect(entitlement()).toStrictEqual({ kind: "free", pending: false });
    });

    it("holds gates while the rest of the runtime is still building, then reads the store's answer", async () => {
        const opening = held<undefined>();
        await start("user-16", sdk, Layer.effectDiscard(Effect.promise(() => opening.promise)));
        expect(entitlement()).toStrictEqual({ kind: "unresolved", pending: true });

        opening.resolve(undefined);
        await flush();
        expect(entitlement()).toStrictEqual({ kind: "free", pending: false });
    });

    it("releases the hold when the runtime fails to build, so a gate never waits forever", async () => {
        const opening = held<undefined>();
        await start("user-17", sdk, Layer.effectDiscard(Effect.promise(() => opening.promise)));

        opening.reject(new Error("database failed to open"));
        await flush();
        expect(entitlement()).toStrictEqual({ kind: "unresolved", pending: false });
    });

    it("fails the run with the SDK's error when configuring throws, so the error boundary sees it", async () => {
        const thrown = new Error("missing API key");
        sdk.mirrorEntitlement.mockReturnValue(Effect.succeed(false));
        await start("user-1", {
            ...sdk,
            configureRevenueCat: () => {
                throw thrown;
            },
        });

        const run = registry.get(revenueCatAtom);
        if (!AsyncResult.isFailure(run)) {
            throw new Error("the run did not fail");
        }
        expect(Cause.squash(run.cause)).toBe(thrown);
        expect(entitlement()).toStrictEqual({ kind: "unconfigured" });
    });

    it("without RevenueCat, takes Pro from the server for whichever account is signed in", async () => {
        const local = { ...sdk, configureRevenueCat: () => false };
        await start("user-30", local);
        expect(entitlement()).toStrictEqual({ kind: "pro", mirrored: true, pending: false });

        const lookup = held<boolean>();
        sdk.mirrorEntitlement.mockReturnValueOnce(Effect.promise(() => lookup.promise));
        signIn("user-31");
        await flush();
        expect(entitlement()).toStrictEqual({ kind: "unconfigured" });
        signIn(null);
        await flush();
        lookup.resolve(true);
        await flush();
        expect(entitlement()).toStrictEqual({ kind: "unconfigured" });
    });

    it("without RevenueCat, waits for Convex to authenticate before asking the server", async () => {
        sdk.cloudAuthenticated.mockReturnValue(false);
        await start("user-32", { ...sdk, configureRevenueCat: () => false });
        expect(sdk.mirrorEntitlement).not.toHaveBeenCalled();
        expect(entitlement()).toStrictEqual({ kind: "unconfigured" });

        sdk.cloudAuthenticated.mockReturnValue(true);
        cloudAuth.emit(true);
        await flush();
        expect(entitlement()).toStrictEqual({ kind: "pro", mirrored: true, pending: false });

        const lookup = held<boolean>();
        sdk.mirrorEntitlement.mockReturnValueOnce(Effect.promise(() => lookup.promise));
        cloudAuth.emit(true);
        await flush();
        expect(sdk.mirrorEntitlement).toHaveBeenCalledTimes(2);
        sdk.cloudAuthenticated.mockReturnValue(false);
        cloudAuth.emit(false);
        await flush();
        lookup.resolve(true);
        await flush();
        expect(entitlement()).toStrictEqual({ kind: "unconfigured" });
    });

    it("ignores customer info while the sign-in has failed, and retries the sign-in on foreground", async () => {
        sdk.identifyUser
            .mockReturnValueOnce(Effect.fail(new PurchasesError({ cause: new Error("network") })))
            .mockReturnValueOnce(Effect.succeed(true));
        sdk.refreshProEntitlement.mockReturnValueOnce(Effect.succeed(true));
        await start("user-2");

        customerInfo.emit(true);
        await flush();
        expect(entitlement()).toStrictEqual({ kind: "unresolved", pending: false });

        appState.emit("active");
        await flush();

        expect(sdk.identifyUser).toHaveBeenCalledTimes(2);
        expect(sdk.identifyUser).toHaveBeenLastCalledWith("user-2");
        expect(entitlement()).toMatchObject({ kind: "pro" });
    });

    it.each([
        ["a foreground refresh", () => appState.emit("active")],
        ["a customer info update", () => customerInfo.emit(false)],
    ])("resolves on %s an account whose sign-out and sign-in both failed", async (_, answer) => {
        await start("user-18");
        sdk.logOutUser.mockReturnValueOnce(Effect.fail(new PurchasesError({ cause: new Error("network") })));
        sdk.identifyUser.mockReturnValueOnce(Effect.fail(new PurchasesError({ cause: new Error("network") })));

        signIn(null);
        signIn("user-18");
        await flush();
        expect(entitlement()).toStrictEqual({ kind: "unresolved", pending: false });

        answer();
        await flush();
        expect(entitlement()).toStrictEqual({ kind: "free", pending: false });
    });

    it("hands a guest's purchase to the account it signs in to, even across the sign-in's signed-out gap", async () => {
        await start(null);
        sdk.identifyUser.mockReturnValueOnce(Effect.succeed(true));
        signIn("guest-1", true);
        await flush();
        expect(sdk.syncAndCheckPro).not.toHaveBeenCalled();

        signIn(null);
        await flush();
        sdk.syncAndCheckPro.mockReturnValueOnce(Effect.succeed(true));
        signIn("user-20");
        await flush();
        expect(sdk.identifyUser).toHaveBeenLastCalledWith("user-20");
        expect(sdk.syncAndCheckPro).toHaveBeenCalledOnce();
        expect(entitlement()).toMatchObject({ kind: "pro" });

        signIn("user-21");
        await flush();
        expect(sdk.syncAndCheckPro).toHaveBeenCalledOnce();
    });

    it("leaves the store alone when the guest never held Pro", async () => {
        await start(null);
        signIn("guest-3", true);
        await flush();
        signIn("user-23");
        await flush();
        expect(sdk.syncAndCheckPro).not.toHaveBeenCalled();
    });

    it("keeps the account's own answer when claiming the guest's purchase fails", async () => {
        await start(null);
        sdk.identifyUser.mockReturnValueOnce(Effect.succeed(true));
        signIn("guest-2", true);
        await flush();
        sdk.identifyUser.mockReturnValueOnce(Effect.succeed(true));
        sdk.syncAndCheckPro.mockReturnValueOnce(Effect.fail(new PurchasesError({ cause: new Error("offline") })));
        signIn("user-22");
        await flush();
        expect(entitlement()).toMatchObject({ kind: "pro" });
    });

    it("retries an unfinished claim on the next launch, only for the account it started on", async () => {
        await start(null);
        sdk.identifyUser.mockReturnValueOnce(Effect.succeed(true));
        signIn("guest-4", true);
        await flush();
        sdk.syncAndCheckPro.mockReturnValueOnce(Effect.fail(new PurchasesError({ cause: new Error("killed") })));
        signIn("user-24");
        await flush();
        expect(sdk.syncAndCheckPro).toHaveBeenCalledOnce();

        leaveSession?.();
        await start("user-25");
        expect(sdk.syncAndCheckPro).toHaveBeenCalledOnce();

        leaveSession?.();
        sdk.syncAndCheckPro.mockReturnValueOnce(Effect.succeed(true));
        await start("user-24");
        expect(sdk.syncAndCheckPro).toHaveBeenCalledTimes(2);
        expect(entitlement()).toMatchObject({ kind: "pro" });

        leaveSession?.();
        await start("user-24");
        expect(sdk.syncAndCheckPro).toHaveBeenCalledTimes(2);
    });

    it("keeps the claim for the account whose sign-in failed, not the next one signed in to", async () => {
        await start(null);
        sdk.identifyUser.mockReturnValueOnce(Effect.succeed(true));
        signIn("guest-6", true);
        await flush();
        sdk.identifyUser.mockReturnValueOnce(Effect.fail(new PurchasesError({ cause: new Error("network") })));
        signIn("user-26");
        await flush();

        signIn("user-27");
        await flush();
        expect(sdk.syncAndCheckPro).not.toHaveBeenCalled();
        expect(disk).toStrictEqual({ destination: "user-26" });
    });

    it("retries the claim on foreground while the app stays open", async () => {
        await start(null);
        sdk.identifyUser.mockReturnValueOnce(Effect.succeed(true));
        signIn("guest-7", true);
        await flush();
        signIn("user-28");
        await flush();
        expect(entitlement()).toMatchObject({ kind: "free" });

        sdk.syncAndCheckPro.mockReturnValueOnce(Effect.succeed(true));
        appState.emit("active");
        await flush();
        expect(sdk.syncAndCheckPro).toHaveBeenCalledTimes(2);
        expect(entitlement()).toMatchObject({ kind: "pro" });
        expect(disk).toBeNull();
    });

    it("keeps retrying the claim while the account stays signed in, and stops once it lands", async () => {
        await start(null);
        sdk.identifyUser.mockReturnValueOnce(Effect.succeed(true));
        signIn("guest-8", true);
        await flush();
        signIn("user-29");
        await flush();

        await vi.advanceTimersByTimeAsync(60_000);
        expect(sdk.syncAndCheckPro).toHaveBeenCalledTimes(2);

        sdk.syncAndCheckPro.mockReturnValueOnce(Effect.succeed(true));
        await vi.advanceTimersByTimeAsync(120_000);
        expect(entitlement()).toMatchObject({ kind: "pro" });

        await vi.advanceTimersByTimeAsync(3_600_000);
        expect(sdk.syncAndCheckPro).toHaveBeenCalledTimes(3);
    });

    it("drops the previous customer's Pro at the switch and discards every late answer about it", async () => {
        sdk.identifyUser.mockReturnValueOnce(Effect.succeed(true));
        await start("user-3");
        expect(entitlement()).toMatchObject({ kind: "pro" });
        const refresh = held<boolean>();
        sdk.refreshProEntitlement.mockReturnValueOnce(Effect.promise(() => refresh.promise));
        const read = call((revenueCat) => revenueCat.refresh("user-3"));
        await flush();

        const signInOther = held<boolean>();
        sdk.identifyUser.mockReturnValueOnce(Effect.promise(() => signInOther.promise));
        signIn("user-4");
        await flush();
        expect(entitlement()).toStrictEqual({ kind: "unresolved", pending: true });

        refresh.resolve(true);
        customerInfo.emit(true);
        await flush();
        await expect(read).rejects.toThrow("identity");
        expect(entitlement()).toStrictEqual({ kind: "unresolved", pending: true });

        signInOther.resolve(false);
        await flush();
        expect(sdk.identifyUser).toHaveBeenLastCalledWith("user-4");
        expect(entitlement()).toStrictEqual({ kind: "free", pending: false });
    });

    it("signs in only after a pending sign-out has finished, and keeps the newer result", async () => {
        const signOut = held<boolean>();
        sdk.logOutUser.mockReturnValueOnce(Effect.promise(() => signOut.promise));
        sdk.identifyUser.mockReturnValueOnce(Effect.succeed(true));
        await start(null);

        signIn("user-5");
        await flush();
        expect(sdk.identifyUser).not.toHaveBeenCalled();

        signOut.resolve(false);
        await flush();
        expect(sdk.identifyUser).toHaveBeenCalledWith("user-5");
        expect(entitlement()).toMatchObject({ kind: "pro" });
    });

    it("signs an account back in when it returns while its sign-out is still pending", async () => {
        await start("user-6");
        const signOut = held<boolean>();
        sdk.logOutUser.mockReturnValueOnce(Effect.promise(() => signOut.promise));
        sdk.identifyUser.mockReturnValueOnce(Effect.succeed(true));

        signIn(null);
        signIn("user-6");
        await flush();
        signOut.resolve(false);
        await flush();

        expect(sdk.identifyUser).toHaveBeenCalledTimes(2);
        expect(entitlement()).toMatchObject({ kind: "pro" });
    });

    it("holds a sign-out behind a purchase in flight, and rejects the purchase it outdated", async () => {
        await start("user-7");
        const purchaseHeld = held<boolean>();
        sdk.purchaseAndCheckPro.mockReturnValueOnce(Effect.promise(() => purchaseHeld.promise));
        const purchase = call((revenueCat) => revenueCat.purchase("user-7", PACK));
        await flush();
        expect(sdk.purchaseAndCheckPro).toHaveBeenCalledOnce();

        signIn(null);
        await flush();
        expect(sdk.logOutUser).not.toHaveBeenCalled();

        purchaseHeld.resolve(true);
        await flush();
        expect(sdk.logOutUser).toHaveBeenCalledOnce();
        await expect(purchase).rejects.toThrow("identity");
    });

    it("never starts a purchase queued for an account that signed out before it ran", async () => {
        const signInHeld = held<boolean>();
        sdk.identifyUser.mockReturnValueOnce(Effect.promise(() => signInHeld.promise));
        await start("user-8");
        const purchase = call((revenueCat) => revenueCat.purchase("user-8", PACK));

        signIn(null);
        signInHeld.resolve(true);
        await flush();

        expect(sdk.purchaseAndCheckPro).not.toHaveBeenCalled();
        await expect(purchase).rejects.toThrow("identity");
    });

    it("rejects a failed purchase with the store's error and keeps serving later calls", async () => {
        await start("user-9");
        const storeError = new Error("payment declined");
        sdk.purchaseAndCheckPro.mockReturnValueOnce(Effect.fail(new PurchasesError({ cause: storeError })));

        const purchase = call((revenueCat) => revenueCat.purchase("user-9", PACK));
        await flush();

        await expect(purchase).rejects.toMatchObject({ _tag: "RevenueCatError", cause: storeError });
        expect(entitlement()).toStrictEqual({ kind: "free", pending: false });
        const packages = call((revenueCat) => revenueCat.getPackages("user-9"));
        await flush();
        await expect(packages).resolves.toStrictEqual([]);
    });

    it("counts a cancelled checkout as Pro when the store already grants it", async () => {
        await start("user-10");
        sdk.purchaseAndCheckPro.mockReturnValueOnce(
            Effect.fail(new PurchasesError({ cause: { userCancelled: true } }))
        );
        sdk.refreshProEntitlement.mockReturnValueOnce(Effect.succeed(true));

        const purchase = call((revenueCat) => revenueCat.purchase("user-10", PACK));
        await flush();

        await expect(purchase).resolves.toBe("pro");
        expect(entitlement()).toMatchObject({ kind: "pro" });
    });

    it("sends the profile only once RevenueCat has logged in as that account", async () => {
        const signInHeld = held<boolean>();
        sdk.identifyUser.mockReturnValueOnce(Effect.promise(() => signInHeld.promise));
        await start("user-11");
        expect(sdk.setCustomerProfile).not.toHaveBeenCalled();

        signInHeld.resolve(false);
        await flush();

        expect(sdk.setCustomerProfile).toHaveBeenCalledExactlyOnceWith({ email: "user-11@example.com", name: "Ana" });
    });

    it("is pending from the first read until the mirror answers for a Pro customer", async () => {
        const mirror = held<boolean>();
        sdk.mirrorEntitlement.mockReturnValueOnce(Effect.promise(() => mirror.promise));
        sdk.identifyUser.mockReturnValueOnce(Effect.succeed(true));

        const started = start("user-12");
        expect(entitlement()).toStrictEqual({ kind: "unresolved", pending: true });
        await started;
        expect(entitlement()).toStrictEqual({ kind: "pro", mirrored: false, pending: true });

        mirror.resolve(true);
        await flush();
        expect(entitlement()).toStrictEqual({ kind: "pro", mirrored: true, pending: false });
    });

    it("stops pending when the mirror refuses, rather than waiting on an answer that came", async () => {
        sdk.mirrorEntitlement.mockReturnValueOnce(Effect.succeed(false));
        sdk.identifyUser.mockReturnValueOnce(Effect.succeed(true));

        await start("user-13");

        expect(entitlement()).toStrictEqual({ kind: "pro", mirrored: false, pending: false });
    });

    it("stops pending for a Free account that replaces one whose mirror never landed", async () => {
        sdk.mirrorEntitlement.mockReturnValueOnce(Effect.promise(() => held<boolean>().promise));
        sdk.identifyUser.mockReturnValueOnce(Effect.succeed(true));
        await start("user-14");
        expect(entitlement()).toStrictEqual({ kind: "pro", mirrored: false, pending: true });

        signIn("user-15");
        await flush();

        expect(entitlement()).toStrictEqual({ kind: "free", pending: false });
    });
});
