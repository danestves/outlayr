import type { AccountKind } from "@outlayr/money/account-kind";

import type { CategoryPreset } from "@/data/categories-core";

/**
 * Money Manager (Orange Dog, `.mmbackup`) rows, in major units and resolved currencies.
 * Deleted rows are kept, flagged.
 */
export interface MmAccount {
    uid: string;
    title: string;
    /** Money Manager's own icon name, e.g. `credit_card`. */
    mmIcon: string | null;
    /** `#RRGGBB`, from the ARGB int. */
    mmColor: string | null;
    currency: string;
    /** Hidden in Money Manager (`isActive = 0`). */
    hidden: boolean;
    removed: boolean;
    /** Money Manager's cached balance; null when the backup has none. */
    storedBalance: number | null;
    position: number;
}

export interface MmCategory {
    uid: string;
    title: string;
    income: boolean;
    mmIcon: string | null;
    mmColor: string | null;
    removed: boolean;
    /** Monthly limit in the backup's default currency; null when unset. */
    limit: number | null;
    position: number;
}

export interface MmEntry {
    uid: string;
    income: boolean;
    /** Local calendar day, `YYYY-MM-DD`. */
    day: string;
    /** When Money Manager wrote it, epoch ms; orders entries within a day. */
    createdAt: number;
    /** The amount as entered, always positive. */
    amount: number;
    currency: string;
    /** The same money in the account's currency, when Money Manager recorded it. */
    accountAmount: number | null;
    /** The same money in the backup's default currency. */
    defaultAmount: number | null;
    accountUid: string | null;
    categoryUid: string | null;
    note: string;
}

export interface MmTransfer {
    uid: string;
    day: string;
    createdAt: number;
    fromAccountUid: string | null;
    toAccountUid: string | null;
    fromAmount: number;
    fromCurrency: string;
    toAmount: number;
    toCurrency: string;
    note: string;
}

export interface MmSnapshot {
    version: number;
    defaultCurrency: string;
    accounts: MmAccount[];
    categories: MmCategory[];
    /** Live entries only. */
    entries: MmEntry[];
    transfers: MmTransfer[];
    removedEntryCount: number;
    reminderCount: number;
}

export type MmArchiveError =
    | { kind: "notBackup" }
    | { kind: "realbyte" }
    | { kind: "damaged" }
    | { kind: "newer"; version: number };

/** What the import needs to know about the Outlayr ledger it lands in. */
export interface OutlayrLedgerState {
    currency: string;
    currencyChosen: boolean;
    accounts: readonly { id: string; name: string; currency: string; kind: AccountKind }[];
    categories: readonly {
        id: string;
        name: string;
        income: boolean;
        parentId: string | null;
        icon: string | null;
        color: string | null;
        preset: string | null;
        customName: boolean;
    }[];
    budgetCategoryIds: readonly string[];
    /** Live entries; `date` is epoch ms. */
    entries: readonly { date: number; amount: number; currency: string; income: boolean }[];
}

export type MmAccountGroup = "open" | "hidden" | "deleted";

export interface MmAccountView {
    uid: string;
    title: string;
    group: MmAccountGroup;
    currency: string;
    /** Outlayr category-icon registry key. */
    icon: string;
    /** Outlayr palette color. */
    color: string;
    entryCount: number;
    balance: number | null;
    suggestedKind: AccountKind;
}

export interface MmCategoryView {
    uid: string;
    title: string;
    income: boolean;
    icon: string;
    color: string;
    entryCount: number;
    /** Sum of its entries' default-currency amounts. */
    total: number;
    limit: number | null;
}

export interface MmTransferPair {
    outUid: string;
    inUid: string;
    day: string;
    fromAccountUid: string;
    toAccountUid: string;
    amount: number;
    currency: string;
}

export interface MmBalanceGap {
    accountUid: string;
    currency: string;
    stored: number;
    computed: number;
}

export interface MmOverlap {
    /** First local day Outlayr has an entry on, `YYYY-MM-DD`. */
    outlayrFirstDay: string;
    mmEntries: number;
    outlayrEntries: number;
    /** Money Manager entries with an Outlayr entry on the same day, amount, currency and direction. */
    matches: number;
}

