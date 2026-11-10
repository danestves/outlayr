import { addDays, deviceCalendar, startOfDay } from "@outlayr/money/calendar";
import { keptFeeValue } from "@outlayr/money/card-fee";
import type { CardFeeInput } from "@outlayr/money/card-fee";
import { entryRow, keptAccount, keptCanonical, keptLead } from "@outlayr/money/entry-row";
import type { EntryInput } from "@outlayr/money/entry-row";
import { merchantKey } from "@outlayr/money/merchant-key";
import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import { and, asc, count, desc, eq, gt, gte, inArray, isNotNull, isNull, lt, lte, sql } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { Database } from "@/db/client";
import { accounts, categories, installments, transactions } from "@/db/schema";
import { transaction } from "@/db/transaction";
import { newId } from "@/domain/ids";
import type { PaidVia } from "@/domain/paid-via";
import type { LastEntry } from "@/domain/reminder";

import { Meta } from "./app-meta-core";
import type { SpendDb } from "./budget-spent";
import { cardFeeFor, cardFeeValues, suggestedCardFee } from "./card-fees-core";
import { getCategoryById } from "./categories-core";
import { restoreEntry, tombstone } from "./deletion-plan";
import { ERASED_DATE } from "./erase-core";
import {
    forgetLogoDismissal,
    isLogoCandidate,
    LOGO_CANDIDATE_KEEP_MS,
    refreshLogoCandidate,
    rememberLogoCandidate,
    rememberLogoDismissal,
} from "./logo-backfill-state";
import { localRateLookup } from "./rates";
import { insertOccurrences, scheduleSuccessor } from "./recurrence-backfill";
import { restoreStamp } from "./sync-engine-core";

export const LOG_PAGE_DAYS = 30;

/** Narrow on purpose: `details` is unbounded free text and the list never paints it. */
export const LOG_COLUMNS = {
    amount: transactions.amount,
    amountUsd: transactions.amountUsd,
    categoryId: transactions.categoryId,
    currency: transactions.currency,
    customColor: transactions.customColor,
    date: transactions.date,
    day: transactions.day,
    emoji: transactions.emoji,
    exchangeRate: transactions.exchangeRate,
    exchangeRateType: transactions.exchangeRateType,
    feeForId: transactions.feeForId,
    icon: transactions.icon,
    id: transactions.id,
    imageColor: transactions.imageColor,
    imageUri: transactions.imageUri,
    income: transactions.income,
    installmentId: transactions.installmentId,
    note: transactions.note,
    recurringAnchorDay: transactions.recurringAnchorDay,
    recurringCoefficient: transactions.recurringCoefficient,
    recurringEndDate: transactions.recurringEndDate,
    recurringType: transactions.recurringType,
    transferId: transactions.transferId,
    unreviewed: transactions.unreviewed,
} as const;

function visibleAt(nowMs: number) {
    return and(isNull(transactions.deletedAt), lte(transactions.date, new Date(nowMs)));
}

/** Measured in days, not rows: the Log prints a subtotal per day, and a row LIMIT would cut a day in half. */
export function logWindowDaysQuery(db: SpendDb, nowMs: number, days: number) {
    return db
        .selectDistinct({ day: transactions.day })
        .from(transactions)
        .where(visibleAt(nowMs))
        .orderBy(desc(transactions.day))
        .limit(days);
}

/** COUNT in SQLite: the settings screens only read the number, so moving all the ledger's ids across the
 * bridge buys nothing.
 */
export function ledgerSizeQuery(db: SpendDb) {
    return db.select({ live: count() }).from(transactions).where(isNull(transactions.deletedAt));
}

const DELETED_COLUMNS = {
    amount: transactions.amount,
    currency: transactions.currency,
    date: transactions.date,
    deletedAt: transactions.deletedAt,
    id: transactions.id,
    income: transactions.income,
    installmentId: transactions.installmentId,
    note: transactions.note,
} as const;

