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

const sdk = {
    configureRevenueCat: () => true,
    eligibleForTrial: vi.fn<(productIds: readonly string[]) => Effect.Effect<Set<string>, PurchasesError>>(),
    getPackages: vi.fn<() => Effect.Effect<PurchasesPackage[], PurchasesError>>(),
    identifyUser: vi.fn<(accountId: string) => Effect.Effect<boolean, PurchasesError>>(),
    logOutUser: vi.fn<() => Effect.Effect<boolean, PurchasesError>>(),
    mirrorEntitlement: vi.fn<() => Effect.Effect<boolean>>(),
    purchaseAndCheckPro: vi.fn<(pack: PurchasesPackage) => Effect.Effect<boolean, PurchasesError>>(),
    refreshProEntitlement: vi.fn<() => Effect.Effect<boolean, PurchasesError>>(),
    restoreAndCheckPro: vi.fn<() => Effect.Effect<boolean, PurchasesError>>(),
    setCustomerProfile: vi.fn<(profile: { email: string; name: string }) => Effect.Effect<void, PurchasesError>>(),
    watchEntitlement: customerInfo.watch,
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

    const signIn = (accountId: string | null) => {
        leaveSession?.();
        leaveSession = registry.mount(
            revenueCatSessionAtom({
                accountId,
                email: accountId === null ? undefined : `${accountId}@example.com`,
                name: accountId === null ? undefined : "Ana",
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
        leaveSession = undefined;
        sdk.eligibleForTrial.mockReturnValue(Effect.succeed(new Set()));
        sdk.getPackages.mockReturnValue(Effect.succeed([]));
        sdk.identifyUser.mockReturnValue(Effect.succeed(false));
        sdk.logOutUser.mockReturnValue(Effect.succeed(false));
        sdk.mirrorEntitlement.mockReturnValue(Effect.succeed(true));
        sdk.purchaseAndCheckPro.mockReturnValue(Effect.succeed(false));
        sdk.refreshProEntitlement.mockReturnValue(Effect.succeed(false));
        sdk.restoreAndCheckPro.mockReturnValue(Effect.succeed(false));
        sdk.setCustomerProfile.mockReturnValue(Effect.succeed(undefined));
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
