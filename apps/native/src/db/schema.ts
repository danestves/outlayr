import { sql } from "drizzle-orm";
import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";

export const categories = sqliteTable(
    "categories",
    {
        color: text("color").default("#FFFFFF"),
        dateCreated: integer("dateCreated", { mode: "timestamp_ms" }),
        deletedAt: integer("deletedAt", { mode: "timestamp_ms" }),
        emoji: text("emoji"),
        icon: text("icon"),
        id: text("id").primaryKey(),
        income: integer("income", { mode: "boolean" }).notNull().default(false),
        name: text("name"),
        parentId: text("parentId").references((): AnySQLiteColumn => categories.id, { onDelete: "set null" }),
        sortOrder: integer("sortOrder").notNull().default(0),
        updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
    },
    (table) => [
        index("categories_income_idx").on(table.income),
        index("categories_parentId_idx").on(table.parentId),
        index("categories_deletedAt_idx").on(table.deletedAt),
    ]
);

export const accounts = sqliteTable(
    "accounts",
    {
        currency: text("currency").notNull(),
        customColor: text("customColor"),
        dateCreated: integer("dateCreated", { mode: "timestamp_ms" }).notNull(),
        deletedAt: integer("deletedAt", { mode: "timestamp_ms" }),
        emoji: text("emoji"),
        icon: text("icon"),
        id: text("id").primaryKey(),
        imageColor: text("imageColor"),
        imageKey: text("imageKey"),
        /** Device-local, like `transactions.imageUri`: never replicated. */
        imageUri: text("imageUri"),
        initialBalance: real("initialBalance").notNull().default(0),
        initialBalanceDate: integer("initialBalanceDate", {
            mode: "timestamp_ms",
        }).notNull(),
        /** USD at `initialBalanceDate`'s rate, frozen at write; null when no rate existed. */
        initialBalanceUsd: real("initialBalanceUsd"),
        kind: text("kind").notNull().default("asset"),
        name: text("name").notNull(),
        sortOrder: integer("sortOrder").notNull().default(0),
        updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
    },
    (table) => [index("accounts_deletedAt_idx").on(table.deletedAt)]
);

export const transfers = sqliteTable(
    "transfers",
    {
        date: integer("date", { mode: "timestamp_ms" }).notNull(),
        dateCreated: integer("dateCreated", { mode: "timestamp_ms" }).notNull(),
        day: integer("day", { mode: "timestamp_ms" }).notNull(),
        deletedAt: integer("deletedAt", { mode: "timestamp_ms" }),
        exchangeRate: real("exchangeRate"),
        /** `EntryRateType` from `@outlayr/money/rates`: official | eur_reference | custom. */
        exchangeRateType: text("exchangeRateType"),
        fromAccountId: text("fromAccountId")
            .notNull()
            .references(() => accounts.id, { onDelete: "cascade" }),
        /** Money that moved; a source-side fee is its own transaction and excluded here, or the source pays twice. */
        fromAmount: real("fromAmount").notNull(),
        fromAmountUsd: real("fromAmountUsd"),
        fromCurrency: text("fromCurrency").notNull(),
        id: text("id").primaryKey(),
        /**
         * The installment order this pays. No foreign key: transfers -> plans -> transactions -> transfers is a
         * cycle no archive restore order can insert. Deleting a plan clears it on the write path.
         */
        installmentPlanId: text("installmentPlanId"),
        month: integer("month", { mode: "timestamp_ms" }).notNull(),
        note: text("note").notNull().default(""),
        toAccountId: text("toAccountId")
            .notNull()
            .references(() => accounts.id, { onDelete: "cascade" }),
        toAmount: real("toAmount").notNull(),
        toAmountUsd: real("toAmountUsd"),
        toCurrency: text("toCurrency").notNull(),
        updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
    },
    (table) => [
        index("transfers_day_idx").on(table.day),
        index("transfers_fromAccountId_idx").on(table.fromAccountId),
        index("transfers_toAccountId_idx").on(table.toAccountId),
        index("transfers_day_date_idx").on(table.day, table.date),
        index("transfers_installmentPlanId_idx")
            .on(table.installmentPlanId)
            .where(sql`${table.installmentPlanId} IS NOT NULL`),
    ]
);

