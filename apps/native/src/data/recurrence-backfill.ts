import { firstOfMonth, startOfDay } from "@outlayr/money/calendar";
import { canonicalUsd } from "@outlayr/money/canonical-usd";
import { utcDateString } from "@outlayr/money/dates";
import type { EntryRateType } from "@outlayr/money/rates";
import { RECURRING_TYPE, anchorDayOf, nextDate, nextLanding } from "@outlayr/money/recurrence";
import { and, eq, gt, isNotNull, isNull } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { Database } from "@/db/client";
import { transactions } from "@/db/schema";
import { transaction } from "@/db/transaction";
import { DEFAULT_CURRENCY } from "@/domain/money";
import { uuidV5 } from "@/domain/uuid5";

import { getMeta, META_KEYS, setMeta } from "./app-meta-core";
import { occurrenceFees } from "./card-fees-core";
import {
    isLiveLogoCandidate,
    isLogoCandidate,
    LOGO_CANDIDATE_KEEP_MS,
    refreshLogoCandidate,
    rememberLogoCandidates,
} from "./logo-backfill-state";
import { localRateLookup } from "./rates";

type TransactionRow = typeof transactions.$inferSelect;
type TransactionInsert = typeof transactions.$inferInsert;

const RecurrenceBackfillOperation = Schema.Literals(["backfill", "insert", "repair", "successor"]);

export class RecurrenceBackfillError extends Schema.TaggedError<RecurrenceBackfillError>()("RecurrenceBackfillError", {
    cause: Schema.Defect(),
    operation: RecurrenceBackfillOperation,
}) {
    override get message(): string {
        return `Recurrence ${this.operation} failed`;
    }
}

const failedAt = (operation: typeof RecurrenceBackfillOperation.Type) => (cause: unknown) =>
    new RecurrenceBackfillError({ cause, operation });

const query = <A>(operation: typeof RecurrenceBackfillOperation.Type, run: () => PromiseLike<A>) =>
    Effect.tryPromise({ catch: failedAt(operation), try: run });

export function recurrenceRateType(rateType: string | null | undefined): EntryRateType {
    if (rateType === "custom") {
        return "custom";
    }
    if (rateType === "eur_reference") {
        return "eur_reference";
    }
    return "official";
}

const loadSource = Effect.fn("RecurrenceBackfill.loadSource")(function* loadSource(db: Database, id: string) {
    const rows = yield* query("backfill", () => db.select().from(transactions).where(eq(transactions.id, id)).limit(1));
    return rows[0] ?? null;
});

// Never change: a different namespace gives upgraded devices different ids for occurrences the others already hold.
const OCCURRENCE_NAMESPACE = "0f2b9f1e-6d3a-4c58-9a71-2c8f5d6e4b31";

// Derived, not minted, so two synced devices sweeping one schedule compute one id and the second upserts. The UTC
// day, not the local one, or devices in different zones derive two ids for one charge.
export function occurrenceId(parentLocalId: string, holding: Date): string {
    return uuidV5(`${parentLocalId}:${utcDateString(holding.getTime())}`, OCCURRENCE_NAMESPACE);
}

const liveLogo = Effect.fn("RecurrenceBackfill.liveLogo")(function* liveLogo(db: Database, carrierId: string) {
    const [row] = yield* query("insert", () =>
        db
            .select({ imageColor: transactions.imageColor, imageUri: transactions.imageUri })
            .from(transactions)
            .where(eq(transactions.id, carrierId))
    );
    return row?.imageUri == null ? null : { imageColor: row.imageColor, imageUri: row.imageUri };
});

// Occurrences bypass `transactionsRepo.create`, so this registers logo candidates itself, inherited from the live
// carrier and never recomputed from a bare-looking copy. Conflicts are ignored: an existing id is the same charge from
// another device and may carry an edit or deletion, so only the ids the insert returns register.
export const insertOccurrences = Effect.fn("RecurrenceBackfill.insertOccurrences")(function* insertOccurrences(
    db: Database,
    carrierId: string,
    rows: readonly TransactionInsert[],
    now: Date
) {
    if (rows.length === 0) {
        return;
    }
    // Read before anything moves the carrier; a logo the backfill painted on it meanwhile is ours, and rows take it.
    const inherit = yield* isLiveLogoCandidate(db, carrierId);
    const live = yield* liveLogo(db, carrierId);
    const written = rows.map((row) =>
        live !== null && isLogoCandidate(row) ? { ...row, imageColor: live.imageColor, imageUri: live.imageUri } : row
    );
    const inserted = yield* query("insert", () =>
        db.insert(transactions).values(written).onConflictDoNothing().returning({ id: transactions.id })
    );
    const created = new Set(inserted.map((row) => row.id));
    const fees = yield* occurrenceFees(
        db,
        carrierId,
        rows.filter((row) => created.has(row.id)),
        (occurrence) => uuidV5(`${occurrence}:fee`, OCCURRENCE_NAMESPACE),
        now
    );
    if (fees.length > 0) {
        yield* query("insert", () => db.insert(transactions).values(fees).onConflictDoNothing());
    }
    if (!inherit) {
        return;
    }
    const ids = rows.filter((row) => created.has(row.id) && isLogoCandidate(row)).map((row) => row.id);
    if (ids.length > 0) {
        // Occurrences are written with `updatedAt: now`, the stamp the backfill matches against.
        yield* rememberLogoCandidates(db, ids, now.getTime(), LOGO_CANDIDATE_KEEP_MS);
    }
});

