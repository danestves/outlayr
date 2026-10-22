import { v } from "convex/values";

// Mirrors `WireValue` in apps/native/src/data/sync-engine-core.ts: instants arrive as epoch ms, never a `Date`.
export type WireValue = boolean | number | string | null;

export type WireFields = Record<string, WireValue>;

// Shared by schema.ts and sync.ts so they cannot drift: a column in only one would replicate as silently missing data.
export const replicated = {
    /** Soft-delete tombstone; rows are never removed. */
    deletedAt: v.union(v.number(), v.null()),
    deviceId: v.string(),
    localId: v.string(),
    restoredAt: v.optional(v.union(v.number(), v.null())),
    seq: v.number(),
    /** Client wall clock at the edit. */
    updatedAt: v.number(),
    userId: v.string(),
};

export const categoryFields = {
    color: v.union(v.string(), v.null()),
    dateCreated: v.union(v.number(), v.null()),
    emoji: v.union(v.string(), v.null()),
    icon: v.union(v.string(), v.null()),
    income: v.boolean(),
    name: v.union(v.string(), v.null()),
    parentId: v.union(v.string(), v.null()),
    sortOrder: v.number(),
};

export const transactionFields = {
    accountId: v.union(v.string(), v.null()),
    amount: v.number(),
    amountUsd: v.union(v.number(), v.null()),
    categoryId: v.union(v.string(), v.null()),
    currency: v.union(v.string(), v.null()),
    customColor: v.union(v.string(), v.null()),
    date: v.number(),
    day: v.number(),
    details: v.union(v.string(), v.null()),
    emoji: v.union(v.string(), v.null()),
    exchangeRate: v.union(v.number(), v.null()),
    exchangeRateType: v.union(v.string(), v.null()),
    feeForId: v.optional(v.union(v.string(), v.null())),
    feeRate: v.optional(v.union(v.number(), v.null())),
    icon: v.union(v.string(), v.null()),
    imageColor: v.union(v.string(), v.null()),
    /** A key, not a url: `r2.getUrl` signs for 15 minutes, so every read re-mints from the key. */
    imageKey: v.union(v.string(), v.null()),
    income: v.boolean(),
    installmentId: v.optional(v.union(v.string(), v.null())),
    month: v.number(),
    note: v.string(),
    onceRecurring: v.boolean(),
    paidVia: v.optional(v.union(v.string(), v.null())),
    /** Optional, not just nullable: an older build omits the key, and a required field rejects the whole batch. */
    recurringAnchorDay: v.optional(v.union(v.number(), v.null())),
    recurringCoefficient: v.number(),
    recurringEndDate: v.union(v.number(), v.null()),
    recurringType: v.number(),
    transferId: v.optional(v.union(v.string(), v.null())),
};

export const transferFields = {
    date: v.number(),
    dateCreated: v.number(),
    day: v.number(),
    exchangeRate: v.union(v.number(), v.null()),
    exchangeRateType: v.union(v.string(), v.null()),
    fromAccountId: v.string(),
    fromAmount: v.number(),
    fromAmountUsd: v.union(v.number(), v.null()),
    fromCurrency: v.string(),
    /** Optional for older builds; `push` patches, so an absent key leaves the stored link alone. */
    installmentPlanId: v.optional(v.union(v.string(), v.null())),
    month: v.number(),
    note: v.string(),
    toAccountId: v.string(),
    toAmount: v.number(),
    toAmountUsd: v.union(v.number(), v.null()),
    toCurrency: v.string(),
};

export const accountFields = {
    currency: v.string(),
    customColor: v.union(v.string(), v.null()),
    dateCreated: v.number(),
    emoji: v.union(v.string(), v.null()),
    icon: v.union(v.string(), v.null()),
    imageColor: v.union(v.string(), v.null()),
    imageKey: v.union(v.string(), v.null()),
    initialBalance: v.number(),
    initialBalanceDate: v.number(),
    initialBalanceUsd: v.union(v.number(), v.null()),
    /** Optional for older builds; absent reads as `asset` (`@outlayr/money/account-kind`). */
    kind: v.optional(v.union(v.string(), v.null())),
    name: v.string(),
    sortOrder: v.number(),
};

// `imageUri` is a device-local path that must never replicate; it stays here only so older documents validate.
export const transactionColumns = {
    ...transactionFields,
    // Optional in storage only, for documents older than accounts; the wire keeps it required.
    accountId: v.optional(v.union(v.string(), v.null())),
    imageUri: v.optional(v.union(v.string(), v.null())),
};

export const mainBudgetFields = {
    amount: v.number(),
    amountUsd: v.union(v.number(), v.null()),
    currency: v.union(v.string(), v.null()),
    dateCreated: v.union(v.number(), v.null()),
    green: v.boolean(),
    name: v.union(v.string(), v.null()),
    rollover: v.boolean(),
    startDate: v.union(v.number(), v.null()),
    type: v.number(),
};