export const transactions = sqliteTable(
    "transactions",
    {
        accountId: text("accountId").references(() => accounts.id, {
            onDelete: "set null",
        }),
        amount: real("amount").notNull(),
        /**
         * USD at the day's rate, frozen at write; read only to add across currencies. Frozen with `exchangeRate` and
         * `exchangeRateType`; `(null, null, "custom")` is the intentional custom-pending triple.
         */
        amountUsd: real("amountUsd"),
        categoryId: text("categoryId").references(() => categories.id, {
            onDelete: "cascade",
        }),
        currency: text("currency"),
        customColor: text("customColor"),
        date: integer("date", { mode: "timestamp_ms" }).notNull(),
        day: integer("day", { mode: "timestamp_ms" }).notNull(),
        deletedAt: integer("deletedAt", { mode: "timestamp_ms" }),
        details: text("details"),
        emoji: text("emoji"),
        /** The frozen currency-per-USD actual rate, or null while custom is pending. */
        exchangeRate: real("exchangeRate"),
        exchangeRateType: text("exchangeRateType"),
        feeForId: text("feeForId"),
        feeRate: real("feeRate"),
        icon: text("icon"),
        id: text("id").primaryKey(),
        imageColor: text("imageColor"),
        /**
         * The R2 object key, which replicates. Null means the bytes are not in the account yet; a key with no
         * `imageUri` means this device has not fetched them.
         */
        imageKey: text("imageKey"),
        /** This device's photo path. Never replicated: it embeds a container uuid that changes on every app update. */
        imageUri: text("imageUri"),
        income: integer("income", { mode: "boolean" }).notNull(),
        installmentId: text("installmentId"),
        month: integer("month", { mode: "timestamp_ms" }).notNull(),
        note: text("note").notNull().default(""),
        onceRecurring: integer("onceRecurring", { mode: "boolean" }).notNull().default(false),
        paidVia: text("paidVia"),
        /**
         * The schedule's day of month, so February's clamp cannot pull a 31st chain to the 28th for good. Replicated,
         * or peers derive different `occurrenceId`s and double the chain. Null rows fall back to their own day.
         */
        recurringAnchorDay: integer("recurringAnchorDay"),
        recurringCoefficient: integer("recurringCoefficient").notNull().default(1),
        recurringEndDate: integer("recurringEndDate", { mode: "timestamp_ms" }),
        recurringType: integer("recurringType").notNull().default(0),
        /**
         * Days of notice; null is off, 0 is the day itself. Held on whichever row carries `recurringType > 0`, so
         * readers must key off that and a null `deletedAt`. Device-local: a peer's hand-off drops it.
         */
        reminderLeadDays: integer("reminderLeadDays"),
        /** The last lift from Recently Deleted; sync tells a restore from a racing edit by it (convex-sync.md §4). */
        restoredAt: integer("restoredAt", { mode: "timestamp_ms" }),
        /** Set only on a transfer's fee. A lifecycle link, never an exclusion flag: fees count in every aggregate. */
        transferId: text("transferId").references(() => transfers.id, {
            onDelete: "cascade",
        }),
        updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
    },
    (table) => [
        // Partial, here and on `deletedAt`: without ANALYZE, SQLite takes `IS NULL` as selective, so a full index on a
        // mostly-null column would beat the `date` indexes on every live-row query.
        index("transactions_transferId_idx")
            .on(table.transferId)
            .where(sql`${table.transferId} IS NOT NULL`),
        index("transactions_feeForId_idx")
            .on(table.feeForId)
            .where(sql`${table.feeForId} IS NOT NULL`),
        index("transactions_installmentId_idx")
            .on(table.installmentId)
            .where(sql`${table.installmentId} IS NOT NULL`),
        index("transactions_day_idx").on(table.day),
        index("transactions_month_idx").on(table.month),
        index("transactions_categoryId_idx").on(table.categoryId),
        index("transactions_accountId_idx").on(table.accountId),
        index("transactions_tombstone_idx")
            .on(table.deletedAt)
            .where(sql`${table.deletedAt} IS NOT NULL`),
        index("transactions_recurring_idx")
            .on(table.recurringType)
            .where(sql`${table.deletedAt} IS NULL AND ${table.recurringType} > 0`),
        // The composite serves the log's `orderBy(desc(day), desc(date))`, which otherwise cannot walk an index.
        index("transactions_date_idx").on(table.date),
        index("transactions_day_date_idx").on(table.day, table.date),
    ]
);

