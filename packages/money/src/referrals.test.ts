import { expect, test } from "vite-plus/test";

import { REFERRAL_CAP_WINDOW_MS } from "./contract";
import { earnedThisYear, rewardsToAnnounce } from "./referrals";

const DAY = 86_400_000;
const NOW = 1_800_000_000_000;

test("counts a reward against the cap only inside the rolling window", () => {
    const friends = [{ rewardedAt: NOW - REFERRAL_CAP_WINDOW_MS }, { rewardedAt: NOW - REFERRAL_CAP_WINDOW_MS + 1 }];
    expect(earnedThisYear([...friends, { rewardedAt: null }], NOW)).toBe(1);
});

test("announces only rewards newer than both the seen mark and the 30 day window", () => {
    const old = { rewardedAt: NOW - 31 * DAY };
    const seen = { rewardedAt: NOW - 5 * DAY };
    const fresh = { rewardedAt: NOW - DAY };
    expect(rewardsToAnnounce([old, seen, fresh, { rewardedAt: null }], NOW - 5 * DAY, NOW)).toStrictEqual([fresh]);
    expect(rewardsToAnnounce([old, seen], 0, NOW)).toStrictEqual([seen]);
});
