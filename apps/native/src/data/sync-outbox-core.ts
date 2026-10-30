import { and, count, eq, inArray, isNotNull, or } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { Database } from "@/db/client";
import {
    accounts,
    appMeta,
    budgets,
    categories,
    installmentPlans,
    installments,
    outsideMoves,
    outsidePayments,
    mainBudget,
    outbox,
    savingsGoals,
    tags,
    transactionAttachments,
    transactionPhotos,
    transactionSplits,
    transactions,
    transactionTags,
    transfers,
} from "@/db/schema";
import { transaction } from "@/db/transaction";
import { newId } from "@/domain/ids";

import { getMeta, META_KEYS, setMeta } from "./app-meta-core";
import type { BoolSettingKey, NumberSettingKey } from "./settings-core";

export const SYNCED_TABLES = [
    "categories",
    "transactions",
    "budgets",
    "mainBudget",
    "savingsGoals",
    "tags",
    "transactionTags",
    "transactionPhotos",
    "transactionSplits",
    "accounts",
    "transfers",
    "installmentPlans",
    "installments",
    "outsidePayments",
    "outsideMoves",
    "transactionAttachments",
    "appMeta",
] as const;

/**
 * Allow-list of account-level `appMeta` keys, so a new key stays device-local by default. Mirrored in the
 * `appMeta` triggers' `WHEN` clause; `outbox-triggers.test.ts` fails if the two disagree.
 */
export const SYNCED_META_KEYS = [
    META_KEYS.currency,
    META_KEYS.currencyChosen,
    "showCents",
    "incomeTracking",
    "showUpcoming",
    "showUpcomingSoon",
    "logViewLineGraph",
    "animatedCharts",
    "categorySuggestions",
    "aiEnrichment",
    "groundedLookup",
    "swapTimeLabel",
    "confetti",
    "budgetViewStyle",
    "use24HourClock",
    "firstWeekday",
    "firstDayOfMonth",
    "haptics",
    "logInsightsTimeFrame",
    "logInsightsType",
    "insightsTimeFrame",
    "insightsMeasure",
    "accentColor",
    META_KEYS.timeZone,
    // Not synced: `colorScheme` and `numberEntryType` suit each device; `biometricLock`, `notification*`, `sync*`,
    // `ledgerAdoption`, `firstLaunch`, `onboardingComplete` and `recurrenceRepaired` describe this install.
] as const satisfies readonly (BoolSettingKey | NumberSettingKey | (typeof META_KEYS)[keyof typeof META_KEYS])[];

/** 999 bound variables per statement, three columns per queue entry. */
const ENQUEUE_CHUNK = 300;

const SyncOutboxStep = Schema.Literals(["gate", "subject", "device", "cursor", "count", "enqueue", "stamp", "reset"]);

export class SyncOutboxError extends Schema.TaggedError<SyncOutboxError>()("SyncOutboxError", {
    cause: Schema.Defect(),
    message: Schema.String,
    step: SyncOutboxStep,
}) {}

const failedAt = (step: typeof SyncOutboxStep.Type) => (cause: unknown) =>
    new SyncOutboxError({ cause, message: `Sync outbox ${step} failed`, step });

const query = <A>(step: typeof SyncOutboxStep.Type, run: () => PromiseLike<A>) =>
    Effect.tryPromise({ catch: failedAt(step), try: run });

export const isSyncEnabled = Effect.fn("SyncOutbox.isSyncEnabled")(function* isSyncEnabled(db: Database) {
    return (yield* getMeta(db, META_KEYS.syncEnabled).pipe(Effect.mapError(failedAt("gate")))) === "1";
});

/** Turning sync off drops the queue, or edits made while signed out would push at the next sign-in. */
export const setSyncEnabled = Effect.fn("SyncOutbox.setSyncEnabled")(function* setSyncEnabled(
    db: Database,
    enabled: boolean
) {
    yield* transaction(
        db,
        Effect.gen(function* write() {
            yield* setMeta(db, META_KEYS.syncEnabled, enabled ? "1" : "0").pipe(Effect.mapError(failedAt("gate")));
            if (!enabled) {
                yield* query("gate", () => db.delete(outbox));
            }
        }),
        failedAt("gate")
    );
});