// Every soft-deleted table indexes `deletedAt`: `isNull(deletedAt)` is the universal read predicate.
export const budgets = sqliteTable(
    "budgets",
    {
        amount: real("amount").notNull(),
        amountUsd: real("amountUsd"),
        categoryId: text("categoryId")
            .references(() => categories.id, { onDelete: "cascade" })
            .unique(),
        currency: text("currency"),
        dateCreated: integer("dateCreated", { mode: "timestamp_ms" }),
        deletedAt: integer("deletedAt", { mode: "timestamp_ms" }),
        green: integer("green", { mode: "boolean" }).notNull().default(false),
        id: text("id").primaryKey(),
        name: text("name"),
        rollover: integer("rollover", { mode: "boolean" }).notNull().default(false),
        startDate: integer("startDate", { mode: "timestamp_ms" }),
        type: integer("type").notNull(),
        updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
    },
    (table) => [index("budgets_deletedAt_idx").on(table.deletedAt)]
);

export const mainBudget = sqliteTable(
    "mainBudget",
    {
        amount: real("amount").notNull(),
        amountUsd: real("amountUsd"),
        currency: text("currency"),
        dateCreated: integer("dateCreated", { mode: "timestamp_ms" }),
        deletedAt: integer("deletedAt", { mode: "timestamp_ms" }),
        green: integer("green", { mode: "boolean" }).notNull().default(false),
        id: text("id").primaryKey(),
        name: text("name"),
        rollover: integer("rollover", { mode: "boolean" }).notNull().default(false),
        startDate: integer("startDate", { mode: "timestamp_ms" }),
        type: integer("type").notNull(),
        updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
    },
    (table) => [index("mainBudget_deletedAt_idx").on(table.deletedAt)]
);

/**
 * An entry with no rows here is attributed wholly to its own `categoryId` (`domain/split.ts`). Parts must sum to
 * the entry's amount; SQLite cannot enforce it, so the write path checks `isBalanced`.
 */
export const transactionSplits = sqliteTable(
    "transactionSplits",
    {
        /** Unsigned, like the entry's own amount: direction comes from `income`. */
        amount: real("amount").notNull(),
        categoryId: text("categoryId").references(() => categories.id),
        deletedAt: integer("deletedAt", { mode: "timestamp_ms" }),
        id: text("id").primaryKey(),
        sortOrder: integer("sortOrder").notNull().default(0),
        transactionId: text("transactionId")
            .notNull()
            .references(() => transactions.id),
        updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
    },
    (table) => [
        index("transactionSplits_transactionId_idx").on(table.transactionId),
        index("transactionSplits_categoryId_idx").on(table.categoryId),
    ]
);

/**
 * Supersedes `transactions.imageUri`/`imageKey`, kept for the migration and unmigrated builds. `sortOrder` picks
 * the entry's face in a list. `imageUri` is device-local, as on `transactions`.
 */
export const transactionPhotos = sqliteTable(
    "transactionPhotos",
    {
        deletedAt: integer("deletedAt", { mode: "timestamp_ms" }),
        id: text("id").primaryKey(),
        imageColor: text("imageColor"),
        imageKey: text("imageKey"),
        imageUri: text("imageUri"),
        sortOrder: integer("sortOrder").notNull().default(0),
        transactionId: text("transactionId")
            .notNull()
            .references(() => transactions.id),
        updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
    },
    (table) => [index("transactionPhotos_transactionId_idx").on(table.transactionId)]
);