function occurrenceRow(source: TransactionRow, holding: Date, carriesSchedule: boolean, now: Date): TransactionInsert {
    return {
        accountId: source.accountId,
        amount: source.amount,
        categoryId: source.categoryId,
        currency: source.currency,
        customColor: source.customColor,
        date: holding,
        day: startOfDay(holding),
        deletedAt: null,
        details: source.details,
        emoji: source.emoji,
        exchangeRateType: source.exchangeRateType ?? "official",
        icon: source.icon,
        id: occurrenceId(source.id, holding),
        imageColor: source.imageColor,
        imageKey: source.imageKey,
        imageUri: source.imageUri,
        income: source.income,
        month: firstOfMonth(holding),
        note: source.note,
        onceRecurring: true,
        recurringAnchorDay: carriesSchedule ? anchorDayOf(source) : null,
        recurringCoefficient: carriesSchedule ? source.recurringCoefficient : 1,
        recurringEndDate: carriesSchedule ? source.recurringEndDate : null,
        recurringType: carriesSchedule ? source.recurringType : RECURRING_TYPE.none,
        reminderLeadDays: carriesSchedule ? source.reminderLeadDays : null,
        updatedAt: now,
    };
}

export const backfillRecurring = Effect.fn("RecurrenceBackfill.backfillRecurring")(function* backfillRecurring(
    db: Database,
    id: string,
    now: Date = new Date()
) {
    const source = yield* loadSource(db, id);
    if (source == null || !source.onceRecurring || source.recurringType === RECURRING_TYPE.none) {
        return;
    }

    const type = source.recurringType;
    const coefficient = source.recurringCoefficient;
    const anchorDay = anchorDayOf(source);
    const today = startOfDay(now);
    const endLimit = source.recurringEndDate == null ? null : startOfDay(source.recurringEndDate);
    const withinEndLimit = (d: Date): boolean => endLimit == null || startOfDay(d).getTime() <= endLimit.getTime();

    const occurrenceAt = (holding: Date, carriesSchedule: boolean): TransactionInsert =>
        occurrenceRow(source, holding, carriesSchedule, now);

    const next = nextDate(source.date, type, coefficient, anchorDay) ?? source.date;
    const pending: TransactionInsert[] = [];

    // Inherits the schedule only when its next charge is strictly ahead of today and itself, or the next sweep gets
    // the same charge forever.
    const carriesFrom = (holding: Date, advanced: Date | null): boolean =>
        advanced != null &&
        startOfDay(advanced).getTime() > today.getTime() &&
        startOfDay(advanced).getTime() > startOfDay(holding).getTime() &&
        withinEndLimit(advanced);

    if (startOfDay(next).getTime() < today.getTime()) {
        let holding = next;
        while (startOfDay(holding).getTime() <= today.getTime() && withinEndLimit(holding)) {
            const advanced = nextDate(holding, type, coefficient, anchorDay);
            pending.push(occurrenceAt(holding, carriesFrom(holding, advanced)));
            if (advanced == null) {
                break;
            }
            if (startOfDay(advanced).getTime() <= startOfDay(holding).getTime()) {
                break;
            }
            holding = advanced;
        }
    } else if (startOfDay(next).getTime() === today.getTime()) {
        if (withinEndLimit(next)) {
            const advanced = nextDate(next, type, coefficient, anchorDay);
            pending.push(occurrenceAt(next, carriesFrom(next, advanced)));
        }
    } else {
        return;
    }

    // Each occurrence is canonicalized at ITS OWN date, or January's payment is priced at December's rate. Built
    // outside the write transaction because the rate lookup reads.
    const lookup = localRateLookup(db);
    const display = (yield* getMeta(db, META_KEYS.currency)) ?? DEFAULT_CURRENCY;
    const canonicalized = yield* Effect.all(
        pending.map((row) =>
            query("backfill", () =>
                canonicalUsd(lookup, {
                    amount: row.amount,
                    currency: row.currency ?? null,
                    date: row.date,
                    displayCurrency: display,
                    exchangeRate: null,
                    exchangeRateType: recurrenceRateType(row.exchangeRateType),
                })
            ).pipe(Effect.map((canonical) => ({ ...row, ...canonical })))
        ),
        { concurrency: "unbounded" }
    );

    // Atomic: dying between insert and retire leaves the source recurring, so the next launch rewrites every charge.
    yield* transaction(
        db,
        Effect.gen(function* write() {
            yield* insertOccurrences(db, source.id, canonicalized, now);
            yield* refreshLogoCandidate(db, source.id, now.getTime());
            yield* query("backfill", () =>
                db
                    .update(transactions)
                    .set({
                        recurringType: RECURRING_TYPE.none,
                        reminderLeadDays: null,
                        updatedAt: now,
                    })
                    .where(eq(transactions.id, source.id))
            );
        }),
        failedAt("backfill")
    );
});