export interface MmAnalysis {
    entryCount: number;
    expenseCount: number;
    incomeCount: number;
    transferCount: number;
    firstDay: string | null;
    lastDay: string | null;
    perYear: readonly { year: number; count: number }[];
    accounts: readonly MmAccountView[];
    categories: readonly MmCategoryView[];
    /** Entries whose account was deleted in Money Manager, or is missing. */
    orphanedEntryCount: number;
    uncategorized: { expense: number; income: number; pairs: readonly MmTransferPair[] };
    balanceGaps: readonly MmBalanceGap[];
    currencies: readonly string[];
    removedEntryCount: number;
    removedAccountCount: number;
    reminderCount: number;
    /** Null when the Outlayr ledger has no entry inside the backup's range. */
    overlap: MmOverlap | null;
}

export type AccountTarget =
    | { kind: "new"; accountKind: AccountKind }
    /** Joins another Money Manager account in this import (same currency). */
    | { kind: "merge"; intoUid: string }
    /** Joins an account already in Outlayr (same currency). */
    | { kind: "existing"; accountId: string }
    | { kind: "skip" };

export type CategoryTarget =
    | { kind: "existing"; categoryId: string }
    | { kind: "preset"; presetName: string }
    | { kind: "new" }
    /**
     * A subcategory named after the Money Manager category, under an existing category or another
     * category's target.
     */
    | { kind: "sub"; parent: { categoryId: string } | { presetName: string } | { mmUid: string } }
    | { kind: "skip" };

export type UncategorizedChoice = "leave" | "review" | "other";

export type StartChoice = { kind: "all" } | { kind: "cutoff" } | { kind: "skipMatches" };

export interface MmChoices {
    accounts: Record<string, AccountTarget>;
    categoryMode: "match" | "keep";
    categories: Record<string, CategoryTarget>;
    pairsAsTransfers: boolean;
    uncategorized: UncategorizedChoice;
    /** Money Manager category uid → whether its limit becomes a monthly budget. */
    budgets: Record<string, boolean>;
    /** Money Manager account uid → whether the opening balance is set to land on Money Manager's balance. */
    matchBalances: Record<string, boolean>;
    start: StartChoice;
}

export interface PlannedAccount {
    key: string;
    name: string;
    currency: string;
    kind: AccountKind;
    icon: string;
    color: string;
    initialBalance: number;
    initialBalanceDate: Date;
    /** Set when the account already exists in Outlayr; nothing is created. */
    existingId: string | null;
    /** Apply only sees the plan, so the folded Money Manager balance travels with the account. */
    expectedBalance: number | null;
}

export interface PlannedCategory {
    key: string;
    name: string;
    income: boolean;
    icon: string;
    color: string;
    /** Another planned category's key, or an existing Outlayr category id. */
    parent: { key: string } | { categoryId: string } | null;
    existingId: string | null;
    preset?: CategoryPreset | null;
    renamesExisting?: boolean;
}

export interface PlannedBudget {
    categoryKey: string;
    amount: number;
}

export interface PlannedEntry {
    accountKey: string | null;
    categoryKey: string | null;
    amount: number;
    currency: string;
    date: Date;
    income: boolean;
    note: string;
    /** Currency per USD; null lets Outlayr resolve the official rate. */
    exchangeRate: number | null;
    unreviewed: boolean;
}

export interface PlannedTransfer {
    fromAccountKey: string;
    toAccountKey: string;
    fromAmount: number;
    fromCurrency: string;
    toAmount: number;
    toCurrency: string;
    date: Date;
    note: string;
}

export interface MmImportPlan {
    /** Set when the ledger has no chosen currency yet: the backup's default becomes it. */
    ledgerCurrency: string | null;
    accounts: PlannedAccount[];
    categories: PlannedCategory[];
    budgets: PlannedBudget[];
    entries: PlannedEntry[];
    transfers: PlannedTransfer[];
}

/** Everything one import created, kept so "Undo import" removes exactly that. */
export interface MmImportRecord {
    importedAt: number;
    accountIds: string[];
    categoryIds: string[];
    budgetIds: string[];
    transactionIds: string[];
    transferIds: string[];
    /** Planned account key → Outlayr id, created or existing. */
    accountKeys: Record<string, string>;
    /** Money Manager's balance per Outlayr account id, in that account's currency. */
    expectedBalances: Record<string, number>;
    /** Accounts whose opening balance was set so they land on Money Manager's balance. */
    adjustedAccountIds: string[];
    renamedCategories?: { id: string; previous: string; imported: string }[];
}

export interface MmBalanceCheck {
    accountId: string;
    name: string;
    currency: string;
    icon: string | null;
    color: string | null;
    balance: number;
    expected: number;
    matches: boolean;
    /** The opening balance was set to make it match. */
    adjusted: boolean;
}

export interface MmUndoCounts {
    accounts: number;
    budgets: number;
    categories: number;
    transactions: number;
    transfers: number;
}