/** Progress is the account's balance, so no parallel record of the money can drift (`domain/savings-goal.ts`). */
export const savingsGoals = sqliteTable(
    "savingsGoals",
    {
        accountId: text("accountId")
            .notNull()
            .references(() => accounts.id, { onDelete: "cascade" }),
        currency: text("currency").notNull(),
        dateCreated: integer("dateCreated", { mode: "timestamp_ms" }).notNull(),
        deletedAt: integer("deletedAt", { mode: "timestamp_ms" }),
        /**
         * The rate both frozen figures used, currency per USD. Stored because pruned rate history and rounded amounts
         * cannot recover it.
         */
        exchangeRate: real("exchangeRate"),
        id: text("id").primaryKey(),
        name: text("name").notNull(),
        sortOrder: integer("sortOrder").notNull().default(0),
        /** The balance when the goal was set, frozen: `accountBalanceSeries` only walks 182 days back. */
        startAmount: real("startAmount").notNull().default(0),
        startAmountUsd: real("startAmountUsd"),
        targetAmount: real("targetAmount").notNull(),
        targetAmountUsd: real("targetAmountUsd"),
        /** Required: a target with no deadline has no pace, and the pace is the point. */
        targetDate: integer("targetDate", { mode: "timestamp_ms" }).notNull(),
        updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
    },
    (table) => [
        index("savingsGoals_accountId_idx").on(table.accountId),
        index("savingsGoals_deletedAt_idx").on(table.deletedAt),
    ]
);

/** Payments are transfers naming it or `outsidePayments`; what is paid is derived (`domain/installments.ts`). */
export const installmentPlans = sqliteTable(
    "installmentPlans",
    {
        accountId: text("accountId")
            .notNull()
            .references(() => accounts.id, { onDelete: "cascade" }),
        dateCreated: integer("dateCreated", { mode: "timestamp_ms" }).notNull(),
        deletedAt: integer("deletedAt", { mode: "timestamp_ms" }),
        id: text("id").primaryKey(),
        restoredAt: integer("restoredAt", { mode: "timestamp_ms" }),
        transactionId: text("transactionId")
            .notNull()
            .references(() => transactions.id, { onDelete: "cascade" }),
        updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
    },
    (table) => [
        index("installmentPlans_accountId_idx").on(table.accountId),
        index("installmentPlans_transactionId_idx").on(table.transactionId),
    ]
);

/** Edited singly after generation. `sequence` 0 is the upfront payment; `amount` is in the account's currency. */
export const installments = sqliteTable(
    "installments",
    {
        amount: real("amount").notNull(),
        deletedAt: integer("deletedAt", { mode: "timestamp_ms" }),
        /** A local midnight, the same convention as `transactions.day`. */
        dueDate: integer("dueDate", { mode: "timestamp_ms" }).notNull(),
        id: text("id").primaryKey(),
        planId: text("planId")
            .notNull()
            .references(() => installmentPlans.id, { onDelete: "cascade" }),
        restoredAt: integer("restoredAt", { mode: "timestamp_ms" }),
        sequence: integer("sequence").notNull(),
        updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
    },
    (table) => [index("installments_planId_idx").on(table.planId), index("installments_dueDate_idx").on(table.dueDate)]
);

/**
 * Paid outside Outlayr: nothing leaves an account, but it raises the order's liability balance
 * (`outsidePaymentCells`). `amount` is in the account's currency; `amountUsd` is frozen at `date`.
 */
