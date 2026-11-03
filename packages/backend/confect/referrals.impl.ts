import { FunctionImpl, GroupImpl } from "@confect/server";
import { normalizeReferralCode, PRO_ENTITLEMENT_ID } from "@outlayr/money/contract";
import * as Clock from "effect/Clock";
import * as Console from "effect/Console";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import refs from "./_generated/refs";
import databaseSchema from "./_generated/schema";
import {
    ActionCtx,
    DatabaseReader,
    DatabaseWriter,
    MutationCtx,
    MutationRunner,
    QueryCtx,
    QueryRunner,
    Scheduler,
} from "./_generated/services";
import { optionalUserId, requireUserId } from "./lib/auth";
import { authComponent } from "./lib/betterAuth";
import { revenueCatSecretKey } from "./lib/config";
import { dieAsConvexError } from "./lib/convexError";
import { outboundHttp } from "./lib/http";
import {
    creditMonths,
    firstName,
    GRANT_RETRY_MINUTES,
    grantWorthRetrying,
    ineligibility,
    mirroredPro,
    newCode,
    nullOnMissing,
    referralLimiter,
    refusalFor,
    rewardFor,
    scheduleGrant,
} from "./referrals";
import spec from "./referrals.spec";
import { grantPromotional, listsPro, revenuecat, storeSubscriber } from "./revenuecat";
import type { RevenueCatError } from "./revenuecat";

const FRIENDS_LIMIT = 100;
const GRANT_SAFETY_NET = Duration.minutes(1);
const STORE_RETRY = Duration.hours(1);
const SAME_GRANT = Duration.hours(2);

const codeOwner = Effect.fn("Referrals.codeOwner")(function* codeOwner(code: string) {
    const reader = yield* DatabaseReader;
    return yield* reader.table("referralCodes").get("by_code", code).pipe(Effect.catchTags(nullOnMissing));
});

const inviter = FunctionImpl.make(
    databaseSchema,
    spec,
    "inviter",
    Effect.fn("Referrals.inviter")(function* inviter(args) {
        const code = normalizeReferralCode(args.code);
        if (code === null) {
            return null;
        }
        const owner = yield* codeOwner(code);
        if (owner === null) {
            return null;
        }
        const ctx = yield* QueryCtx;
        const user = yield* Effect.promise(() => authComponent.getAnyUserById(ctx, owner.userId));
        return user ? { name: firstName(user.name) } : null;
    }, Effect.orDie)
);

const ensureCode = FunctionImpl.make(
    databaseSchema,
    spec,
    "ensureCode",
    Effect.fn("Referrals.ensureCode")(
        function* ensureCode() {
            const userId = yield* requireUserId(yield* MutationCtx);
            const reader = yield* DatabaseReader;
            const existing = yield* reader
                .table("referralCodes")
                .get("by_userId", userId)
                .pipe(Effect.catchTags(nullOnMissing));
            if (existing) {
                return existing.code;
            }
            let code = newCode();
            while ((yield* codeOwner(code)) !== null) {
                code = newCode();
            }
            yield* (yield* DatabaseWriter).table("referralCodes").insert({ code, userId });
            return code;
        },
        Effect.catchTags({ Unauthenticated: dieAsConvexError }),
        Effect.orDie
    )
);

const overview = FunctionImpl.make(
    databaseSchema,
    spec,
    "overview",
    Effect.fn("Referrals.overview")(function* overview() {
        const ctx = yield* QueryCtx;
        const userId = yield* optionalUserId(ctx);
        if (userId === null) {
            return null;
        }
        const reader = yield* DatabaseReader;
        const [code, rows, reward, redeemed, user, entitlements, active] = yield* Effect.all([
            reader.table("referralCodes").get("by_userId", userId).pipe(Effect.catchTags(nullOnMissing)),
            reader
                .table("referrals")
                .index("by_referrerId_and_claimedAt", (q) => q.eq("referrerId", userId), "desc")
                .take(FRIENDS_LIMIT),
            reader.table("referralRewards").get("by_userId", userId).pipe(Effect.catchTags(nullOnMissing)),
            reader.table("referrals").get("by_referredId", userId).pipe(Effect.catchTags(nullOnMissing)),
            Effect.promise(() => authComponent.getAnyUserById(ctx, userId)),
            Effect.promise(() => revenuecat.getAllEntitlements(ctx, { appUserId: userId })),
            mirroredPro(ctx, userId),
        ]);
        const unredeemable = ineligibility({
            accountCreatedAt: user?.createdAt ?? null,
            alreadyRedeemed: redeemed !== null,
            hadPro: entitlements.some((entitlement) => entitlement.entitlementId === PRO_ENTITLEMENT_ID),
            now: yield* Clock.currentTimeMillis,
        });
        return {
            bankedMonths: reward?.bankedMonths ?? 0,
            canRedeem: unredeemable === null,
            code: code?.code ?? null,
            earns: rewardFor(active) !== "none",
            friends: rows.map((row) => ({
                claimedAt: row.claimedAt,
                daysLogged: row.daysLogged,
                id: row._id,
                name: row.referredName,
                rewardedAt: row.rewardedAt,
                status: row.status,
            })),
            promoEndsAt: reward?.promoEndsAt ?? null,
        };
    }, Effect.orDie)
);

