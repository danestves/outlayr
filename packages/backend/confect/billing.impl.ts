import { FunctionImpl, GroupImpl } from "@confect/server";
import { proPrice, proPriceKey } from "@outlayr/money/pro-prices";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import refs from "./_generated/refs";
import databaseSchema from "./_generated/schema";
import { ActionCtx, MutationRunner } from "./_generated/services";
import spec from "./billing.spec";
import { authComponent } from "./lib/betterAuth";
import { siteUrl } from "./lib/config";
import { outboundHttp } from "./lib/http";
import { decodeProSubscriber, planOfStoreProduct, proTermOf } from "./proTerm";
import { listsPro, storeSubscriber, syncLimiter } from "./revenuecat";
import {
    createCheckoutSession,
    ensureCustomer,
    findCustomer,
    paidSession,
    paidSessionIds,
    planOfPrice,
    portalUrl,
    postReceipt,
    priceIdForKey,
    recentPayments,
} from "./stripe";

const HELD = new Set(["renews", "trial", "ends", "lifetime"]);

const billingUser = Effect.fn("Billing.user")(function* billingUser() {
    const ctx = yield* ActionCtx;
    const user = yield* Effect.promise(() => authComponent.safeGetAuthUser(ctx));
    return user ? { email: user.email, id: String(user._id), name: user.name } : null;
});

const withinLimit = Effect.fn("Billing.withinLimit")(function* withinLimit(userId: string) {
    const ctx = yield* ActionCtx;
    const { ok } = yield* Effect.promise(() => syncLimiter.limit(ctx, "billing", { key: userId }));
    return ok;
});

const mirrorFromStore = Effect.fn("Billing.mirrorFromStore")(function* mirrorFromStore(userId: string) {
    const { runMutation } = yield* MutationRunner;
    const subscriber = yield* storeSubscriber(userId);
    if (subscriber === null) {
        return false;
    }
    return yield* runMutation(refs.internal.revenuecat.mirrorSubscriber, {
        appUserId: userId,
        subscriber: JSON.stringify(subscriber),
    });
});

const readProSubscriber = Effect.fn("Billing.readProSubscriber")(function* readProSubscriber(userId: string) {
    const subscriber = yield* storeSubscriber(userId);
    return subscriber === null ? null : Option.getOrNull(decodeProSubscriber(subscriber));
});

const createCheckout = FunctionImpl.make(
    databaseSchema,
    spec,
    "createCheckout",
    Effect.fn("Billing.createCheckout")(
        function* createCheckout({ country, plan }) {
            const user = yield* billingUser();
            if (user === null) {
                return { kind: "signedOut" as const };
            }
            if (!(yield* withinLimit(user.id))) {
                return { kind: "unavailable" as const };
            }
            const subscriber = yield* readProSubscriber(user.id);
            if (subscriber === null) {
                return { kind: "unavailable" as const };
            }
            if (HELD.has(proTermOf(subscriber, Date.now()).state)) {
                return { kind: "alreadyPro" as const };
            }
            const priceId = yield* priceIdForKey(proPriceKey(proPrice(country, plan)));
            if (priceId === null) {
                return { kind: "unavailable" as const };
            }
            const url = yield* createCheckoutSession({
                appUserId: user.id,
                customerId: yield* ensureCustomer(user),
                plan,
                priceId,
                siteUrl: yield* siteUrl,
                trial: !listsPro(subscriber),
            });
            return { kind: "redirect" as const, url };
        },
        Effect.provide(outboundHttp),
        Effect.catchTags({
            ConfigError: () => Effect.succeed({ kind: "unavailable" as const }),
            StripeError: (error) =>
                Effect.logWarning("[billing] checkout failed", error).pipe(Effect.as({ kind: "unavailable" as const })),
        }),
        Effect.orDie
    )
);

const confirmCheckout = FunctionImpl.make(
    databaseSchema,
    spec,
    "confirmCheckout",
    Effect.fn("Billing.confirmCheckout")(
        function* confirmCheckout({ sessionId }) {
            const user = yield* billingUser();
            if (user === null || !(yield* withinLimit(user.id))) {
                return false;
            }
            if (!(yield* paidSession(sessionId, user.id))) {
                return yield* mirrorFromStore(user.id);
            }
            yield* postReceipt(user.id, sessionId);
            return yield* mirrorFromStore(user.id);
        },
        Effect.provide(outboundHttp),
        Effect.catchTags({
            StripeError: (error) => Effect.logWarning("[billing] confirm failed", error).pipe(Effect.as(false)),
        }),
        Effect.orDie
    )
);

const restore = FunctionImpl.make(
    databaseSchema,
    spec,
    "restore",
    Effect.fn("Billing.restore")(
        function* restore() {
            const user = yield* billingUser();
            if (user === null || !(yield* withinLimit(user.id))) {
                return "failed" as const;
            }
            const customerId = yield* findCustomer(user.id);
            for (const sessionId of customerId === null ? [] : yield* paidSessionIds(customerId)) {
                yield* postReceipt(user.id, sessionId);
            }
            return (yield* mirrorFromStore(user.id)) ? ("restored" as const) : ("nothing" as const);
        },
        Effect.provide(outboundHttp),
        Effect.catchTags({
            StripeError: (error) =>
                Effect.logWarning("[billing] restore failed", error).pipe(Effect.as("failed" as const)),
        }),
        Effect.orDie
    )
);

const openPortal = FunctionImpl.make(
    databaseSchema,
    spec,
    "openPortal",
    Effect.fn("Billing.openPortal")(
        function* openPortal() {
            const user = yield* billingUser();
            if (user === null || !(yield* withinLimit(user.id))) {
                return null;
            }
            const customerId = yield* findCustomer(user.id);
            return customerId === null ? null : yield* portalUrl(customerId, yield* siteUrl);
        },
        Effect.provide(outboundHttp),
        Effect.catchTags({
            ConfigError: () => Effect.succeed(null),
            StripeError: (error) => Effect.logWarning("[billing] portal failed", error).pipe(Effect.as(null)),
        }),
        Effect.orDie
    )
);

const plan = FunctionImpl.make(
    databaseSchema,
    spec,
    "plan",
    Effect.fn("Billing.plan")(
        function* plan() {
            const user = yield* billingUser();
            if (user === null) {
                return null;
            }
            const subscriber = yield* readProSubscriber(user.id);
            if (subscriber === null) {
                return null;
            }
            const { productId, ...term } = proTermOf(subscriber, Date.now());
            const isStripe = term.store === "stripe";
            const customerId = isStripe ? yield* findCustomer(user.id) : null;
            return {
                expiresAtMs: term.expiresAtMs,
                payments: customerId === null ? [] : yield* recentPayments(customerId),
                plan: isStripe && productId !== null ? yield* planOfPrice(productId) : planOfStoreProduct(productId),
                price: term.price,
                state: term.state,
                store: term.store,
                trialAvailable: !listsPro(subscriber),
            };
        },
        Effect.provide(outboundHttp),
        Effect.catchTags({
            StripeError: (error) => Effect.logWarning("[billing] plan failed", error).pipe(Effect.as(null)),
        }),
        Effect.orDie
    )
);

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(createCheckout),
    Layer.provide(confirmCheckout),
    Layer.provide(restore),
    Layer.provide(openPortal),
    Layer.provide(plan),
    GroupImpl.finalize
);
