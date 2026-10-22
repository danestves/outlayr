import { and, count, eq, inArray, isNotNull, or } from "drizzle-orm";

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
    transactionPhotos,
    transactionSplits,
    transactions,
    transactionTags,
    transfers,
} from "@/db/schema";
import { withTransaction } from "@/db/transaction";
import { newId } from "@/domain/ids";

import { getMeta, META_KEYS, setMeta } from "./app-meta-core";

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
    // Not synced: `colorScheme` and `numberEntryType` suit each device; `biometricLock`, `notification*`, `sync*`,
    // `ledgerAdoption`, `firstLaunch`, `onboardingComplete` and `recurrenceRepaired` describe this install.
] as const;

/** 999 bound variables per statement, three columns per queue entry. */
const ENQUEUE_CHUNK = 300;

export async function isSyncEnabled(db: Database): Promise<boolean> {
    return (await getMeta(db, META_KEYS.syncEnabled)) === "1";
}

/** Turning sync off drops the queue, or edits made while signed out would push at the next sign-in. */
export async function setSyncEnabled(db: Database, enabled: boolean): Promise<void> {
    await withTransaction(db, async () => {
        await setMeta(db, META_KEYS.syncEnabled, enabled ? "1" : "0");
        if (!enabled) {
            await db.delete(outbox);
        }
    });
}

export async function getSyncAccountSubject(db: Database): Promise<string | null> {
    return await getMeta(db, META_KEYS.syncAccountSubject);
}

export async function enableSyncForAccount(db: Database, accountId: string): Promise<void> {
    await withTransaction(db, async () => {
        await setMeta(db, META_KEYS.syncAccountSubject, accountId);
        await setMeta(db, META_KEYS.syncEnabled, "1");
    });
}

export async function hasResidualSyncState(db: Database): Promise<boolean> {
    if (await isSyncEnabled(db)) {
        return true;
    }
    if ((await outboxPendingCount(db)) > 0) {
        return true;
    }
    return (await getMeta(db, META_KEYS.syncCursor)) !== null || (await getMeta(db, META_KEYS.syncedAt)) !== null;
}

export async function getOrCreateDeviceId(db: Database): Promise<string> {
    const existing = await getMeta(db, META_KEYS.syncDeviceId);
    if (existing) {
        return existing;
    }
    const minted = newId();
    await setMeta(db, META_KEYS.syncDeviceId, minted);
    return minted;
}

/** Zero for anything unreadable: re-applying a change is a no-op, skipping one is silent data loss. */
export async function getSyncCursor(db: Database): Promise<number> {
    const raw = await getMeta(db, META_KEYS.syncCursor);
    if (raw === null) {
        return 0;
    }
    const parsed = Number(raw);
    return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

export async function setSyncCursor(db: Database, cursor: number): Promise<void> {
    await setMeta(db, META_KEYS.syncCursor, String(cursor));
}

export async function outboxPendingCount(db: Database): Promise<number> {
    const rows = await db.select({ pending: count() }).from(outbox);
    return rows[0]?.pending ?? 0;
}

/**
 * Triggers only fire once the gate opens, so this queues the ledger built before sign-in, tombstones included.
 * Run it after a "replace" adoption, or it pushes the seed categories the replace discards (convex-sync.md §5).
 */
export async function enqueueAllForSync(db: Database): Promise<void> {
    const enqueuedAt = new Date();
    const entries: {
        tableName: string;
        localId: string;
        enqueuedAt: Date;
    }[] = [];

    const collect = (tableName: string, rows: { localId: string }[]) => {
        for (const row of rows) {
            entries.push({ enqueuedAt, localId: row.localId, tableName });
        }
    };

    collect("categories", await db.select({ localId: categories.id }).from(categories));
    collect("transactions", await db.select({ localId: transactions.id }).from(transactions));
    collect("budgets", await db.select({ localId: budgets.id }).from(budgets));
    collect("mainBudget", await db.select({ localId: mainBudget.id }).from(mainBudget));
    collect("savingsGoals", await db.select({ localId: savingsGoals.id }).from(savingsGoals));
    collect("tags", await db.select({ localId: tags.id }).from(tags));
    collect("transactionTags", await db.select({ localId: transactionTags.id }).from(transactionTags));
    collect("transactionPhotos", await db.select({ localId: transactionPhotos.id }).from(transactionPhotos));
    collect("transactionSplits", await db.select({ localId: transactionSplits.id }).from(transactionSplits));
    collect("accounts", await db.select({ localId: accounts.id }).from(accounts));
    collect("transfers", await db.select({ localId: transfers.id }).from(transfers));
    collect("installmentPlans", await db.select({ localId: installmentPlans.id }).from(installmentPlans));
    collect("installments", await db.select({ localId: installments.id }).from(installments));
    collect("outsidePayments", await db.select({ localId: outsidePayments.id }).from(outsidePayments));
    collect("outsideMoves", await db.select({ localId: outsideMoves.id }).from(outsideMoves));
    collect(
        "appMeta",
        await db
            .select({ localId: appMeta.key })
            .from(appMeta)
            .where(inArray(appMeta.key, [...SYNCED_META_KEYS]))
    );

    await withTransaction(db, async () => {
        for (let from = 0; from < entries.length; from += ENQUEUE_CHUNK) {
            const chunk = entries.slice(from, from + ENQUEUE_CHUNK);
            /* oxlint-disable no-await-in-loop -- the chunks share the one SQLite connection this transaction is open on, so issuing them together interleaves statements against that transaction */
            await db
                .delete(outbox)
                .where(
                    or(
                        ...chunk.map((entry) =>
                            and(eq(outbox.tableName, entry.tableName), eq(outbox.localId, entry.localId))
                        )
                    )
                );
            await db.insert(outbox).values(chunk);
        }
    });
}

export async function setSyncedAt(db: Database, at: Date): Promise<void> {
    await setMeta(db, META_KEYS.syncedAt, String(at.getTime()));
}

export async function resetSyncForAccountSwitch(db: Database): Promise<void> {
    await withTransaction(db, async () => {
        await db.update(transactions).set({ imageKey: null }).where(isNotNull(transactions.imageUri));
        await db.update(accounts).set({ imageKey: null }).where(isNotNull(accounts.imageUri));
        await db.update(transactionPhotos).set({ imageKey: null }).where(isNotNull(transactionPhotos.imageUri));
        await db.delete(outbox);
        await db
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
            );
    });
}