const claim = FunctionImpl.make(
    databaseSchema,
    spec,
    "claim",
    Effect.fn("Referrals.claim")(function* claim({ code, hadPro, userId }) {
        const owner = yield* codeOwner(code);
        if (owner === null) {
            return "invalid" as const;
        }
        const ctx = yield* MutationCtx;
        const reader = yield* DatabaseReader;
        const [redeemed, user, entitlements] = yield* Effect.all([
            reader.table("referrals").get("by_referredId", userId).pipe(Effect.catchTags(nullOnMissing)),
            Effect.promise(() => authComponent.getAnyUserById(ctx, userId)),
            Effect.promise(() => revenuecat.getAllEntitlements(ctx, { appUserId: userId })),
        ]);
        const now = yield* Clock.currentTimeMillis;
        const refusal = refusalFor({
            accountCreatedAt: user?.createdAt ?? null,
            alreadyRedeemed: redeemed !== null,
            hadPro: hadPro || entitlements.some((entitlement) => entitlement.entitlementId === PRO_ENTITLEMENT_ID),
            now,
            referrerId: owner.userId,
            userId,
        });
        if (refusal !== null) {
            return refusal;
        }
        yield* (yield* DatabaseWriter).table("referrals").insert({
            claimedAt: now,
            daysLogged: 0,
            lastLoggedDay: null,
            referredId: userId,
            referredName: firstName(user?.name),
            referrerId: owner.userId,
            rewardedAt: null,
            status: "counting",
        });
        yield* creditMonths(userId, 1);
        yield* scheduleGrant(userId, GRANT_SAFETY_NET);
        return "claimed" as const;
    }, Effect.orDie)
);

const promoEnd = FunctionImpl.make(
    databaseSchema,
    spec,
    "promoEnd",
    Effect.fn("Referrals.promoEnd")(function* promoEnd({ userId }) {
        const reader = yield* DatabaseReader;
        const row = yield* reader
            .table("referralRewards")
            .get("by_userId", userId)
            .pipe(Effect.catchTags(nullOnMissing));
        const endsAt = row?.promoEndsAt ?? null;
        if (endsAt === null) {
            return null;
        }
        const ctx = yield* QueryCtx;
        const active = yield* Effect.promise(() =>
            revenuecat.getEntitlement(ctx, { appUserId: userId, entitlementId: PRO_ENTITLEMENT_ID })
        );
        const alreadyGranted =
            active?.store === "PROMOTIONAL" && (active.expiresAtMs ?? 0) >= endsAt - Duration.toMillis(SAME_GRANT);
        return alreadyGranted ? null : endsAt;
    }, Effect.orDie)
);

const retryGrant = Effect.fn("Referrals.retryGrant")(function* retryGrant(
    userId: string,
    attempt: number,
    error: RevenueCatError
) {
    yield* Console.warn("[referrals] promotional grant failed", error);
    const minutes = GRANT_RETRY_MINUTES[attempt];
    if (!grantWorthRetrying(error) || minutes === undefined) {
        return null;
    }
    const scheduler = yield* Scheduler;
    yield* scheduler.runAfter(Duration.minutes(minutes), refs.internal.referrals.grant, {
        attempt: attempt + 1,
        userId,
    });
    return null;
});

