import { addDays, firstOfMonth, startOfDay } from "@outlayr/money/calendar";
import { canonicalUsd } from "@outlayr/money/canonical-usd";
import type { CanonicalUsd } from "@outlayr/money/canonical-usd";
import type { EntryRateType } from "@outlayr/money/rates";
import { isTransactionRateNeeded } from "@outlayr/money/rates";
import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import { and, asc, desc, eq, gt, gte, inArray, isNotNull, isNull, lt, lte, sql } from "drizzle-orm";

import type { Database } from "@/db/client";
import { accounts, categories, installments, transactions, transfers } from "@/db/schema";
import { withTransaction } from "@/db/transaction";
import { newId } from "@/domain/ids";
import { merchantKey } from "@/domain/merchant-resolver";
import { DEFAULT_CURRENCY } from "@/domain/money";
import type { PaidVia } from "@/domain/paid-via";
import type { LastEntry } from "@/domain/reminder";
import { normalizeLead } from "@/domain/subscription-reminder";

import { getMeta, META_KEYS } from "./app-meta-core";
import type { SpendDb } from "./budget-spent";
import { cardFeeFor, cardFeeValues, suggestedCardFee } from "./card-fees-core";
import type { CardFeeInput } from "./card-fees-core";
import { getCategoryById } from "./categories-core";
import { ERASED_DATE } from "./erase-core";
import { restorePlansForTransaction, tombstonePlansForTransaction } from "./installment-cascade";
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

