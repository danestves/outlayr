import { FunctionImpl, GroupImpl } from "@confect/server";
import {
    normalizeReferralCode,
    PRO_ENTITLEMENT_ID,
    REFERRAL_YEARLY_CAP,
    referralsEarnOnPayment,
} from "@outlayr/money/contract";
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
import { isGuest, optionalUserId, requireUserId } from "./lib/auth";
import { authComponent } from "./lib/betterAuth";
import { dieAsConvexError } from "./lib/convexError";
import { outboundHttp } from "./lib/http";
import {
    creditMonths,
    firstName,
    forgetRevokedGrant,
    GRANT_RETRY_MINUTES,
    grantOwed,
    grantReason,
    grantWorthRetrying,
    ineligibility,
    mirroredPro,
    newCode,
    nullOnMissing,
    purchasesSince,
    referralLimiter,
    refusalFor,
    rewardFor,
    rewardReferrer,
    scheduleGrant,
    yearStart,
} from "./referrals";
import spec from "./referrals.spec";
import { grantPromotional, labelPromotional, listsPro, revenuecat, storeSubscriber } from "./revenuecat";
import type { RevenueCatError } from "./revenuecat";

const FRIENDS_LIMIT = 100;
const GRANT_SAFETY_NET = Duration.minutes(1);
const STORE_RETRY = Duration.hours(1);
const SWEEP_PAGE = 100;

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
        const [redeemed, ownerReferral, user, entitlements] = yield* Effect.all([
            reader.table("referrals").get("by_referredId", userId).pipe(Effect.catchTags(nullOnMissing)),
            reader.table("referrals").get("by_referredId", owner.userId).pipe(Effect.catchTags(nullOnMissing)),
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
            referrerInvitedBy: ownerReferral?.referrerId ?? null,
            userId,
        });
        if (refusal !== null) {
            return refusal;
        }
        yield* (yield* DatabaseWriter).table("referrals").insert({
            claimedAt: now,
            daysLogged: 0,
            lastCountedAt: null,
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

const pendingGrant = FunctionImpl.make(
    databaseSchema,
    spec,
    "pendingGrant",
    Effect.fn("Referrals.pendingGrant")(function* pendingGrant({ userId }) {
        const reader = yield* DatabaseReader;
        const row = yield* reader
            .table("referralRewards")
            .get("by_userId", userId)
            .pipe(Effect.catchTags(nullOnMissing));
        const endsAt = row?.promoEndsAt ?? null;
        if (endsAt === null || !grantOwed(yield* mirroredPro(yield* QueryCtx, userId), endsAt)) {
            return null;
        }
        const now = yield* Clock.currentTimeMillis;
        const [invite, earned] = yield* Effect.all([
            reader.table("referrals").get("by_referredId", userId).pipe(Effect.catchTags(nullOnMissing)),
            reader
                .table("referrals")
                .index("by_referrerId_and_rewardedAt", (q) =>
                    q.eq("referrerId", userId).gt("rewardedAt", yearStart(now))
                )
                .take(REFERRAL_YEARLY_CAP),
        ]);
        return { endsAt, reason: grantReason(invite?.referrerId ?? null, earned.length) };
    }, Effect.orDie)
);

const revoked = FunctionImpl.make(
    databaseSchema,
    spec,
    "revoked",
    Effect.fn("Referrals.revoked")(function* revoked(args) {
        if (args.entitlementId === PRO_ENTITLEMENT_ID) {
            yield* forgetRevokedGrant(args);
        }
        return null;
    }, Effect.orDie)
);

const retryGrant = Effect.fn("Referrals.retryGrant")(function* retryGrant(
    userId: string,
    attempt: number,
    error: RevenueCatError
) {
    if (!grantWorthRetrying(error)) {
        yield* Console.error("[referrals] promotional grant refused", error);
        return null;
    }
    yield* Console.warn("[referrals] promotional grant failed", error);
    const minutes = GRANT_RETRY_MINUTES[attempt];
    if (minutes === undefined) {
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
    const pending = yield* runQuery(refs.internal.referrals.pendingGrant, { userId });
    if (pending === null || pending.endsAt <= (yield* Clock.currentTimeMillis)) {
        return;
    }
    const subscriber = yield* grantPromotional(userId, pending.endsAt).pipe(Effect.provide(outboundHttp));
    yield* labelPromotional(userId, pending.reason).pipe(Effect.provide(outboundHttp));
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
        const identity = yield* Effect.promise(() => ctx.auth.getUserIdentity());
        const userId = yield* runQuery(refs.internal.revenuecat.sessionUserId, {});
        // Guests are free to make, so a code redeemed by one would be a reward anyone could farm.
        if (userId === null || identity === null || isGuest(identity)) {
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
        const subscriber = yield* storeSubscriber(userId).pipe(Effect.provide(outboundHttp));
        if (subscriber === null) {
            return "unavailable" as const;
        }
        const { runMutation } = yield* MutationRunner;
        const status = yield* runMutation(refs.internal.referrals.claim, {
            code,
            hadPro: listsPro(subscriber),
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
        const { runQuery } = yield* QueryRunner;
        if ((yield* runQuery(refs.internal.referrals.bankedMonths, { userId })) === 0) {
            return null;
        }
        const subscriber = yield* storeSubscriber(userId).pipe(Effect.provide(outboundHttp));
        if (subscriber === null) {
            const scheduler = yield* Scheduler;
            yield* scheduler.runAfter(STORE_RETRY, refs.internal.referrals.releaseBanked, { userId });
            return null;
        }
        const { runMutation } = yield* MutationRunner;
        yield* runMutation(refs.internal.revenuecat.mirrorSubscriber, {
            appUserId: userId,
            subscriber: JSON.stringify(subscriber),
        });
        yield* runMutation(refs.internal.referrals.creditBanked, { userId });
        return null;
    }, Effect.orDie)
);

const bankedMonths = FunctionImpl.make(
    databaseSchema,
    spec,
    "bankedMonths",
    Effect.fn("Referrals.bankedMonths")(function* bankedMonths({ userId }) {
        const reader = yield* DatabaseReader;
        const row = yield* reader
            .table("referralRewards")
            .get("by_userId", userId)
            .pipe(Effect.catchTags(nullOnMissing));
        return row?.bankedMonths ?? 0;
    }, Effect.orDie)
);

const sweepGrants = FunctionImpl.make(
    databaseSchema,
    spec,
    "sweepGrants",
    Effect.fn("Referrals.sweepGrants")(function* sweepGrants({ cursor, since }) {
        const ctx = yield* MutationCtx;
        const from = since ?? (yield* Clock.currentTimeMillis);
        const page = yield* (yield* DatabaseReader)
            .table("referralRewards")
            .index("by_promoEndsAt", (q) => q.gt("promoEndsAt", from))
            .paginate({ cursor, numItems: SWEEP_PAGE });
        for (const row of page.page) {
            if (row.promoEndsAt !== null && grantOwed(yield* mirroredPro(ctx, row.userId), row.promoEndsAt)) {
                yield* scheduleGrant(row.userId);
            }
        }
        if (!page.isDone) {
            const scheduler = yield* Scheduler;
            yield* scheduler.runAfter(Duration.zero, refs.internal.referrals.sweepGrants, {
                cursor: page.continueCursor,
                since: from,
            });
        }
        return null;
    }, Effect.orDie)
);

const rewardPaidFriends = FunctionImpl.make(
    databaseSchema,
    spec,
    "rewardPaidFriends",
    Effect.fn("Referrals.rewardPaidFriends")(function* rewardPaidFriends({ cursor }) {
        if (!referralsEarnOnPayment(yield* Clock.currentTimeMillis)) {
            return null;
        }
        const ctx = yield* MutationCtx;
        const page = yield* (yield* DatabaseReader)
            .table("referrals")
            .index("by_status", (q) => q.eq("status", "counting"))
            .paginate({ cursor, numItems: SWEEP_PAGE });
        const reader = yield* DatabaseReader;
        for (const referral of page.page) {
            const subscriptions = yield* Effect.promise(() =>
                revenuecat.getAllSubscriptions(ctx, { appUserId: referral.referredId })
            );
            for (const paidWith of purchasesSince(subscriptions, referral.claimedAt)) {
                const used = yield* reader
                    .table("referrals")
                    .index("by_paidWith", (q) => q.eq("paidWith", paidWith))
                    .first();
                if (Option.isNone(used)) {
                    yield* rewardReferrer(referral, { paidWith });
                    break;
                }
            }
        }
        if (!page.isDone) {
            yield* (yield* Scheduler).runAfter(Duration.zero, refs.internal.referrals.rewardPaidFriends, {
                cursor: page.continueCursor,
            });
        }
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
    Layer.provide(pendingGrant),
    Layer.provide(revoked),
    Layer.provide(grant),
    Layer.provide(redeem),
    Layer.provide(releaseBanked),
    Layer.provide(bankedMonths),
    Layer.provide(sweepGrants),
    Layer.provide(rewardPaidFriends),
    Layer.provide(creditBanked),
    GroupImpl.finalize
);
