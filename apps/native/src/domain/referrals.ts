import type { ReferralOverview } from "@outlayr/backend/confect/referrals.spec";
import { REFERRAL_CAP_WINDOW_MS } from "@outlayr/money/contract";

export type ReferredFriend = ReferralOverview["friends"][number];

const ANNOUNCE_WINDOW_MS = 30 * 86_400_000;

export function monthsEarned(friends: readonly ReferredFriend[]): number {
    return friends.filter((friend) => friend.status === "rewarded").length;
}

export function earnedThisYear(friends: readonly ReferredFriend[], now: number): number {
    return friends.filter((friend) => friend.rewardedAt !== null && friend.rewardedAt > now - REFERRAL_CAP_WINDOW_MS)
        .length;
}

export function rewardsToAnnounce(friends: readonly ReferredFriend[], seenAt: number, now: number): ReferredFriend[] {
    const since = Math.max(seenAt, now - ANNOUNCE_WINDOW_MS);
    return friends.filter((friend) => friend.rewardedAt !== null && friend.rewardedAt > since);
}
