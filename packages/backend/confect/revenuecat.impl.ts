import { FunctionImpl, GroupImpl } from "@confect/server";
import type { RevenueCatSubscriber } from "convex-revenuecat";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import refs from "./_generated/refs";
import databaseSchema from "./_generated/schema";
import { ActionCtx, Auth, MutationCtx, MutationRunner, QueryCtx, QueryRunner } from "./_generated/services";
import { optionalUserId } from "./lib/auth";
import { revenueCatSecretKey } from "./lib/config";
import { outboundHttp } from "./lib/http";
import { isPro, listsPro, revenuecat, storeSubscriber, syncLimiter } from "./revenuecat";
import spec from "./revenuecat.spec";

const mirrorSubscriber = FunctionImpl.make(
    databaseSchema,
    spec,
    "mirrorSubscriber",
    Effect.fn("RevenueCat.mirrorSubscriber")(function* mirrorSubscriber(args) {
        const ctx = yield* MutationCtx;
        const subscriber: RevenueCatSubscriber = JSON.parse(args.subscriber);
        // `syncSubscriber` never removes, and a revoked entitlement is absent rather than expired, so the mirror is
        // cleared when it disagrees. The re-sync below runs in the same transaction.
        if (!listsPro(subscriber) && (yield* isPro(ctx, args.appUserId))) {
            yield* Effect.promise(() => revenuecat.deleteCustomer(ctx, { appUserId: args.appUserId }));
        }
        yield* Effect.promise(() => revenuecat.syncSubscriber(ctx, { appUserId: args.appUserId, subscriber }));
        return yield* isPro(ctx, args.appUserId);
    }, Effect.orDie)
);

const mirroredEntitlement = FunctionImpl.make(
    databaseSchema,
    spec,
    "mirroredEntitlement",
    Effect.fn("RevenueCat.mirroredEntitlement")(function* mirroredEntitlement({ appUserId }) {
        const ctx = yield* QueryCtx;
        return yield* isPro(ctx, appUserId);
    }, Effect.orDie)
);

const sessionUserId = FunctionImpl.make(
    databaseSchema,
    spec,
    "sessionUserId",
    Effect.fn("RevenueCat.sessionUserId")(function* sessionUserId() {
        const ctx = yield* QueryCtx;
        return yield* optionalUserId(ctx);
    }, Effect.orDie)
);

// The store is asked whenever possible: only it can remove an entitlement whose refund webhook was missed. The
// mirror is the fallback when it cannot be asked, since refusing would strand a customer the webhook covered.
const syncFromStore = FunctionImpl.make(
    databaseSchema,
    spec,
    "syncFromStore",
    Effect.fn("RevenueCat.syncFromStore")(function* syncFromStore() {
        const ctx = yield* ActionCtx;
        const auth = yield* Auth;
        const { runQuery } = yield* QueryRunner;
        const { runMutation } = yield* MutationRunner;
        const identity = yield* auth.getUserIdentity.pipe(
            Effect.catchTags({ NoUserIdentityFoundError: () => Effect.succeed(null) })
        );
        if (identity === null) {
            return false;
        }
        const userId = yield* runQuery(refs.internal.revenuecat.sessionUserId, {});
        if (userId === null) {
            return false;
        }
        const mirrored = runQuery(refs.internal.revenuecat.mirroredEntitlement, { appUserId: userId });
        if (Option.isNone(yield* revenueCatSecretKey)) {
            return yield* mirrored;
        }
        const allowed = yield* Effect.promise(() =>
            syncLimiter.limit(ctx, "revenuecatSync", { key: identity.tokenIdentifier })
        );
        if (!allowed.ok) {
            return yield* mirrored;
        }
        const subscriber = yield* storeSubscriber(userId).pipe(Effect.provide(outboundHttp));
        if (subscriber === null) {
            return yield* mirrored;
        }
        return yield* runMutation(refs.internal.revenuecat.mirrorSubscriber, {
            appUserId: userId,
            subscriber: JSON.stringify(subscriber),
        });
    }, Effect.orDie)
);

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(mirrorSubscriber),
    Layer.provide(mirroredEntitlement),
    Layer.provide(sessionUserId),
    Layer.provide(syncFromStore),
    GroupImpl.finalize
);
