import type { ReferralOverview } from "@outlayr/backend/confect/referrals.spec";

export { earnedThisYear, monthsEarned, rewardsToAnnounce } from "@outlayr/money/referrals";

export type ReferredFriend = ReferralOverview["friends"][number];