export type DeletedTransaction = {
    [K in keyof typeof DELETED_COLUMNS]: Transaction[K];
};

/**
 * Unbounded: the only way back for a soft-deleted entry. Excludes erased rows, transfer fees (a lone fee would
 * charge a transfer that no longer exists), late fees deleted with their order and entries on deleted accounts.
 */
export function deletedTransactionsQuery(db: SpendDb) {
    return db
        .select(DELETED_COLUMNS)
        .from(transactions)
        .where(
            and(
                isNotNull(transactions.deletedAt),
                gt(transactions.date, ERASED_DATE),
                isNull(transactions.transferId),
                sql`(${transactions.feeForId} IS NULL OR NOT EXISTS (SELECT 1 FROM ${transactions} AS purchase WHERE purchase.id = ${transactions.feeForId} AND purchase.deletedAt IS NOT NULL))`,
                sql`(${transactions.installmentId} IS NULL OR NOT EXISTS (SELECT 1 FROM ${installments} WHERE ${installments.id} = ${transactions.installmentId} AND ${installments.deletedAt} = ${transactions.deletedAt}))`,
                sql`NOT EXISTS (SELECT 1 FROM ${accounts} WHERE ${accounts.id} = ${transactions.accountId} AND ${accounts.deletedAt} IS NOT NULL)`
            )
        )
        .orderBy(desc(transactions.deletedAt), desc(transactions.date));
}

export function logWindowRowsQuery(db: SpendDb, nowMs: number, floorMs: number | null) {
    return db
        .select(LOG_COLUMNS)
        .from(transactions)
        .where(floorMs == null ? visibleAt(nowMs) : and(visibleAt(nowMs), gte(transactions.day, new Date(floorMs))))
        .orderBy(desc(transactions.day), desc(transactions.date), asc(transactions.feeForId));
}

/** A calendar line rather than a count of days, so a write never moves the head/tail split. */
export const logSplitMs = (nowMs: number): number => addDays(startOfDay(new Date(nowMs)), -LOG_PAGE_DAYS).getTime();

export function logTailRowsQuery(db: SpendDb, floorMs: number | null, splitMs: number) {
    return db
        .select(LOG_COLUMNS)
        .from(transactions)
        .where(
            and(
                isNull(transactions.deletedAt),
                gte(transactions.day, new Date(floorMs ?? splitMs)),
                lt(transactions.day, new Date(splitMs))
            )
        )
        .orderBy(desc(transactions.day), desc(transactions.date), asc(transactions.feeForId));
}

export type Transaction = typeof transactions.$inferSelect;

export interface TransactionInput extends EntryInput {
    fee?: CardFeeInput | null;
    paidVia?: PaidVia | null;
}

const TransactionsOperation = Schema.Literals([
    "attachAccount",
    "create",
    "hasEntries",
    "lastEntry",
    "remove",
    "restore",
    "row",
    "stopRecurring",
    "update",
]);

export class TransactionsError extends Schema.TaggedError<TransactionsError>()("TransactionsError", {
    cause: Schema.Defect(),
    operation: TransactionsOperation,
}) {
    override get message(): string {
        return `Transaction ${this.operation} failed`;
    }
}

const failedAt = (operation: typeof TransactionsOperation.Type) => (cause: unknown) =>
    new TransactionsError({ cause, operation });

const query = <A>(operation: typeof TransactionsOperation.Type, run: () => PromiseLike<A>) =>
    Effect.tryPromise({ catch: failedAt(operation), try: run });

const read = <A>(operation: typeof TransactionsOperation.Type, run: () => A) =>
    Effect.try({ catch: failedAt(operation), try: run });

type FeeValues = Effect.Success<ReturnType<typeof cardFeeValues>>;