export function ledgerSizeQuery(db: SpendDb) {
    return db.select({ id: transactions.id }).from(transactions).where(isNull(transactions.deletedAt));
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

export interface TransactionInput {
    accountId?: string | null;
    amount: number;
    categoryId: string | null;
    /** null = adopt the ledger's currency, which the write stamps in. */
    currency: string | null;
    customColor?: string | null;
    date: Date;
    details: string | null;
    emoji?: string | null;
    exchangeRate?: number | null;
    exchangeRateType?: EntryRateType | null;
    fee?: CardFeeInput | null;
    icon?: string | null;
    imageColor?: string | null;
    /** Logo photo URI; `icon`, `emoji` and this exclude each other. */
    imageUri?: string | null;
    income: boolean;
    note: string;
    onceRecurring?: boolean;
    paidVia?: PaidVia | null;
    recurringCoefficient?: number;
    recurringEndDate?: Date | null;
    /** Cadence: none=0, daily=1, weekly=2, monthly=3, yearly=4. */
    recurringType?: number;
    /** Days of notice for the due-date reminder; null is off, 0 is the day itself. */
    reminderLeadDays?: number | null;
}

type FeeValues = Awaited<ReturnType<typeof cardFeeValues>>;

function keptFeeValue(existing: Transaction, values: FeeValues, moneyKept: boolean) {
    const sameFee =
        existing.feeRate === values.feeRate &&
        existing.currency === values.currency &&
        (values.feeRate !== null || existing.amount === values.amount);
    return sameFee && moneyKept ? { amount: existing.amount, amountUsd: existing.amountUsd } : {};
}

async function writeFee(
    db: Database,
    purchaseId: string,
    values: FeeValues | null,
    now: Date,
    moneyKept = false
): Promise<void> {
    const existing = cardFeeFor(db, purchaseId);
    if (values === null) {
        if (existing !== null) {
            await db
                .update(transactions)
                .set({ deletedAt: now, updatedAt: now })
                .where(eq(transactions.id, existing.id));
        }
        return;
    }
    if (existing === null) {
        await db.insert(transactions).values({ ...values, id: newId(), updatedAt: now });
        return;
    }
    await db
        .update(transactions)
        .set({ ...values, ...keptFeeValue(existing, values, moneyKept), updatedAt: now })
        .where(eq(transactions.id, existing.id));
}

async function toRow(db: Database, id: string, input: TransactionInput): Promise<typeof transactions.$inferInsert> {
    const trimmedNote = input.note.trim();
    let note = trimmedNote;
    if (note === "" && input.categoryId != null) {
        const category = await getCategoryById(db, input.categoryId);
        note = category?.name ?? "";
    }
    const details = input.details?.trim() ? input.details.trim() : null;
    const recurring = input.onceRecurring ?? false;
    const now = new Date();
    // Stamped even when unpicked: a null currency would follow the setting and restate a $18.50 lunch as €18.50.
    const currency = input.currency ?? (await displayCurrency(db));
    return {
        accountId: input.accountId ?? null,
        amount: Math.abs(input.amount),
        categoryId: input.categoryId,
        currency,
        customColor: input.customColor ?? null,
        date: input.date,
        day: startOfDay(input.date),
        details,
        emoji: input.emoji ?? null,
        icon: input.icon ?? null,
        id,
        imageColor: input.imageColor ?? null,
        imageUri: input.imageUri ?? null,
        income: input.income,
        month: firstOfMonth(input.date),
        note,
        onceRecurring: recurring,
        paidVia: input.paidVia,
        // Re-derived on every write, so an edited first payment re-anchors the chain.
        recurringAnchorDay: recurring ? input.date.getDate() : null,
        recurringCoefficient: recurring ? Math.max(1, input.recurringCoefficient ?? 1) : 1,
        recurringEndDate: recurring ? (input.recurringEndDate ?? null) : null,
        recurringType: recurring ? (input.recurringType ?? 0) : 0,
        reminderLeadDays: recurring ? normalizeLead(input.reminderLeadDays ?? null) : null,
        // Frozen at write; converting at read time would change last month's spending every morning.
        ...(await canonicalUsd(localRateLookup(db), {
            amount: Math.abs(input.amount),
            currency,
            date: input.date,
            displayCurrency: currency,
            exchangeRate: input.exchangeRate,
            exchangeRateType: input.exchangeRateType,
        })),
        deletedAt: null,
        updatedAt: now,
    };
}

async function displayCurrency(db: Database): Promise<string> {
    return (await getMeta(db, META_KEYS.currency)) ?? DEFAULT_CURRENCY;
}

/**
 * Keeps the frozen value unless amount, currency or date moved: re-freezing is unsafe, since the rate feed serves
 * 90 days and an older entry would come back unresolvable. A moved field returns null for the backfill to retry.
 */
function keptCanonical(
    next: typeof transactions.$inferInsert,
    previous: Transaction | null,
    input: TransactionInput
): CanonicalUsd | null {
    if (
        previous == null ||
        previous.amount !== next.amount ||
        previous.currency !== next.currency ||
        previous.date.getTime() !== next.date.getTime()
    ) {
        return null;
    }
    if (input.exchangeRate === undefined && input.exchangeRateType === undefined) {
        return {
            amountUsd: previous.amountUsd,
            exchangeRate: previous.exchangeRate,
            exchangeRateType: previous.exchangeRateType,
        };
    }
    const requestedRateType = next.currency === "USD" ? null : (input.exchangeRateType ?? "official");
    if (previous.exchangeRateType !== requestedRateType) {
        return null;
    }
    if (input.exchangeRate !== undefined && previous.exchangeRate !== input.exchangeRate) {
        return null;
    }
    if (previous.amountUsd === null && !isTransactionRateNeeded(previous)) {
        return null;
    }
    return {
        amountUsd: previous.amountUsd,
        exchangeRate: previous.exchangeRate,
        exchangeRateType: previous.exchangeRateType,
    };
}

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

/**
 * An absent key keeps the notice: a form with no lead picker omits it, and `toRow`'s null would silently turn
 * it off. An explicit `null` means off; ending the schedule clears it regardless.
 */
function keptLead(
    next: typeof transactions.$inferInsert,
    previous: Transaction | null,
    input: TransactionInput
): number | null {
    if (!next.onceRecurring) {
        return null;
    }
    return input.reminderLeadDays === undefined
        ? (previous?.reminderLeadDays ?? null)
        : (next.reminderLeadDays ?? null);
}

/** Same contract as {@link keptLead}: CSV import and App Intents omit the field; only explicit `null` detaches. */
function keptAccount(previous: Transaction | null, input: TransactionInput): string | null {
    return input.accountId === undefined ? (previous?.accountId ?? null) : input.accountId;
}

export function accountTransactionsQuery(db: SpendDb, accountId: string) {
    return db
        .select(LOG_COLUMNS)
        .from(transactions)
        .where(and(isNull(transactions.deletedAt), eq(transactions.accountId, accountId)))
        .orderBy(desc(transactions.date), asc(transactions.feeForId));
}

export interface CreateOptions {
    /**
     * Whether a named entry saved with its category tile becomes the logo backfill's to finish. The CSV import
     * passes false: its rows stay on the device, and one candidate write per row would make a big import quadratic.
     */
    logoCandidate?: boolean;
    inSameTransaction?: (id: string) => Promise<void>;
}

export const transactionsRepo = {
    async create(db: Database, input: TransactionInput, options: CreateOptions = {}): Promise<string> {
        const id = newId();
        const row = await toRow(db, id, input);
        const fee = input.fee == null ? null : await cardFeeValues(db, id, row, input.fee);
        const { inSameTransaction } = options;
        const write = async () => {
            await db
                .insert(transactions)
                .values(fee === null ? [row] : [row, { ...fee, id: newId(), updatedAt: row.updatedAt }]);
            await inSameTransaction?.(id);
        };
        await (inSameTransaction ? withTransaction(db, write) : write());
        // Bookkeeping, so it cannot fail the save: a caller told otherwise would retry and write the row twice.
        // Judged on the caller's merchant, not `row.note`, which falls back to the category name.
        if (options.logoCandidate !== false && isLogoCandidate({ ...row, note: input.note })) {
            try {
                await rememberLogoCandidate(db, id, row.updatedAt.getTime(), LOGO_CANDIDATE_KEEP_MS);
            } catch (error) {
                console.warn("[outlayr] logo candidate not recorded", error);
            }
        }
        return id;
    },

    /**
     * Re-anchors the schedule on a successor first, since the newest occurrence holds it. The tombstone retires to
     * `none`, which is how deleting the pending charge stops a subscription.
     */
    async remove(db: Database, id: string, now: Date = new Date()): Promise<void> {
        const row = getTransactionById(db, id);
        const successor = row == null || row.deletedAt != null ? null : await scheduleSuccessor(db, row, now);

        await withTransaction(db, async () => {
            if (successor != null) {
                // The successor's id derives from its schedule, so a peer that anchored it already holds this row.
                await insertOccurrences(db, id, [successor], now);
            }
            await refreshLogoCandidate(db, id, now.getTime());
            await db
                .update(transactions)
                .set({
                    deletedAt: now,
                    recurringType: RECURRING_TYPE.none,
                    reminderLeadDays: null,
                    updatedAt: now,
                })
                .where(eq(transactions.id, id));
            // A fee outliving its transfer would keep charging for a movement the ledger no longer holds.
            if (row?.transferId != null) {
                await db
                    .update(transfers)
                    .set({ deletedAt: now, updatedAt: now })
                    .where(eq(transfers.id, row.transferId));
            }
            await db
                .update(transactions)
                .set({ deletedAt: now, updatedAt: now })
                .where(and(eq(transactions.feeForId, id), isNull(transactions.deletedAt)));
            await tombstonePlansForTransaction(db, id, now);
        });
    },

    /**
     * `restoredAt` lets the restore beat the tombstone everywhere (R1). `recurringType` stays retired, since deleting
     * the pending charge ends a subscription. Fees and entries on deleted accounts stay out, as in the deleted list.
     */
    async restore(db: Database, id: string, now: Date = new Date()): Promise<void> {
        await withTransaction(db, async () => {
            const previous = getTransactionById(db, id);
            const purchaseId = previous?.feeForId ?? null;
            const purchase = purchaseId === null ? null : getTransactionById(db, purchaseId);
            const onDeletedAccount =
                previous?.accountId != null &&
                db
                    .select({ id: accounts.id })
                    .from(accounts)
                    .where(and(eq(accounts.id, previous.accountId), isNotNull(accounts.deletedAt)))
                    .all().length > 0;
            if (
                previous == null ||
                previous.deletedAt == null ||
                previous.transferId != null ||
                onDeletedAccount ||
                purchase?.deletedAt != null ||
                (purchaseId !== null && cardFeeFor(db, purchaseId) !== null)
            ) {
                return;
            }
            await refreshLogoCandidate(db, id, now.getTime());
            const lifted = { deletedAt: null, restoredAt: restoreStamp(previous, now), updatedAt: now };
            await db.update(transactions).set(lifted).where(eq(transactions.id, id));
            await db
                .update(transactions)
                .set(lifted)
                .where(and(eq(transactions.feeForId, id), eq(transactions.deletedAt, previous.deletedAt)));
            await restorePlansForTransaction(db, id, previous.deletedAt, now, lifted.restoredAt);
        });
    },

    /**
     * Ends the schedule and keeps the charge: no successor is anchored, and `onceRecurring` stays set for the
     * Recurring filter. Tombstones are skipped: their schedule is all `repairOrphanedRecurrence` can rebuild from.
     */
    async stopRecurring(db: Database, id: string, now: Date = new Date()): Promise<void> {
        await withTransaction(db, async () => {
            const previous = getTransactionById(db, id);
            if (previous == null || previous.deletedAt != null) {
                return;
            }
            await refreshLogoCandidate(db, id, now.getTime());
            await db
                .update(transactions)
                .set({
                    recurringType: RECURRING_TYPE.none,
                    reminderLeadDays: null,
                    updatedAt: now,
                })
                .where(eq(transactions.id, id));
        });
    },

    async attachAccount(
        db: Database,
        id: string,
        account: { currency: string; id: string; initialBalanceDate: Date },
        now: Date = new Date()
    ): Promise<boolean> {
        let settled = true;
        await withTransaction(db, async () => {
            const previous = getTransactionById(db, id);
            if (previous?.deletedAt != null) {
                settled = false;
                return;
            }
            if (
                previous == null ||
                previous.accountId != null ||
                previous.date.getTime() < account.initialBalanceDate.getTime()
            ) {
                return;
            }
            const typed = cardFeeFor(db, id);
            const fee =
                previous.income || typed !== null
                    ? null
                    : suggestedCardFee(db, {
                          account,
                          categoryId: previous.categoryId,
                          currency: previous.currency,
                          merchant: previous.note,
                      });
            await refreshLogoCandidate(db, id, now.getTime());
            await db
                .update(transactions)
                .set({ accountId: account.id, updatedAt: now })
                .where(inArray(transactions.id, typed === null ? [id] : [id, typed.id]));
            if (fee !== null) {
                await writeFee(db, id, await cardFeeValues(db, id, { ...previous, accountId: account.id }, fee), now);
            }
        });
        return settled;
    },

    async update(
        db: Database,
        id: string,
        input: TransactionInput,
        { inSameTransaction }: Pick<CreateOptions, "inSameTransaction"> = {}
    ): Promise<void> {
        const previous = getTransactionById(db, id);
        const row = await toRow(db, id, input);
        const { id: _omit, ...rest } = row;
        const kept = keptCanonical(row, previous, input);
        const accountId = keptAccount(previous, input);
        const fee = input.fee == null ? null : await cardFeeValues(db, id, { ...row, ...kept, accountId }, input.fee);
        // One transaction: a stamp moved for an UPDATE that then failed would never match the row again.
        await withTransaction(db, async () => {
            // Before the row goes bare: the painter reads the dismissal list in its own UPDATE.
            if (clearsIdentity(previous, row)) {
                await rememberLogoDismissal(db, id);
            }
            // An edit here keeps a bare row the backfill's (a peer's synced edit would not). A row becomes a candidate
            // only when this edit names a new merchant. Before the write: the refresh matches the current stamp.
            if (previous != null && isLogoCandidate({ ...row, note: input.note }) && !clearsIdentity(previous, row)) {
                if (merchantKey(previous.note) === merchantKey(row.note ?? "")) {
                    await refreshLogoCandidate(db, id, row.updatedAt.getTime());
                } else {
                    await forgetLogoDismissal(db, id);
                    await rememberLogoCandidate(db, id, row.updatedAt.getTime(), LOGO_CANDIDATE_KEEP_MS);
                }
            }
            // The backfill may have painted the row while `toRow` awaited. Read synchronously right before the write,
            // so the form's stale nulls cannot orphan a file that landed in between.
            const landed = landedLogo(previous, getTransactionById(db, id), row);
            await db
                .update(transactions)
                .set({
                    ...rest,
                    ...kept,
                    ...landed,
                    accountId,
                    // Deletion is `remove`/`restore`'s call: `toRow` builds a live row, and spreading it would revive a
                    // peer's delete that arrived while the sheet was open.
                    deletedAt: previous?.deletedAt ?? null,
                    imageKey: removesPhoto(previous, row) ? null : rest.imageKey,
                    reminderLeadDays: keptLead(row, previous, input),
                })
                .where(eq(transactions.id, id));
            if (input.fee !== undefined && previous != null && previous.deletedAt == null) {
                await writeFee(db, id, fee, row.updatedAt, kept !== null);
            }
            await inSameTransaction?.(id);
        });
    },
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

export async function lastLoggedEntry(db: Database, now: Date): Promise<LastEntry | null> {
    const [row] = await db
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
        .limit(1);
    if (row === undefined) {
        return null;
    }
    return { ...row, currency: row.currency ?? (await getMeta(db, META_KEYS.currency)) ?? DEFAULT_CURRENCY };
}
