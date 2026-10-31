import * as Schema from "effect/Schema";

// Mirrors `WireValue` in apps/native/src/data/sync-engine-core.ts: instants arrive as epoch ms, never a `Date`.
export type WireValue = boolean | number | string | null;

export type WireFields = Record<string, WireValue>;

// Replicated tables follow docs/internals/convex-sync.md: foreign keys hold `localId`s, never Convex Ids.
// Shared by tables/ and sync.ts so they cannot drift: a column in only one would replicate as silently missing data.
export const replicated = {
    /** Soft-delete tombstone; rows are never removed. */
    deletedAt: Schema.NullOr(Schema.Number),
    deviceId: Schema.String,
    localId: Schema.String,
    restoredAt: Schema.optional(Schema.NullOr(Schema.Number)),
    seq: Schema.Number,
    /** Client wall clock at the edit. */
    updatedAt: Schema.Number,
    userId: Schema.String,
};

export const categoryFields = {
    color: Schema.NullOr(Schema.String),
    dateCreated: Schema.NullOr(Schema.Number),
    emoji: Schema.NullOr(Schema.String),
    icon: Schema.NullOr(Schema.String),
    income: Schema.Boolean,
    name: Schema.NullOr(Schema.String),
    parentId: Schema.NullOr(Schema.String),
    sortOrder: Schema.Number,
};

export const transactionFields = {
    accountId: Schema.NullOr(Schema.String),
    amount: Schema.Number,
    amountUsd: Schema.NullOr(Schema.Number),
    categoryId: Schema.NullOr(Schema.String),
    currency: Schema.NullOr(Schema.String),
    customColor: Schema.NullOr(Schema.String),
    date: Schema.Number,
    day: Schema.Number,
    details: Schema.NullOr(Schema.String),
    emoji: Schema.NullOr(Schema.String),
    exchangeRate: Schema.NullOr(Schema.Number),
    exchangeRateType: Schema.NullOr(Schema.String),
    feeForId: Schema.optional(Schema.NullOr(Schema.String)),
    feeRate: Schema.optional(Schema.NullOr(Schema.Number)),
    icon: Schema.NullOr(Schema.String),
    imageColor: Schema.NullOr(Schema.String),
    /** A key, not a url: `r2.getUrl` signs for 15 minutes, so every read re-mints from the key. */
    imageKey: Schema.NullOr(Schema.String),
    income: Schema.Boolean,
    installmentId: Schema.optional(Schema.NullOr(Schema.String)),
    month: Schema.Number,
    note: Schema.String,
    onceRecurring: Schema.Boolean,
    paidVia: Schema.optional(Schema.NullOr(Schema.String)),
    receipt: Schema.optional(Schema.NullOr(Schema.String)),
    /** Optional, not just nullable: an older build omits the key, and a required field rejects the whole batch. */
    recurringAnchorDay: Schema.optional(Schema.NullOr(Schema.Number)),
    recurringCoefficient: Schema.Number,
    recurringEndDate: Schema.NullOr(Schema.Number),
    recurringType: Schema.Number,
    transferId: Schema.optional(Schema.NullOr(Schema.String)),
};

export const transferFields = {
    date: Schema.Number,
    dateCreated: Schema.Number,
    day: Schema.Number,
    exchangeRate: Schema.NullOr(Schema.Number),
    exchangeRateType: Schema.NullOr(Schema.String),
    fromAccountId: Schema.String,
    fromAmount: Schema.Number,
    fromAmountUsd: Schema.NullOr(Schema.Number),
    fromCurrency: Schema.String,
    /** Optional for older builds; `push` patches, so an absent key leaves the stored link alone. */
    installmentPlanId: Schema.optional(Schema.NullOr(Schema.String)),
    month: Schema.Number,
    note: Schema.String,
    toAccountId: Schema.String,
    toAmount: Schema.Number,
    toAmountUsd: Schema.NullOr(Schema.Number),
    toCurrency: Schema.String,
};

export const accountFields = {
    currency: Schema.String,
    customColor: Schema.NullOr(Schema.String),
    dateCreated: Schema.Number,
    emoji: Schema.NullOr(Schema.String),
    icon: Schema.NullOr(Schema.String),
    imageColor: Schema.NullOr(Schema.String),
    imageKey: Schema.NullOr(Schema.String),
    initialBalance: Schema.Number,
    initialBalanceDate: Schema.Number,
    initialBalanceUsd: Schema.NullOr(Schema.Number),
    /** Optional for older builds; absent reads as `asset` (`@outlayr/money/account-kind`). */
    kind: Schema.optional(Schema.NullOr(Schema.String)),
    name: Schema.String,
    sortOrder: Schema.Number,
};

// `imageUri` is a device-local path that must never replicate; it stays here only so older documents validate.
export const transactionColumns = {
    ...transactionFields,
    // Optional in storage only, for documents older than accounts; the wire keeps it required.
    accountId: Schema.optional(Schema.NullOr(Schema.String)),
    imageUri: Schema.optional(Schema.NullOr(Schema.String)),
};