const writeFee = Effect.fn("Transactions.writeFee")(function* writeFee(
    db: Database,
    purchaseId: string,
    values: FeeValues | null,
    now: Date,
    operation: typeof TransactionsOperation.Type,
    moneyKept = false
) {
    const existing = yield* read(operation, () => cardFeeFor(db, purchaseId));
    if (values === null) {
        if (existing !== null) {
            yield* query(operation, () =>
                db.update(transactions).set({ deletedAt: now, updatedAt: now }).where(eq(transactions.id, existing.id))
            );
        }
        return;
    }
    if (existing === null) {
        yield* query(operation, () => db.insert(transactions).values({ ...values, id: newId(), updatedAt: now }));
        return;
    }
    yield* query(operation, () =>
        db
            .update(transactions)
            .set({ ...values, ...keptFeeValue(existing, values, moneyKept), updatedAt: now })
            .where(eq(transactions.id, existing.id))
    );
});

const toRow = Effect.fn("Transactions.toRow")(function* toRow(db: Database, id: string, input: TransactionInput) {
    const { categoryId } = input;
    const category =
        input.note.trim() === "" && categoryId != null
            ? yield* read("row", () => getCategoryById(db, categoryId))
            : null;
    const currency = input.currency ?? (yield* displayCurrency(db));
    return yield* entryRow(localRateLookup(db), id, input, {
        calendar: deviceCalendar,
        categoryName: category?.name ?? null,
        currency,
        now: new Date(),
    }).pipe(Effect.mapError((cause) => new TransactionsError({ cause, operation: "row" })));
});

const displayCurrency = Effect.fn("Transactions.displayCurrency")(function* displayCurrency(db: Database) {
    return yield* Meta.get(db, "currency");
});

/**
 * The user taking the photo off, not a synced row still downloading (also a null path); only this clears
 * `imageKey`. A replaced photo keeps its old key until the uploader records the new one.
 */
function removesPhoto(previous: Transaction | null, next: typeof transactions.$inferInsert): boolean {
    return previous?.imageUri != null && next.imageUri == null;
}

/** Tells the logo backfill the user cleared the identity, or it would paint over that choice on the next launch. */
function clearsIdentity(previous: Transaction | null, next: typeof transactions.$inferInsert): boolean {
    const had =
        previous != null &&
        (previous.imageUri != null || previous.icon != null || previous.emoji != null || previous.customColor != null);
    const has = next.imageUri != null || next.icon != null || next.emoji != null || next.customColor != null;
    return had && !has;
}

export function accountTransactionsQuery(db: SpendDb, accountId: string) {
    return db
        .select(LOG_COLUMNS)
        .from(transactions)
        .where(and(isNull(transactions.deletedAt), eq(transactions.accountId, accountId)))
        .orderBy(desc(transactions.date), asc(transactions.feeForId));
}

export interface CreateOptions<E = never> {
    /**
     * Whether a named entry saved with its category tile becomes the logo backfill's to finish. The CSV import
     * passes false: its rows stay on the device, and one candidate write per row would make a big import quadratic.
     */
    logoCandidate?: boolean;
    inSameTransaction?: (id: string) => Effect.Effect<void, E>;
}

