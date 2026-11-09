import { RECURRING_TYPE } from "./recurrence";

// The one mark left on a scrubbed tombstone: `deletedTransactionsQuery` reads tombstones, and this tells an erase's
// wreckage from a single deleted entry the user may want back.
export const ERASED_DATE = new Date(0);

// Keeps only what replication needs (id, `deletedAt`, `updatedAt`); not-null columns take a neutral value. The schedule
// is retired to `none` so `repairOrphanedRecurrence` can't mint a successor from an erased row.
export const ERASED_TRANSACTION = {
    accountId: null,
    amount: 0,
    amountUsd: null,
    categoryId: null,
    currency: null,
    customColor: null,
    date: ERASED_DATE,
    day: ERASED_DATE,
    details: null,
    emoji: null,
    exchangeRate: null,
    exchangeRateType: null,
    feeForId: null,
    feeRate: null,
    icon: null,
    imageColor: null,
    imageKey: null,
    imageUri: null,
    income: false,
    installmentId: null,
    month: ERASED_DATE,
    note: "",
    onceRecurring: false,
    paidVia: null,
    receipt: null,
    recurringAnchorDay: null,
    recurringCoefficient: 1,
    recurringEndDate: null,
    recurringType: RECURRING_TYPE.none,
    reminderLeadDays: null,
    transferId: null,
    unreviewed: false,
} as const;

/** The two account ids stay: both are `notNull`, so blanking them would point the row at no account. */
export const ERASED_TRANSFER = {
    date: ERASED_DATE,
    dateCreated: ERASED_DATE,
    day: ERASED_DATE,
    exchangeRate: null,
    exchangeRateType: null,
    fromAmount: 0,
    fromAmountUsd: null,
    fromCurrency: "",
    installmentPlanId: null,
    month: ERASED_DATE,
    note: "",
    toAmount: 0,
    toAmountUsd: null,
    toCurrency: "",
} as const;

export const TOMBSTONED_BUDGET = {
    amount: 0,
    amountUsd: null,
    categoryId: null,
    currency: null,
    dateCreated: null,
    green: false,
    name: null,
    rollover: false,
    startDate: null,
    type: 0,
} as const;

export const TOMBSTONED_MAIN_BUDGET = {
    amount: 0,
    amountUsd: null,
    currency: null,
    dateCreated: null,
    green: false,
    name: null,
    rollover: false,
    startDate: null,
    type: 0,
} as const;