export const mainBudgetFields = {
    amount: Schema.Number,
    amountUsd: Schema.NullOr(Schema.Number),
    currency: Schema.NullOr(Schema.String),
    dateCreated: Schema.NullOr(Schema.Number),
    green: Schema.Boolean,
    name: Schema.NullOr(Schema.String),
    rollover: Schema.Boolean,
    startDate: Schema.NullOr(Schema.Number),
    type: Schema.Number,
};

export const budgetFields = {
    ...mainBudgetFields,
    categoryId: Schema.NullOr(Schema.String),
};

export const savingsGoalFields = {
    accountId: Schema.String,
    currency: Schema.String,
    dateCreated: Schema.Number,
    exchangeRate: Schema.optional(Schema.NullOr(Schema.Number)),
    name: Schema.String,
    sortOrder: Schema.Number,
    /** Optional though NOT NULL locally: `pushRow` validates arguments, so an older build's row rejects the batch. */
    startAmount: Schema.optional(Schema.Number),
    startAmountUsd: Schema.optional(Schema.NullOr(Schema.Number)),
    targetAmount: Schema.Number,
    targetAmountUsd: Schema.NullOr(Schema.Number),
    /** Nullable for the same reason; `isReplicated` refuses a dateless row instead. */
    targetDate: Schema.NullOr(Schema.Number),
};

export const appMetaFields = {
    value: Schema.NullOr(Schema.String),
};

export const tagFields = {
    color: Schema.NullOr(Schema.String),
    name: Schema.String,
    sortOrder: Schema.Number,
};

export const transactionTagFields = {
    tagId: Schema.String,
    transactionId: Schema.String,
};

export const transactionPhotoFields = {
    imageColor: Schema.NullOr(Schema.String),
    imageKey: Schema.NullOr(Schema.String),
    sortOrder: Schema.Number,
    transactionId: Schema.String,
};

export const transactionAttachmentFields = {
    imageKey: Schema.NullOr(Schema.String),
    name: Schema.NullOr(Schema.String),
    sortOrder: Schema.Number,
    transactionId: Schema.String,
};

export const transactionSplitFields = {
    amount: Schema.Number,
    categoryId: Schema.NullOr(Schema.String),
    sortOrder: Schema.Number,
    transactionId: Schema.String,
};

export const installmentPlanFields = {
    accountId: Schema.String,
    dateCreated: Schema.Number,
    transactionId: Schema.String,
};

/** `sequence` 0 is the upfront payment. */
export const installmentFields = {
    amount: Schema.Number,
    dueDate: Schema.Number,
    planId: Schema.String,
    sequence: Schema.Number,
};

/** `amount` is in the order's account currency. */
export const outsidePaymentFields = {
    amount: Schema.Number,
    amountUsd: Schema.NullOr(Schema.Number),
    date: Schema.Number,
    planId: Schema.String,
};

export const budgetPlanFields = {
    amount: Schema.NullOr(Schema.Number),
    categoryId: Schema.String,
    currency: Schema.NullOr(Schema.String),
    month: Schema.Number,
};

export const profileFields = {
    customColor: Schema.NullOr(Schema.String),
    dateCreated: Schema.Number,
    emoji: Schema.NullOr(Schema.String),
    icon: Schema.NullOr(Schema.String),
    imageColor: Schema.NullOr(Schema.String),
    imageKey: Schema.NullOr(Schema.String),
    name: Schema.String,
    sortOrder: Schema.Number,
};

export const outsideMoveFields = {
    accountId: Schema.String,
    amount: Schema.Number,
    amountUsd: Schema.NullOr(Schema.Number),
    date: Schema.Number,
    note: Schema.String,
};

const TOMBSTONED_TABLES = [
    "categories",
    "transactions",
    "budgets",
    "mainBudget",
    "budgetPlans",
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
    "transactionAttachments",
    "profiles",
] as const;

// Pull order. `appMeta` goes last: its identity is a key, so nothing keys off its position.
export const SYNCED_TABLES = [...TOMBSTONED_TABLES, "appMeta"] as const;

export type SyncedTable = (typeof SYNCED_TABLES)[number];

export const FIELDS_BY_TABLE = {
    accounts: accountFields,
    appMeta: appMetaFields,
    budgetPlans: budgetPlanFields,
    budgets: budgetFields,
    categories: categoryFields,
    installmentPlans: installmentPlanFields,
    installments: installmentFields,
    mainBudget: mainBudgetFields,
    outsideMoves: outsideMoveFields,
    outsidePayments: outsidePaymentFields,
    profiles: profileFields,
    savingsGoals: savingsGoalFields,
    tags: tagFields,
    transactionAttachments: transactionAttachmentFields,
    transactionPhotos: transactionPhotoFields,
    transactionSplits: transactionSplitFields,
    transactionTags: transactionTagFields,
    transactions: transactionFields,
    transfers: transferFields,
} as const;

type ImageKeyTable = {
    [Table in SyncedTable]: "imageKey" extends keyof (typeof FIELDS_BY_TABLE)[Table] ? Table : never;
}[SyncedTable];

export const IMAGE_KEY_TABLES = SYNCED_TABLES.filter(
    (table): table is ImageKeyTable => "imageKey" in FIELDS_BY_TABLE[table]
);

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