export const transactionsRepo = {
    create: Effect.fn("Transactions.create")(function* create<E = never>(
        db: Database,
        input: TransactionInput,
        options: CreateOptions<E> = {}
    ) {
        const id = newId();
        const row = yield* toRow(db, id, input);
        const fee = input.fee == null ? null : yield* cardFeeValues(db, id, row, input.fee);
        const { inSameTransaction } = options;
        const write = Effect.gen(function* write() {
            yield* query("create", () =>
                db
                    .insert(transactions)
                    .values(fee === null ? [row] : [row, { ...fee, id: newId(), updatedAt: row.updatedAt }])
            );
            if (inSameTransaction) {
                yield* inSameTransaction(id);
            }
        });
        yield* inSameTransaction ? transaction(db, write, failedAt("create")) : write;
        // Bookkeeping, so it cannot fail the save: a caller told otherwise would retry and write the row twice.
        // Judged on the caller's merchant, not `row.note`, which falls back to the category name.
        if (options.logoCandidate !== false && isLogoCandidate({ ...row, note: input.note })) {
            yield* rememberLogoCandidate(db, id, row.updatedAt.getTime(), LOGO_CANDIDATE_KEEP_MS).pipe(
                Effect.catchTags({
                    AppMetaError: (error) => Effect.logWarning("[outlayr] logo candidate not recorded", error),
                    CorruptMetaError: (error) => Effect.logWarning("[outlayr] logo candidate not recorded", error),
                })
            );
        }
        return id;
    }),

    markReviewed: Effect.fn("Transactions.markReviewed")(function* markReviewed(db: Database, ids: readonly string[]) {
        if (ids.length === 0) {
            return;
        }
        yield* query("update", () =>
            db
                .update(transactions)
                .set({ unreviewed: false })
                .where(inArray(transactions.id, [...ids]))
        );
    }),

    /**
     * Re-anchors the schedule on a successor first, since the newest occurrence holds it. The tombstone retires to
     * `none`, which is how deleting the pending charge stops a subscription.
     */
    remove: Effect.fn("Transactions.remove")(function* remove(db: Database, id: string, now: Date = new Date()) {
        const row = yield* read("remove", () => getTransactionById(db, id));
        const successor = row == null || row.deletedAt != null ? null : yield* scheduleSuccessor(db, row, now);

        yield* transaction(
            db,
            Effect.gen(function* write() {
                if (successor != null) {
                    // The successor's id derives from its schedule, so a peer that anchored it already holds this row.
                    yield* insertOccurrences(db, id, [successor], now);
                }
                yield* refreshLogoCandidate(db, id, now.getTime());
                yield* tombstone(db, "row", id, now);
            }),
            failedAt("remove")
        );
    }),

    /**
     * `restoredAt` lets the restore beat the tombstone everywhere (R1). `recurringType` stays retired, since deleting
     * the pending charge ends a subscription. Fees and entries on deleted accounts stay out, as in the deleted list.
     */
    restore: Effect.fn("Transactions.restore")(function* restore(db: Database, id: string, now: Date = new Date()) {
        yield* transaction(
            db,
            Effect.gen(function* write() {
                const previous = yield* read("restore", () => getTransactionById(db, id));
                const purchaseId = previous?.feeForId ?? null;
                const purchase = yield* read("restore", () =>
                    purchaseId === null ? null : getTransactionById(db, purchaseId)
                );
                const onDeletedAccount = yield* read(
                    "restore",
                    () =>
                        previous?.accountId != null &&
                        db
                            .select({ id: accounts.id })
                            .from(accounts)
                            .where(and(eq(accounts.id, previous.accountId), isNotNull(accounts.deletedAt)))
                            .all().length > 0
                );
                const feeTaken = yield* read(
                    "restore",
                    () => purchaseId !== null && cardFeeFor(db, purchaseId) !== null
                );
                if (
                    previous == null ||
                    previous.deletedAt == null ||
                    previous.transferId != null ||
                    onDeletedAccount ||
                    purchase?.deletedAt != null ||
                    feeTaken
                ) {
                    return;
                }
                yield* refreshLogoCandidate(db, id, now.getTime());
                yield* restoreEntry(db, id, {
                    deletedAt: previous.deletedAt,
                    now,
                    restoredAt: restoreStamp(previous, now),
                });
            }),
            failedAt("restore")
        );
    }),

    /**
     * Ends the schedule and keeps the charge: no successor is anchored, and `onceRecurring` stays set for the
     * Recurring filter. Tombstones are skipped: their schedule is all `repairOrphanedRecurrence` can rebuild from.
     */
    stopRecurring: Effect.fn("Transactions.stopRecurring")(function* stopRecurring(
        db: Database,
        id: string,
        now: Date = new Date()
    ) {
        yield* transaction(
            db,
            Effect.gen(function* write() {
                const previous = yield* read("stopRecurring", () => getTransactionById(db, id));
                if (previous == null || previous.deletedAt != null) {
                    return;
                }
                yield* refreshLogoCandidate(db, id, now.getTime());
                yield* query("stopRecurring", () =>
                    db
                        .update(transactions)
                        .set({
                            recurringType: RECURRING_TYPE.none,
                            reminderLeadDays: null,
                            updatedAt: now,
                        })
                        .where(eq(transactions.id, id))
                );
            }),
            failedAt("stopRecurring")
        );
    }),

    attachAccount: Effect.fn("Transactions.attachAccount")(function* attachAccount(
        db: Database,
        id: string,
        account: { currency: string; id: string; initialBalanceDate: Date },
        now: Date = new Date()
    ) {
        return yield* transaction(
            db,
            Effect.gen(function* write() {
                const previous = yield* read("attachAccount", () => getTransactionById(db, id));
                if (previous?.deletedAt != null) {
                    return false;
                }
                if (
                    previous == null ||
                    previous.accountId != null ||
                    previous.date.getTime() < account.initialBalanceDate.getTime()
                ) {
                    return true;
                }
                const typed = yield* read("attachAccount", () => cardFeeFor(db, id));
                const fee = yield* read("attachAccount", () =>
                    previous.income || typed !== null
                        ? null
                        : suggestedCardFee(db, {
                              account,
                              categoryId: previous.categoryId,
                              currency: previous.currency,
                              merchant: previous.note,
                          })
                );
                yield* refreshLogoCandidate(db, id, now.getTime());
                yield* query("attachAccount", () =>
                    db
                        .update(transactions)
                        .set({ accountId: account.id, updatedAt: now })
                        .where(inArray(transactions.id, typed === null ? [id] : [id, typed.id]))
                );
                if (fee !== null) {
                    const values = yield* cardFeeValues(db, id, { ...previous, accountId: account.id }, fee);
                    yield* writeFee(db, id, values, now, "attachAccount");
                }
                return true;
            }),
            failedAt("attachAccount")
        );
    }),

    update: Effect.fn("Transactions.update")(function* update<E = never>(
        db: Database,
        id: string,
        input: TransactionInput,
        { inSameTransaction }: Pick<CreateOptions<E>, "inSameTransaction"> = {}
    ) {
        const previous = yield* read("update", () => getTransactionById(db, id));
        const row = yield* toRow(db, id, input);
        const { id: _omit, ...rest } = row;
        const kept = keptCanonical(row, previous, input);
        const accountId = keptAccount(previous, input);
        const fee = input.fee == null ? null : yield* cardFeeValues(db, id, { ...row, ...kept, accountId }, input.fee);
        // One transaction: a stamp moved for an UPDATE that then failed would never match the row again.
        yield* transaction(
            db,
            Effect.gen(function* write() {
                // Before the row goes bare: the painter reads the dismissal list in its own UPDATE.
                if (clearsIdentity(previous, row)) {
                    yield* rememberLogoDismissal(db, id);
                }
                // An edit here keeps a bare row the backfill's (a peer's synced edit would not). A row becomes a
                // candidate only when this edit names a new merchant. Before the write: the refresh matches the current
                // stamp.
                if (
                    previous != null &&
                    isLogoCandidate({ ...row, note: input.note }) &&
                    !clearsIdentity(previous, row)
                ) {
                    if (merchantKey(previous.note) === merchantKey(row.note ?? "")) {
                        yield* refreshLogoCandidate(db, id, row.updatedAt.getTime());
                    } else {
                        yield* forgetLogoDismissal(db, id);
                        yield* rememberLogoCandidate(db, id, row.updatedAt.getTime(), LOGO_CANDIDATE_KEEP_MS);
                    }
                }
                // The backfill may have painted the row while `toRow` awaited. Read synchronously right before the
                // write, so the form's stale nulls cannot orphan a file that landed in between.
                const landed = yield* read("update", () => landedLogo(previous, getTransactionById(db, id), row));
                yield* query("update", () =>
                    db
                        .update(transactions)
                        .set({
                            ...rest,
                            ...kept,
                            ...landed,
                            accountId,
                            // Deletion is `remove`/`restore`'s call: `toRow` builds a live row, and spreading it would
                            // revive a peer's delete that arrived while the sheet was open.
                            deletedAt: previous?.deletedAt ?? null,
                            ...(removesPhoto(previous, row) && { imageKey: null }),
                            reminderLeadDays: keptLead(row, previous, input),
                            unreviewed: false,
                        })
                        .where(eq(transactions.id, id))
                );
                if (input.fee !== undefined && previous != null && previous.deletedAt == null) {
                    yield* writeFee(db, id, fee, row.updatedAt, "update", kept !== null);
                }
                if (inSameTransaction) {
                    yield* inSameTransaction(id);
                }
            }),
            failedAt("update")
        );
    }),
};

