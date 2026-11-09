import { REFERRAL_CAP_WINDOW_MS } from "./contract";

const ANNOUNCE_WINDOW_MS = 30 * 86_400_000;

export function monthsEarned(friends: readonly { readonly status: string }[]): number {
    return friends.filter((friend) => friend.status === "rewarded").length;
}

export function earnedThisYear(friends: readonly { readonly rewardedAt: number | null }[], now: number): number {
    return friends.filter((friend) => friend.rewardedAt !== null && friend.rewardedAt > now - REFERRAL_CAP_WINDOW_MS)
        .length;
}

export function rewardsToAnnounce<Friend extends { readonly rewardedAt: number | null }>(
    friends: readonly Friend[],
    seenAt: number,
    now: number
): Friend[] {
    const since = Math.max(seenAt, now - ANNOUNCE_WINDOW_MS);
    return friends.filter((friend) => friend.rewardedAt !== null && friend.rewardedAt > since);
}
