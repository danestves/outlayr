import { getTableColumns, inArray } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";
import * as EffectRecord from "effect/Record";

import {
    accounts,
    appMeta,
    budgets,
    categories,
    installmentPlans,
    installments,
    mainBudget,
    outsideMoves,
    outsidePayments,
    savingsGoals,
    tags,
    transactionAttachments,
    transactionPhotos,
    transactionSplits,
    transactions,
    transactionTags,
    transfers,
} from "@/db/schema";

import { META_KEYS } from "./app-meta-core";
import type { BoolSettingKey, NumberSettingKey } from "./settings-core";

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

type WireDefault = boolean | number | string;

type ColumnName<T extends SQLiteTable> = keyof T["_"]["columns"] & string;

interface SyncedTableOptions<T extends SQLiteTable> {
    /**
     * Fallback when the wire omits a column (added after replication began) or sends null for a NOT NULL one.
     * Without it `toLocalFields` writes null, and a NOT NULL column then fails the whole pull transaction.
     */
    defaults?: Partial<Record<ColumnName<T>, WireDefault>>;
    deviceLocal?: readonly ColumnName<T>[];
    dormantPhotos?: true;
    syncedIds?: readonly string[];
}

export interface PhotoTable {
    readonly dormant: boolean;
    readonly id: SQLiteColumn;
    readonly imageKey: SQLiteColumn;
    readonly imageUri: SQLiteColumn;
    readonly table: SQLiteTable;
}

export interface SyncedTableSpec<T extends SQLiteTable = SQLiteTable, Id extends SQLiteColumn = SQLiteColumn> {
    readonly clock: "none" | "row";
    readonly dates: readonly string[];
    readonly defaults: Readonly<Partial<Record<string, WireDefault>>>;
    /**
     * Must name exactly the columns of the Convex table in `packages/backend/confect/lib/syncTables.ts`. A missing
     * column replicates as silently absent, so `sync-engine-core.test.ts` checks this list against the schema.
     */
    readonly fields: readonly string[];
    readonly id: Id;
    readonly photos: PhotoTable | null;
    readonly scope: SQL | undefined;
    readonly syncedIds: readonly string[] | undefined;
    readonly table: T;
}

const ENVELOPE = new Set(["deletedAt", "restoredAt", "updatedAt"]);

function synced<T extends SQLiteTable, Id extends SQLiteColumn>(
    table: T,
    id: Id,
    options: SyncedTableOptions<T> = {}
): SyncedTableSpec<T, Id> {
    const columns = getTableColumns(table);
    const notReplicated = new Set<string>([id.name, ...ENVELOPE, ...(options.deviceLocal ?? [])]);
    const { imageKey, imageUri } = columns;
    return {
        clock: "updatedAt" in columns ? "row" : "none",
        dates: Object.entries(columns)
            .filter(([, column]) => column.dataType === "object date")
            .map(([name]) => name),
        defaults: options.defaults ?? {},
        fields: Object.keys(columns).filter((name) => !notReplicated.has(name)),
        id,
        photos:
            imageKey && imageUri ? { dormant: options.dormantPhotos === true, id, imageKey, imageUri, table } : null,
        scope: options.syncedIds && inArray(id, [...options.syncedIds]),
        syncedIds: options.syncedIds,
        table,
    };
}

/** In restore order: with foreign keys enforced, a row written before the one it points at fails. */
export const SYNCED_SPECS = {
    categories: synced(categories, categories.id),
    accounts: synced(accounts, accounts.id, { defaults: { kind: "asset" }, deviceLocal: ["imageUri"] }),
    transfers: synced(transfers, transfers.id),
    transactions: synced(transactions, transactions.id, {
        // No `imageUri`: a peer cannot resolve the device-local path, nulls it, and pushes that null back over the
        // original photo. `imageKey` replicates; the bytes travel via `photos.ts`.
        deviceLocal: ["imageUri", "reminderLeadDays", "unreviewed"],
    }),
    budgets: synced(budgets, budgets.id),
    mainBudget: synced(mainBudget, mainBudget.id),
    savingsGoals: synced(savingsGoals, savingsGoals.id, {
        // Start amounts default to 0, never null: null means unconvertible and would withhold the goal's progress.
        // `targetDate: 0` only lets a dateless goal be written as a tombstone (see `writeRow`).
        defaults: { startAmount: 0, startAmountUsd: 0, targetDate: 0 },
    }),
    tags: synced(tags, tags.id),
    transactionTags: synced(transactionTags, transactionTags.id),
    transactionPhotos: synced(transactionPhotos, transactionPhotos.id, {
        deviceLocal: ["imageUri"],
        dormantPhotos: true,
    }),
    transactionSplits: synced(transactionSplits, transactionSplits.id),
    // After `transactions`: an order points at its purchase entry.
    installmentPlans: synced(installmentPlans, installmentPlans.id),
    installments: synced(installments, installments.id),
    outsidePayments: synced(outsidePayments, outsidePayments.id),
    outsideMoves: synced(outsideMoves, outsideMoves.id),
    transactionAttachments: synced(transactionAttachments, transactionAttachments.id, { deviceLocal: ["imageUri"] }),
    // Only `SYNCED_META_KEYS`: the rest of `appMeta` is this phone's own, as in `replaceLocalFromAccount`.
    appMeta: synced(appMeta, appMeta.key, { syncedIds: SYNCED_META_KEYS }),
};

export type SyncedTable = keyof typeof SYNCED_SPECS;

export const SYNCED_TABLES = EffectRecord.keys(SYNCED_SPECS);