export const budgetFields = {
    ...mainBudgetFields,
    categoryId: v.union(v.string(), v.null()),
};

export const savingsGoalFields = {
    accountId: v.string(),
    currency: v.string(),
    dateCreated: v.number(),
    exchangeRate: v.optional(v.union(v.number(), v.null())),
    name: v.string(),
    sortOrder: v.number(),
    /** Optional though NOT NULL locally: `pushRow` validates arguments, so an older build's row rejects the batch. */
    startAmount: v.optional(v.number()),
    startAmountUsd: v.optional(v.union(v.number(), v.null())),
    targetAmount: v.number(),
    targetAmountUsd: v.union(v.number(), v.null()),
    /** Nullable for the same reason; `isReplicated` refuses a dateless row instead. */
    targetDate: v.union(v.number(), v.null()),
};

export const appMetaFields = {
    value: v.union(v.string(), v.null()),
};

export const tagFields = {
    color: v.union(v.string(), v.null()),
    name: v.string(),
    sortOrder: v.number(),
};

export const transactionTagFields = {
    tagId: v.string(),
    transactionId: v.string(),
};

export const transactionPhotoFields = {
    imageColor: v.union(v.string(), v.null()),
    imageKey: v.union(v.string(), v.null()),
    sortOrder: v.number(),
    transactionId: v.string(),
};

export const transactionSplitFields = {
    amount: v.number(),
    categoryId: v.union(v.string(), v.null()),
    sortOrder: v.number(),
    transactionId: v.string(),
};

export const installmentPlanFields = {
    accountId: v.string(),
    dateCreated: v.number(),
    transactionId: v.string(),
};

/** `sequence` 0 is the upfront payment. */
export const installmentFields = {
    amount: v.number(),
    dueDate: v.number(),
    planId: v.string(),
    sequence: v.number(),
};

/** `amount` is in the order's account currency. */
export const outsidePaymentFields = {
    amount: v.number(),
    amountUsd: v.union(v.number(), v.null()),
    date: v.number(),
    planId: v.string(),
};

export const outsideMoveFields = {
    accountId: v.string(),
    amount: v.number(),
    amountUsd: v.union(v.number(), v.null()),
    date: v.number(),
    note: v.string(),
};

const TOMBSTONED_TABLES = [
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
    // After `accounts`: a transfer's two legs are account localIds.
    "transfers",
    "installmentPlans",
    "installments",
    "outsidePayments",
    "outsideMoves",
] as const;

// Pull order. `appMeta` goes last: its identity is a key, so nothing keys off its position.
export const SYNCED_TABLES = [...TOMBSTONED_TABLES, "appMeta"] as const;

export type SyncedTable = (typeof SYNCED_TABLES)[number];

export const FIELDS_BY_TABLE = {
    accounts: accountFields,
    appMeta: appMetaFields,
    budgets: budgetFields,
    categories: categoryFields,
    installmentPlans: installmentPlanFields,
    installments: installmentFields,
    mainBudget: mainBudgetFields,
    outsideMoves: outsideMoveFields,
    outsidePayments: outsidePaymentFields,
    savingsGoals: savingsGoalFields,
    tags: tagFields,
    transactionPhotos: transactionPhotoFields,
    transactionSplits: transactionSplitFields,
    transactionTags: transactionTagFields,
    transactions: transactionFields,
    transfers: transferFields,
} as const;

interface Versioned {
    deletedAt: number | null;
    deviceId: string;
    restoredAt?: number | null;
    updatedAt: number;
}

// A delete or restore opens a new era, and a later era wins outright. A tombstone carrying `restoredAt` was
// deleted after that restore whatever its own clock says, so its era is never earlier.
function era(version: Versioned): number {
    const restoredAt = version.restoredAt ?? 0;
    return version.deletedAt === null ? restoredAt : Math.max(version.deletedAt, restoredAt);
}

// R1 then R2 from docs/internals/convex-sync.md §4. Ties must break exactly as in apps/native's sync-engine-core
// or the two never converge, and an identical row does not win, so a re-push is a no-op.
export function incomingWins(incoming: Versioned, existing: Versioned | null): boolean {
    if (existing === null) {
        return true;
    }
    const incomingEra = era(incoming);
    const existingEra = era(existing);
    if (incomingEra !== existingEra) {
        return incomingEra > existingEra;
    }
    const incomingDeleted = incoming.deletedAt !== null;
    const existingDeleted = existing.deletedAt !== null;
    if (incomingDeleted !== existingDeleted) {
        return incomingDeleted;
    }
    if (incoming.updatedAt !== existing.updatedAt) {
        return incoming.updatedAt > existing.updatedAt;
    }
    return incoming.deviceId > existing.deviceId;
}
