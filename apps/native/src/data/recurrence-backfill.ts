import { startOfDay } from "@outlayr/money/calendar";
import { canonicalOccurrence, occurrenceFeeId, occurrenceRow, successorRow } from "@outlayr/money/occurrence";
import { RECURRING_TYPE, anchorDayOf, nextDate } from "@outlayr/money/recurrence";
import { and, eq, gt, isNotNull, isNull } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { Database } from "@/db/client";
import { transactions } from "@/db/schema";
import { transaction } from "@/db/transaction";
import { DEFAULT_CURRENCY } from "@/domain/money";

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

const loadSource = Effect.fn("RecurrenceBackfill.loadSource")(function* loadSource(db: Database, id: string) {
    const rows = yield* query("backfill", () => db.select().from(transactions).where(eq(transactions.id, id)).limit(1));
    return rows[0] ?? null;
});

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
        occurrenceFeeId,
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

    const occurrenceAt = (holding: Date, carriesSchedule: boolean) =>
        occurrenceRow(source, holding, carriesSchedule, now);

    const next = nextDate(source.date, type, coefficient, anchorDay) ?? source.date;
    const pending: ReturnType<typeof occurrenceAt>[] = [];

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

    // Built outside the write transaction because the rate lookup reads.
    const lookup = localRateLookup(db);
    const display = (yield* getMeta(db, META_KEYS.currency)) ?? DEFAULT_CURRENCY;
    const canonicalized = yield* Effect.all(
        pending.map((row) => canonicalOccurrence(lookup, row, display).pipe(Effect.mapError(failedAt("backfill")))),
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

export const scheduleSuccessor = Effect.fn("RecurrenceBackfill.scheduleSuccessor")(function* scheduleSuccessor(
    db: Database,
    carrier: TransactionRow,
    now: Date
) {
    const row = successorRow(carrier, now);
    if (row === null) {
        return null;
    }
    const display = (yield* getMeta(db, META_KEYS.currency)) ?? DEFAULT_CURRENCY;
    return yield* canonicalOccurrence(localRateLookup(db), row, display).pipe(Effect.mapError(failedAt("successor")));
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
