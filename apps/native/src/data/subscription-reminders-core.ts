import { addDays, startOfDay } from "@outlayr/money/calendar";
import { anchorDayOf, nextLanding, RECURRING_TYPE } from "@outlayr/money/recurrence";
import { and, eq, gt, isNotNull, isNull } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { Database } from "@/db/client";
import { accounts, categories, transactions } from "@/db/schema";
import { DEFAULT_CURRENCY } from "@/domain/money";
import type { TimeOfDay } from "@/domain/reminder";
import { normalizeLead, reminderFireAt, reminderPlan } from "@/domain/subscription-reminder";
import type { ArmedReminder, ReminderCandidate } from "@/domain/subscription-reminder";

import { getMeta, META_KEYS } from "./app-meta-core";
import { occurrenceId } from "./recurrence-backfill";

const SubscriptionRemindersRead = Schema.Literals(["currency", "rows"]);

export class SubscriptionRemindersError extends Schema.TaggedError<SubscriptionRemindersError>()(
    "SubscriptionRemindersError",
    { cause: Schema.Defect(), read: SubscriptionRemindersRead }
) {
    override get message(): string {
        return `Subscription reminders ${this.read} read failed`;
    }
}

const query = <A>(read: typeof SubscriptionRemindersRead.Type, run: () => PromiseLike<A>) =>
    Effect.tryPromise({ catch: (cause) => new SubscriptionRemindersError({ cause, read }), try: run });

export interface SubscriptionReminderCandidate extends ReminderCandidate {
    account: string | null;
    amount: number;
    amountUsd: number | null;
    category: string | null;
    chargeId: string;
    /** Resolved, never null: a row that stored none adopts the ledger's. */
    currency: string;
    income: boolean;
    note: string;
}

const CANDIDATE_COLUMNS = {
    account: accounts.name,
    amount: transactions.amount,
    amountUsd: transactions.amountUsd,
    category: categories.name,
    currency: transactions.currency,
    date: transactions.date,
    id: transactions.id,
    income: transactions.income,
    note: transactions.note,
    recurringAnchorDay: transactions.recurringAnchorDay,
    recurringCoefficient: transactions.recurringCoefficient,
    recurringEndDate: transactions.recurringEndDate,
    recurringType: transactions.recurringType,
    reminderLeadDays: transactions.reminderLeadDays,
} as const;

/**
 * `recurringType > 0` and a null `deletedAt` are load-bearing: `reminderLeadDays` rides whichever row carries the
 * chain's schedule, so it cannot tell a live carrier from a tombstone or retired occurrence (see `db/schema.ts`).
 */
export const reminderCandidates = Effect.fn("SubscriptionReminders.reminderCandidates")(function* reminderCandidates(
    db: Database,
    now: Date,
    time: TimeOfDay
) {
    const rows = yield* query("rows", () =>
        db
            .select(CANDIDATE_COLUMNS)
            .from(transactions)
            .leftJoin(categories, eq(categories.id, transactions.categoryId))
            .leftJoin(accounts, and(eq(accounts.id, transactions.accountId), isNull(accounts.deletedAt)))
            .where(
                and(
                    gt(transactions.recurringType, RECURRING_TYPE.none),
                    isNull(transactions.deletedAt),
                    isNotNull(transactions.reminderLeadDays)
                )
            )
    );
    if (rows.length === 0) {
        return [];
    }

    // Mirrors `transactions-core`: a null `currency` means the ledger's, so a notice resolves it the same way.
    const ledgerCurrency = (yield* query("currency", () => getMeta(db, META_KEYS.currency))) ?? DEFAULT_CURRENCY;

    const candidates: SubscriptionReminderCandidate[] = rows.flatMap((row) => {
        const landingAfter = (day: Date) =>
            nextLanding(
                row.date,
                row.recurringType,
                row.recurringCoefficient,
                row.recurringEndDate,
                day,
                anchorDayOf(row)
            );
        const lead = normalizeLead(row.reminderLeadDays);
        const soonest = landingAfter(addDays(now, -1));
        const charge =
            soonest !== null && lead !== null && reminderFireAt(soonest, lead, time).getTime() > now.getTime()
                ? soonest
                : landingAfter(now);
        if (charge == null) {
            return [];
        }
        return [
            {
                account: row.account,
                amount: row.amount,
                amountUsd: row.amountUsd,
                category: row.category,
                chargeId: charge.getTime() === row.date.getTime() ? row.id : occurrenceId(row.id, charge),
                currency: row.currency ?? ledgerCurrency,
                income: row.income,
                landing: startOfDay(charge),
                leadDays: row.reminderLeadDays,
                localId: row.id,
                note: row.note,
            },
        ];
    });
    return candidates;
});

export interface PendingSubscriptionReminder extends ArmedReminder {
    account: string | null;
    amount: number;
    amountUsd: number | null;
    category: string | null;
    chargeId: string;
    currency: string;
    income: boolean;
    landing: Date;
    note: string;
}

/** Read-only: only the caller touches the queue, after comparing this against what iOS already holds. */
export const pendingReminderPlan = Effect.fn("SubscriptionReminders.pendingReminderPlan")(function* pendingReminderPlan(
    db: Database,
    now: Date,
    time: TimeOfDay,
    cap?: number
) {
    const candidates = yield* reminderCandidates(db, now, time);
    const byLocalId = new Map(candidates.map((candidate) => [candidate.localId, candidate]));
    const plan: PendingSubscriptionReminder[] = reminderPlan({ candidates, cap, now, time }).arm.flatMap((armed) => {
        const candidate = byLocalId.get(armed.localId);
        if (candidate === undefined) {
            return [];
        }
        return [
            {
                ...armed,
                account: candidate.account,
                amount: candidate.amount,
                amountUsd: candidate.amountUsd,
                category: candidate.category,
                chargeId: candidate.chargeId,
                currency: candidate.currency,
                income: candidate.income,
                landing: candidate.landing,
                note: candidate.note,
            },
        ];
    });
    return plan;
});
