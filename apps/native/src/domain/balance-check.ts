import { decimalsFor } from "@outlayr/money/currency";
import { roundMoney } from "@outlayr/money/round";

import { daysBetween, startOfLocalDay } from "./local-day";

export const STALE_AFTER_DAYS = 7;

export type CheckedAge =
    | { state: "never" }
    | { state: "today" }
    | { state: "yesterday" }
    | { days: number; state: "daysAgo" | "stale" };

/** Counts local calendar days, so a check at 23:50 reads "yesterday" ten minutes into the next day. */
export function checkedAge(checkedAt: Date | null, nowMs: number): CheckedAge {
    if (checkedAt === null) {
        return { state: "never" };
    }
    const days = daysBetween(startOfLocalDay(checkedAt.getTime()), startOfLocalDay(nowMs));
    // A check stamped by a phone whose clock runs ahead is still a check from today.
    if (days <= 0) {
        return { state: "today" };
    }
    if (days === 1) {
        return { state: "yesterday" };
    }
    return { days, state: days > STALE_AFTER_DAYS ? "stale" : "daysAgo" };
}

/** Both figures are signed the way the account shows them: an owed card or an overdrawn account is negative. */
export function balanceDifference(balance: number, shown: number, currency: string): number {
    return roundMoney(shown - balance, decimalsFor(currency));
}
