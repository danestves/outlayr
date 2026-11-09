import { HOUR, RateLimiter } from "@convex-dev/rate-limiter";
import {
    PRO_ENTITLEMENT_ID,
    REFERRAL_CAP_WINDOW_MS,
    REFERRAL_CODE_ALPHABET,
    REFERRAL_CODE_LENGTH,
    REFERRAL_DAYS_TO_EARN,
    REFERRAL_YEARLY_CAP,
} from "@outlayr/money/contract";
import { DAY_MS } from "@outlayr/money/ledger-zone";
import * as Clock from "effect/Clock";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";

import { components } from "../convex/_generated/api";
import refs from "./_generated/refs";
import { DatabaseReader, DatabaseWriter, MutationCtx, Scheduler } from "./_generated/services";
import type referrals from "./_generated/tables/referrals";
import { revenuecat } from "./revenuecat";

export const NEW_ACCOUNT_MS = 7 * DAY_MS;

const UNBIASED_BYTE_LIMIT = 256 - (256 % REFERRAL_CODE_ALPHABET.length);

type Referral = typeof referrals.Doc.Type;

export const nullOnMissing = { GetByIndexFailure: () => Effect.succeed(null) };

export const referralLimiter = new RateLimiter(components.rateLimiter, {
    referralRedeem: { capacity: 5, kind: "token bucket", period: HOUR, rate: 5 },
});

export function codeFromBytes(bytes: Uint8Array): string | null {
    let code = "";
    for (const byte of bytes) {
        if (byte < UNBIASED_BYTE_LIMIT) {
            code += REFERRAL_CODE_ALPHABET[byte % REFERRAL_CODE_ALPHABET.length];
        }
        if (code.length === REFERRAL_CODE_LENGTH) {
            return code;
        }
    }
    return null;
}

export function newCode(): string {
    for (;;) {
        const code = codeFromBytes(crypto.getRandomValues(new Uint8Array(REFERRAL_CODE_LENGTH * 2)));
        if (code !== null) {
            return code;
        }
    }
}

export function addMonthsUtc(ms: number, months: number): number {
    const date = new Date(ms);
    const day = date.getUTCDate();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + months);
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(day, lastDay));
    return date.getTime();
}

export function stackedEnd(now: number, currentEnd: number | null, months: number): number {
    return addMonthsUtc(Math.max(now, currentEnd ?? now), months);
}

const SAME_GRANT_MS = 2 * HOUR;

export function grantOwed(active: { readonly expiresAtMs?: number } | null, endsAt: number) {
    return active === null || (active.expiresAtMs !== undefined && active.expiresAtMs < endsAt - SAME_GRANT_MS);
}

export type Reward = "bank" | "grant" | "none";

export function rewardFor(active: { readonly expiresAtMs?: number; readonly store?: string } | null): Reward {
    if (active === null) {
        return "grant";
    }
    if (active.expiresAtMs === undefined) {
        return "none";
    }
    return active.store === "PROMOTIONAL" ? "grant" : "bank";
}

const MIN_GAP_BETWEEN_DAYS = 20 * HOUR;

export function countDay(
    referral: Pick<Referral, "daysLogged" | "lastCountedAt">,
    now: number
): Pick<Referral, "daysLogged" | "lastCountedAt"> | null {
    const last = referral.lastCountedAt;
    if (last !== null && (Math.floor(now / DAY_MS) <= Math.floor(last / DAY_MS) || now - last < MIN_GAP_BETWEEN_DAYS)) {
        return null;
    }
    return { daysLogged: referral.daysLogged + 1, lastCountedAt: now };
}

export function yearStart(now: number): number {
    return now - REFERRAL_CAP_WINDOW_MS;
}

export type Refusal = "hadPro" | "notNew" | "own" | "used";

interface Claimant {
    readonly accountCreatedAt: number | null;
    readonly alreadyRedeemed: boolean;
    readonly hadPro: boolean;
    readonly now: number;
    readonly referrerId: string;
    readonly userId: string;
}

export function refusalFor(claimant: Claimant): Refusal | null {
    return claimant.referrerId === claimant.userId ? "own" : ineligibility(claimant);
}

export function ineligibility(claimant: Omit<Claimant, "referrerId" | "userId">): Exclude<Refusal, "own"> | null {
    if (claimant.alreadyRedeemed) {
        return "used";
    }
    if (claimant.accountCreatedAt === null || claimant.now - claimant.accountCreatedAt >= NEW_ACCOUNT_MS) {
        return "notNew";
    }
    return claimant.hadPro ? "hadPro" : null;
}