export const outsidePayments = sqliteTable(
    "outsidePayments",
    {
        amount: real("amount").notNull(),
        amountUsd: real("amountUsd"),
        date: integer("date", { mode: "timestamp_ms" }).notNull(),
        deletedAt: integer("deletedAt", { mode: "timestamp_ms" }),
        id: text("id").primaryKey(),
        planId: text("planId")
            .notNull()
            .references(() => installmentPlans.id, { onDelete: "cascade" }),
        restoredAt: integer("restoredAt", { mode: "timestamp_ms" }),
        updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
    },
    (table) => [index("outsidePayments_planId_idx").on(table.planId)]
);

export const outsideMoves = sqliteTable(
    "outsideMoves",
    {
        accountId: text("accountId")
            .notNull()
            .references(() => accounts.id, { onDelete: "cascade" }),
        amount: real("amount").notNull(),
        amountUsd: real("amountUsd"),
        date: integer("date", { mode: "timestamp_ms" }).notNull(),
        deletedAt: integer("deletedAt", { mode: "timestamp_ms" }),
        id: text("id").primaryKey(),
        note: text("note").notNull().default(""),
        restoredAt: integer("restoredAt", { mode: "timestamp_ms" }),
        updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
    },
    (table) => [index("outsideMoves_accountId_idx").on(table.accountId)]
);

export const tags = sqliteTable(
    "tags",
    {
        color: text("color"),
        deletedAt: integer("deletedAt", { mode: "timestamp_ms" }),
        id: text("id").primaryKey(),
        name: text("name").notNull(),
        sortOrder: integer("sortOrder").notNull().default(0),
        updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
    },
    (table) => [index("tags_deletedAt_idx").on(table.deletedAt)]
);

/**
 * Has its own `id` because replication addresses rows by `localId`. No cascade on either side: links are
 * tombstoned, and a cascade would only hide that the link needs tombstoning too.
 */
export const transactionTags = sqliteTable(
    "transactionTags",
    {
        deletedAt: integer("deletedAt", { mode: "timestamp_ms" }),
        id: text("id").primaryKey(),
        restoredAt: integer("restoredAt", { mode: "timestamp_ms" }),
        tagId: text("tagId")
            .notNull()
            .references(() => tags.id),
        transactionId: text("transactionId")
            .notNull()
            .references(() => transactions.id),
        updatedAt: integer("updatedAt", { mode: "timestamp_ms" }).notNull(),
    },
    (table) => [
        index("transactionTags_transactionId_idx").on(table.transactionId),
        index("transactionTags_tagId_idx").on(table.tagId),
        uniqueIndex("transactionTags_pair_idx")
            .on(table.transactionId, table.tagId)
            .where(sql`${table.deletedAt} IS NULL`),
    ]
);

export const appMeta = sqliteTable("appMeta", {
    key: text("key").primaryKey(),
    value: text("value"),
});

/**
 * Filled by triggers, not repos, since writes happen outside the repos. `seq` is AUTOINCREMENT so a re-queued row
 * gets a new seq that a draining push cannot delete. drizzle-kit ignores triggers and drops them on a table
 * rebuild, so such a migration must re-declare them by hand.
 */
export const outbox = sqliteTable(
    "outbox",
    {
        enqueuedAt: integer("enqueuedAt", { mode: "timestamp_ms" }).notNull(),
        localId: text("localId").notNull(),
        seq: integer("seq").primaryKey({ autoIncrement: true }),
        tableName: text("tableName").notNull(),
    },
    (table) => [uniqueIndex("outbox_row_idx").on(table.tableName, table.localId)]
);

/** One-way replica of Convex `exchangeRates`, refreshed by wipe-and-replace; the key mirrors the server's. */
export const exchangeRates = sqliteTable(
    "exchangeRates",
    {
        /** UTC `YYYY-MM-DD`, matching the server so comparisons stay lexical. */
        date: text("date").notNull(),
        fetchedAt: integer("fetchedAt").notNull(),
        quote: text("quote").notNull(),
        rate: real("rate").notNull(),
        rateType: text("rateType").notNull(),
        source: text("source").notNull(),
    },
    (table) => [primaryKey({ columns: [table.quote, table.rateType, table.date] })]
);