// Ids are resolved up front: each backfill hands the schedule to a new future-dated row a re-read would pick up.
export const backfillAllRecurring = Effect.fn("RecurrenceBackfill.backfillAllRecurring")(function* backfillAllRecurring(
    db: Database,
    now: Date = new Date()
) {
    const live = yield* query("backfill", () =>
        db
            .select({ id: transactions.id })
            .from(transactions)
            .where(and(gt(transactions.recurringType, RECURRING_TYPE.none), isNull(transactions.deletedAt)))
    );

    // Every iteration writes through the one SQLite connection these rows share, so the sweep advances one chain at a
    // time.
    for (const row of live) {
        yield* backfillRecurring(db, row.id, now);
    }
});

const withCanonicalUsd = Effect.fn("RecurrenceBackfill.withCanonicalUsd")(function* withCanonicalUsd(
    db: Database,
    row: TransactionInsert
) {
    const display = (yield* getMeta(db, META_KEYS.currency)) ?? DEFAULT_CURRENCY;
    const canonical = yield* query("successor", () =>
        canonicalUsd(localRateLookup(db), {
            amount: row.amount,
            currency: row.currency ?? null,
            date: row.date,
            displayCurrency: display,
            exchangeRate: null,
            exchangeRateType: recurrenceRateType(row.exchangeRateType),
        })
    );
    return { ...row, ...canonical };
});

// Anchored at the next occurrence after today, so a stale carrier resumes forward instead of back-charging. A
// future-dated carrier is the pending charge itself, so removing it means stop: no successor.
export const scheduleSuccessor = Effect.fn("RecurrenceBackfill.scheduleSuccessor")(function* scheduleSuccessor(
    db: Database,
    carrier: TransactionRow,
    now: Date
) {
    if (!carrier.onceRecurring || carrier.recurringType === RECURRING_TYPE.none) {
        return null;
    }
    if (startOfDay(carrier.date).getTime() > startOfDay(now).getTime()) {
        return null;
    }
    const landing = nextLanding(
        carrier.date,
        carrier.recurringType,
        carrier.recurringCoefficient,
        carrier.recurringEndDate,
        now,
        anchorDayOf(carrier)
    );
    if (landing == null) {
        return null;
    }
    return yield* withCanonicalUsd(db, occurrenceRow(carrier, landing, true, now));
});

// One-shot repair for carriers soft-deleted before the delete handover existed; the tombstone still holds the
// schedule. Other orphaned chains are unrecoverable: no column links a chain's rows.
export const repairOrphanedRecurrence = Effect.fn("RecurrenceBackfill.repairOrphanedRecurrence")(
    function* repairOrphanedRecurrence(db: Database, now: Date = new Date()) {
        if ((yield* getMeta(db, META_KEYS.recurrenceRepaired)) === "true") {
            return 0;
        }

        const orphaned = yield* query("repair", () =>
            db
                .select()
                .from(transactions)
                .where(
                    and(
                        isNotNull(transactions.deletedAt),
                        eq(transactions.onceRecurring, true),
                        gt(transactions.recurringType, RECURRING_TYPE.none)
                    )
                )
        );

        let reinstated = 0;
        // Each carrier is reinstated inside its own write transaction on the one SQLite connection, and overlapping
        // transactions on it would interleave.
        for (const carrier of orphaned) {
            const successor = yield* scheduleSuccessor(db, carrier, now);
            yield* transaction(
                db,
                Effect.gen(function* write() {
                    if (successor != null) {
                        yield* insertOccurrences(db, carrier.id, [successor], now);
                    }
                    yield* query("repair", () =>
                        db
                            .update(transactions)
                            .set({
                                recurringType: RECURRING_TYPE.none,
                                reminderLeadDays: null,
                                updatedAt: now,
                            })
                            .where(eq(transactions.id, carrier.id))
                    );
                }),
                failedAt("repair")
            );
            if (successor != null) {
                reinstated += 1;
            }
        }

        yield* setMeta(db, META_KEYS.recurrenceRepaired, "true");
        return reinstated;
    }
);