export const getSyncAccountSubject = Effect.fn("SyncOutbox.getSyncAccountSubject")(function* getSyncAccountSubject(
    db: Database
) {
    return yield* getMeta(db, META_KEYS.syncAccountSubject).pipe(Effect.mapError(failedAt("subject")));
});

export const enableSyncForAccount = Effect.fn("SyncOutbox.enableSyncForAccount")(function* enableSyncForAccount(
    db: Database,
    accountId: string
) {
    yield* transaction(
        db,
        Effect.gen(function* write() {
            yield* setMeta(db, META_KEYS.syncAccountSubject, accountId).pipe(Effect.mapError(failedAt("subject")));
            yield* setMeta(db, META_KEYS.syncEnabled, "1").pipe(Effect.mapError(failedAt("subject")));
        }),
        failedAt("subject")
    );
});

export const hasResidualSyncState = Effect.fn("SyncOutbox.hasResidualSyncState")(function* hasResidualSyncState(
    db: Database
) {
    if (yield* isSyncEnabled(db)) {
        return true;
    }
    if ((yield* outboxPendingCount(db)) > 0) {
        return true;
    }
    return (
        (yield* getMeta(db, META_KEYS.syncCursor).pipe(Effect.mapError(failedAt("cursor")))) !== null ||
        (yield* getMeta(db, META_KEYS.syncedAt).pipe(Effect.mapError(failedAt("stamp")))) !== null
    );
});

export const getOrCreateDeviceId = Effect.fn("SyncOutbox.getOrCreateDeviceId")(function* getOrCreateDeviceId(
    db: Database
) {
    const existing = yield* getMeta(db, META_KEYS.syncDeviceId).pipe(Effect.mapError(failedAt("device")));
    if (existing) {
        return existing;
    }
    const minted = newId();
    yield* setMeta(db, META_KEYS.syncDeviceId, minted).pipe(Effect.mapError(failedAt("device")));
    return minted;
});

/** Zero for anything unreadable: re-applying a change is a no-op, skipping one is silent data loss. */
export const getSyncCursor = Effect.fn("SyncOutbox.getSyncCursor")(function* getSyncCursor(db: Database) {
    const raw = yield* getMeta(db, META_KEYS.syncCursor).pipe(Effect.mapError(failedAt("cursor")));
    if (raw === null) {
        return 0;
    }
    const parsed = Number(raw);
    return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
});

export const setSyncCursor = Effect.fn("SyncOutbox.setSyncCursor")(function* setSyncCursor(
    db: Database,
    cursor: number
) {
    yield* setMeta(db, META_KEYS.syncCursor, String(cursor)).pipe(Effect.mapError(failedAt("cursor")));
});

export const outboxPendingCount = Effect.fn("SyncOutbox.outboxPendingCount")(function* outboxPendingCount(
    db: Database
) {
    const rows = yield* query("count", () => db.select({ pending: count() }).from(outbox));
    return rows[0]?.pending ?? 0;
});

/**
 * Triggers only fire once the gate opens, so this queues the ledger built before sign-in, tombstones included.
 * Run it after a "replace" adoption, or it pushes the seed categories the replace discards (convex-sync.md §5).
 */