const sendGrant = Effect.fn("Referrals.sendGrant")(function* sendGrant(userId: string) {
    const { runQuery } = yield* QueryRunner;
    const endsAt = yield* runQuery(refs.internal.referrals.promoEnd, { userId });
    if (endsAt === null || endsAt <= (yield* Clock.currentTimeMillis)) {
        return;
    }
    const subscriber = yield* grantPromotional(userId, endsAt).pipe(Effect.provide(outboundHttp));
    const { runMutation } = yield* MutationRunner;
    yield* runMutation(refs.internal.revenuecat.mirrorSubscriber, {
        appUserId: userId,
        subscriber: JSON.stringify(subscriber),
    });
});

const grant = FunctionImpl.make(
    databaseSchema,
    spec,
    "grant",
    Effect.fn("Referrals.grant")(function* grant({ attempt, userId }) {
        yield* sendGrant(userId).pipe(
            Effect.catchTags({ RevenueCatError: (error) => retryGrant(userId, attempt, error) })
        );
        return null;
    }, Effect.orDie)
);

const redeem = FunctionImpl.make(
    databaseSchema,
    spec,
    "redeem",
    Effect.fn("Referrals.redeem")(function* redeem(args) {
        const ctx = yield* ActionCtx;
        const { runQuery } = yield* QueryRunner;
        const userId = yield* runQuery(refs.internal.revenuecat.sessionUserId, {});
        if (userId === null) {
            return "signedOut" as const;
        }
        const allowed = yield* Effect.promise(() => referralLimiter.limit(ctx, "referralRedeem", { key: userId }));
        if (!allowed.ok) {
            return "rateLimited" as const;
        }
        const code = normalizeReferralCode(args.code);
        if (code === null) {
            return "invalid" as const;
        }
        const configured = Option.isSome(yield* revenueCatSecretKey);
        const subscriber = configured ? yield* storeSubscriber(userId).pipe(Effect.provide(outboundHttp)) : null;
        if (configured && subscriber === null) {
            return "unavailable" as const;
        }
        const { runMutation } = yield* MutationRunner;
        const status = yield* runMutation(refs.internal.referrals.claim, {
            code,
            hadPro: subscriber !== null && listsPro(subscriber),
            userId,
        });
        if (status === "claimed") {
            yield* sendGrant(userId).pipe(
                Effect.ignoreCause({ log: "Warn", message: "[referrals] friend grant deferred" })
            );
        }
        return status;
    }, Effect.orDie)
);

const releaseBanked = FunctionImpl.make(
    databaseSchema,
    spec,
    "releaseBanked",
    Effect.fn("Referrals.releaseBanked")(function* releaseBanked({ userId }) {
        const configured = Option.isSome(yield* revenueCatSecretKey);
        const subscriber = configured ? yield* storeSubscriber(userId).pipe(Effect.provide(outboundHttp)) : null;
        if (configured && subscriber === null) {
            const scheduler = yield* Scheduler;
            yield* scheduler.runAfter(STORE_RETRY, refs.internal.referrals.releaseBanked, { userId });
            return null;
        }
        const { runMutation } = yield* MutationRunner;
        if (subscriber !== null) {
            yield* runMutation(refs.internal.revenuecat.mirrorSubscriber, {
                appUserId: userId,
                subscriber: JSON.stringify(subscriber),
            });
        }
        yield* runMutation(refs.internal.referrals.creditBanked, { userId });
        return null;
    }, Effect.orDie)
);

const creditBanked = FunctionImpl.make(
    databaseSchema,
    spec,
    "creditBanked",
    Effect.fn("Referrals.creditBanked")(function* creditBanked({ userId }) {
        const reader = yield* DatabaseReader;
        const row = yield* reader
            .table("referralRewards")
            .get("by_userId", userId)
            .pipe(Effect.catchTags(nullOnMissing));
        if (row === null || row.bankedMonths === 0) {
            return null;
        }
        yield* (yield* DatabaseWriter).table("referralRewards").patch(row._id, { bankedMonths: 0 });
        if ((yield* creditMonths(userId, row.bankedMonths)) === "grant") {
            yield* scheduleGrant(userId);
        }
        return null;
    }, Effect.orDie)
);

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(inviter),
    Layer.provide(ensureCode),
    Layer.provide(overview),
    Layer.provide(claim),
    Layer.provide(promoEnd),
    Layer.provide(grant),
    Layer.provide(redeem),
    Layer.provide(releaseBanked),
    Layer.provide(creditBanked),
    GroupImpl.finalize
);