export function firstName(name: string | null | undefined): string | null {
    const first = name?.trim().split(/\s+/)[0];
    return first || null;
}

export function mirroredPro(ctx: Parameters<typeof revenuecat.getEntitlement>[0], userId: string) {
    return Effect.promise(() =>
        revenuecat.getEntitlement(ctx, { appUserId: userId, entitlementId: PRO_ENTITLEMENT_ID })
    );
}

export const activePro = Effect.fn("Referrals.activePro")(function* activePro(userId: string) {
    return yield* mirroredPro(yield* MutationCtx, userId);
});

const RELEASE_AFTER_EXPIRY = Duration.hours(1);

export const creditMonths = Effect.fn("Referrals.creditMonths")(function* creditMonths(userId: string, months: number) {
    const reader = yield* DatabaseReader;
    const writer = yield* DatabaseWriter;
    const now = yield* Clock.currentTimeMillis;
    const active = yield* activePro(userId);
    const reward = rewardFor(active);
    if (reward === "none") {
        return reward;
    }
    const row = yield* reader.table("referralRewards").get("by_userId", userId).pipe(Effect.catchTags(nullOnMissing));
    const bankedMonths = row?.bankedMonths ?? 0;
    const promoEndsAt = row?.promoEndsAt ?? null;
    const grantedEnd =
        active?.store === "PROMOTIONAL" ? Math.max(active.expiresAtMs ?? 0, promoEndsAt ?? 0) : promoEndsAt;
    const next =
        reward === "bank"
            ? { bankedMonths: bankedMonths + months, promoEndsAt }
            : { bankedMonths, promoEndsAt: stackedEnd(now, grantedEnd, months) };
    yield* row
        ? writer.table("referralRewards").patch(row._id, next)
        : writer.table("referralRewards").insert({ ...next, userId });
    if (reward === "bank" && bankedMonths === 0 && active?.expiresAtMs !== undefined) {
        const scheduler = yield* Scheduler;
        const delay = Duration.sum(Duration.millis(Math.max(0, active.expiresAtMs - now)), RELEASE_AFTER_EXPIRY);
        yield* scheduler.runAfter(delay, refs.internal.referrals.releaseBanked, { userId });
    }
    return reward;
});

export const scheduleGrant = Effect.fn("Referrals.scheduleGrant")(function* scheduleGrant(
    userId: string,
    delay: Duration.Duration = Duration.zero
) {
    const scheduler = yield* Scheduler;
    yield* scheduler.runAfter(delay, refs.internal.referrals.grant, { attempt: 0, userId });
});

export const noteLoggedDay = Effect.fn("Referrals.noteLoggedDay")(function* noteLoggedDay(userId: string) {
    const reader = yield* DatabaseReader;
    const writer = yield* DatabaseWriter;
    const referral = yield* reader
        .table("referrals")
        .get("by_referredId", userId)
        .pipe(Effect.catchTags(nullOnMissing));
    if (referral === null || referral.status !== "counting") {
        return;
    }
    const now = yield* Clock.currentTimeMillis;
    const counted = countDay(referral, now);
    if (counted === null) {
        return;
    }
    if (counted.daysLogged < REFERRAL_DAYS_TO_EARN) {
        yield* writer.table("referrals").patch(referral._id, counted);
        return;
    }
    const earnedThisYear = yield* reader
        .table("referrals")
        .index("by_referrerId_and_rewardedAt", (q) =>
            q.eq("referrerId", referral.referrerId).gt("rewardedAt", yearStart(now))
        )
        .take(REFERRAL_YEARLY_CAP);
    if (earnedThisYear.length >= REFERRAL_YEARLY_CAP) {
        yield* writer.table("referrals").patch(referral._id, { ...counted, status: "capped" });
        return;
    }
    const reward = yield* creditMonths(referral.referrerId, 1);
    if (reward === "none") {
        yield* writer.table("referrals").patch(referral._id, { ...counted, status: "lifetime" });
        return;
    }
    yield* writer.table("referrals").patch(referral._id, { ...counted, rewardedAt: now, status: "rewarded" });
    if (reward === "grant") {
        yield* scheduleGrant(referral.referrerId);
    }
});

export const GRANT_RETRY_MINUTES = [1, 5, 30, 120, 720] as const;

const TOO_MANY_REQUESTS = 429;
const FIRST_SERVER_ERROR = 500;

export function grantWorthRetrying(error: { readonly reason: string; readonly status?: number }): boolean {
    if (error.reason !== "status") {
        return error.reason === "transport";
    }
    const status = error.status ?? 0;
    return status === TOO_MANY_REQUESTS || status >= FIRST_SERVER_ERROR;
}
