import { toAccountKind } from "@outlayr/money/account-kind";
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

export interface BalanceAdjustment {
    difference: number;
    entry: { amount: number; income: boolean } | null;
}

/**
 * `shown` is the figure as the bank prints it, which for a card is what is owed. A liability is stored negative, so
 * the same typed figure lands on the other side of zero.
 */
export function balanceAdjustment(input: {
    balance: number;
    currency: string;
    kind: string | null | undefined;
    shown: number;
}): BalanceAdjustment {
    const target = toAccountKind(input.kind) === "liability" ? -input.shown : input.shown;
    const difference = roundMoney(target - input.balance, decimalsFor(input.currency));
    if (difference === 0) {
        return { difference: 0, entry: null };
    }
    return { difference, entry: { amount: Math.abs(difference), income: difference > 0 } };
}