/** The identity a backfill painted between the edit's read and its write, when the edit carries none. */
function landedLogo(
    previous: Transaction | null,
    live: Transaction | null,
    next: typeof transactions.$inferInsert
): Partial<Pick<typeof transactions.$inferInsert, "imageColor" | "imageUri" | "updatedAt">> {
    const editHasNone = next.imageUri == null && next.icon == null && next.emoji == null && next.customColor == null;
    if (!editHasNone || previous == null || previous.imageUri != null || live?.imageUri == null) {
        return {};
    }
    // A changed merchant or currency is a different merchant; the backfill looks that one up instead.
    const sameMerchant =
        merchantKey(previous.note) === merchantKey(next.note ?? "") && previous.currency === next.currency;
    if (!sameMerchant) {
        return {};
    }
    // Never run the clock backwards, or sync's last-writer check would drop the edit as older than the logo.
    const updatedAt = new Date(Math.max(next.updatedAt.getTime(), live.updatedAt.getTime() + 1));
    return { imageColor: live.imageColor, imageUri: live.imageUri, updatedAt };
}

/** Synchronous on purpose (`getFirstSync` runs on the JS thread), so a caller has the row on its first render. */
export function getTransactionById(db: Database, id: string): Transaction | null {
    const rows = db.select().from(transactions).where(eq(transactions.id, id)).limit(1).all();
    return rows[0] ?? null;
}

export const hasEntriesBetween = Effect.fn("Transactions.hasEntriesBetween")(function* hasEntriesBetween(
    db: Database,
    from: Date,
    until: Date,
    now: Date
) {
    const [row] = yield* query("hasEntries", () =>
        db
            .select({ total: count() })
            .from(transactions)
            .where(and(visibleAt(now.getTime()), gte(transactions.date, from), lt(transactions.date, until)))
    );
    return (row?.total ?? 0) > 0;
});

export const lastLoggedEntry = Effect.fn("Transactions.lastLoggedEntry")(function* lastLoggedEntry(
    db: Database,
    now: Date
) {
    const [row] = yield* query("lastEntry", () =>
        db
            .select({
                amount: transactions.amount,
                category: categories.name,
                currency: transactions.currency,
                date: transactions.date,
                income: transactions.income,
                note: transactions.note,
            })
            .from(transactions)
            .leftJoin(categories, eq(categories.id, transactions.categoryId))
            .where(visibleAt(now.getTime()))
            .orderBy(desc(transactions.date))
            .limit(1)
    );
    if (row === undefined) {
        return null;
    }
    const entry: LastEntry = {
        ...row,
        currency: row.currency ?? (yield* Meta.get(db, "currency")),
    };
    return entry;
});