export const enqueueAllForSync = Effect.fn("SyncOutbox.enqueueAllForSync")(function* enqueueAllForSync(db: Database) {
    const enqueuedAt = new Date();
    const entries: {
        tableName: string;
        localId: string;
        enqueuedAt: Date;
    }[] = [];

    const collect = Effect.fn("SyncOutbox.collect")(function* collect(
        tableName: string,
        read: () => PromiseLike<{ localId: string }[]>
    ) {
        for (const row of yield* query("enqueue", read)) {
            entries.push({ enqueuedAt, localId: row.localId, tableName });
        }
    });

    yield* collect("categories", () => db.select({ localId: categories.id }).from(categories));
    yield* collect("transactions", () => db.select({ localId: transactions.id }).from(transactions));
    yield* collect("budgets", () => db.select({ localId: budgets.id }).from(budgets));
    yield* collect("mainBudget", () => db.select({ localId: mainBudget.id }).from(mainBudget));
    yield* collect("savingsGoals", () => db.select({ localId: savingsGoals.id }).from(savingsGoals));
    yield* collect("tags", () => db.select({ localId: tags.id }).from(tags));
    yield* collect("transactionTags", () => db.select({ localId: transactionTags.id }).from(transactionTags));
    yield* collect("transactionPhotos", () => db.select({ localId: transactionPhotos.id }).from(transactionPhotos));
    yield* collect("transactionSplits", () => db.select({ localId: transactionSplits.id }).from(transactionSplits));
    yield* collect("accounts", () => db.select({ localId: accounts.id }).from(accounts));
    yield* collect("transfers", () => db.select({ localId: transfers.id }).from(transfers));
    yield* collect("installmentPlans", () => db.select({ localId: installmentPlans.id }).from(installmentPlans));
    yield* collect("installments", () => db.select({ localId: installments.id }).from(installments));
    yield* collect("outsidePayments", () => db.select({ localId: outsidePayments.id }).from(outsidePayments));
    yield* collect("outsideMoves", () => db.select({ localId: outsideMoves.id }).from(outsideMoves));
    yield* collect("transactionAttachments", () =>
        db.select({ localId: transactionAttachments.id }).from(transactionAttachments)
    );
    yield* collect("appMeta", () =>
        db
            .select({ localId: appMeta.key })
            .from(appMeta)
            .where(inArray(appMeta.key, [...SYNCED_META_KEYS]))
    );

    yield* transaction(
        db,
        Effect.gen(function* write() {
            for (let from = 0; from < entries.length; from += ENQUEUE_CHUNK) {
                const chunk = entries.slice(from, from + ENQUEUE_CHUNK);
                // The chunks share the one SQLite connection this transaction is open on, so issuing them together
                // interleaves statements against that transaction.
                yield* query("enqueue", () =>
                    db
                        .delete(outbox)
                        .where(
                            or(
                                ...chunk.map((entry) =>
                                    and(eq(outbox.tableName, entry.tableName), eq(outbox.localId, entry.localId))
                                )
                            )
                        )
                );
                yield* query("enqueue", () => db.insert(outbox).values(chunk));
            }
        }),
        failedAt("enqueue")
    );
});

export const setSyncedAt = Effect.fn("SyncOutbox.setSyncedAt")(function* setSyncedAt(db: Database, at: Date) {
    yield* setMeta(db, META_KEYS.syncedAt, String(at.getTime())).pipe(Effect.mapError(failedAt("stamp")));
});

export const resetSyncForAccountSwitch = Effect.fn("SyncOutbox.resetSyncForAccountSwitch")(
    function* resetSyncForAccountSwitch(db: Database) {
        yield* transaction(
            db,
            Effect.gen(function* write() {
                yield* query("reset", () =>
                    db.update(transactions).set({ imageKey: null }).where(isNotNull(transactions.imageUri))
                );
                yield* query("reset", () =>
                    db.update(accounts).set({ imageKey: null }).where(isNotNull(accounts.imageUri))
                );
                yield* query("reset", () =>
                    db.update(transactionPhotos).set({ imageKey: null }).where(isNotNull(transactionPhotos.imageUri))
                );
                yield* query("reset", () =>
                    db
                        .update(transactionAttachments)
                        .set({ imageKey: null })
                        .where(isNotNull(transactionAttachments.imageUri))
                );
                yield* query("reset", () => db.delete(outbox));
                yield* query("reset", () =>
                    db
                        .delete(appMeta)
                        .where(
                            inArray(appMeta.key, [
                                META_KEYS.syncAccountSubject,
                                META_KEYS.syncCursor,
                                META_KEYS.syncedAt,
                                META_KEYS.syncEnabled,
                                META_KEYS.syncReread,
                                META_KEYS.syncRestoresReread,
                            ])
                        )
                );
            }),
            failedAt("reset")
        );
    }
);
