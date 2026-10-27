import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { Docs, TransactionsDoc } from "./_generated/docs";
import {
    accountFields,
    appMetaFields,
    budgetFields,
    categoryFields,
    FIELDS_BY_TABLE,
    installmentFields,
    installmentPlanFields,
    outsideMoveFields,
    outsidePaymentFields,
    mainBudgetFields,
    replicated,
    SYNCED_TABLES,
    savingsGoalFields,
    tagFields,
    transactionFields,
    transactionAttachmentFields,
    transactionPhotoFields,
    transactionSplitFields,
    transactionTagFields,
    transferFields,
} from "./lib/syncTables";
import type { SyncedTable, WireFields, WireValue } from "./lib/syncTables";

// Convex reads at most 4,096 index ranges per transaction and push does one lookup per row, so 500 is an 8x margin.
export const PUSH_BATCH_LIMIT = 500;

export const PULL_PAGE_LIMIT = 1000;

const tombstone = {
    deletedAt: replicated.deletedAt,
    restoredAt: replicated.restoredAt,
    updatedAt: replicated.updatedAt,
};

const pushArm = <const Table extends SyncedTable, const Fields extends Schema.Struct.Fields>(
    table: Table,
    fields: Fields
) =>
    Schema.Struct({
        ...tombstone,
        fields: Schema.Struct(fields),
        localId: Schema.String,
        table: Schema.Literal(table),
    });

// A row names its own table so a batch keeps the outbox's edit order across tables; sorting by table breaks causality.
export const PushRow = Schema.Union([
    pushArm("categories", categoryFields),
    pushArm("transactions", transactionFields),
    pushArm("budgets", budgetFields),
    pushArm("mainBudget", mainBudgetFields),
    pushArm("savingsGoals", savingsGoalFields),
    pushArm("tags", tagFields),
    pushArm("transactionTags", transactionTagFields),
    pushArm("transactionAttachments", transactionAttachmentFields),
    pushArm("transactionPhotos", transactionPhotoFields),
    pushArm("transactionSplits", transactionSplitFields),
    pushArm("accounts", accountFields),
    pushArm("transfers", transferFields),
    pushArm("installmentPlans", installmentPlanFields),
    pushArm("installments", installmentFields),
    pushArm("outsidePayments", outsidePaymentFields),
    pushArm("outsideMoves", outsideMoveFields),
    Schema.Struct({
        deletedAt: Schema.Null,
        fields: Schema.Struct(appMetaFields),
        localId: Schema.String,
        table: Schema.Literal("appMeta"),
        updatedAt: Schema.Number,
    }),
]);

export type PushRow = typeof PushRow.Type;

export const SyncedTableName = Schema.Literals(SYNCED_TABLES);

export const PulledRow = Schema.Struct({
    deletedAt: Schema.NullOr(Schema.Number),
    deviceId: Schema.String,
    fields: Schema.Record(Schema.String, Schema.Any),
    localId: Schema.String,
    restoredAt: Schema.NullOr(Schema.Number),
    seq: Schema.Number,
    table: SyncedTableName,
    updatedAt: Schema.Number,
});

export type SyncedDoc = Docs[SyncedTable];

export class AccountDeleting extends Schema.TaggedError<AccountDeleting>()("AccountDeleting", {
    message: Schema.String.pipe(
        Schema.withConstructorDefault(Effect.succeed("This account is being deleted and can no longer accept changes"))
    ),
}) {}

export class PushTooLarge extends Schema.TaggedError<PushTooLarge>()("PushTooLarge", {
    limit: Schema.Number,
    rows: Schema.Number,
}) {
    override get message(): string {
        return `A push carries at most ${this.limit} rows; got ${this.rows}`;
    }
}

export function versioned(doc: SyncedDoc) {
    return {
        deletedAt: "deletedAt" in doc ? doc.deletedAt : null,
        deviceId: doc.deviceId,
        restoredAt: "restoredAt" in doc ? doc.restoredAt : null,
        updatedAt: doc.updatedAt,
    };
}

const TRANSACTION_VALUATION_FIELDS = new Set(["amountUsd", "exchangeRate", "exchangeRateType"]);
const TRANSACTION_LEGACY_OPTIONAL_NULLABLE_FIELDS = new Set<keyof typeof transactionFields>([
    "accountId",
    "recurringAnchorDay",
    "transferId",
    "feeForId",
    "feeRate",
    "paidVia",
    "installmentId",
]);

function transactionFieldsEqual(
    field: keyof typeof transactionFields,
    stored: WireValue | undefined,
    incoming: WireValue | undefined
): boolean {
    if (TRANSACTION_LEGACY_OPTIONAL_NULLABLE_FIELDS.has(field)) {
        return Object.is(stored ?? null, incoming ?? null);
    }
    return Object.is(stored, incoming);
}

export function transactionPolicyTieDecision(row: PushRow, existing: SyncedDoc | null): "existing" | "incoming" | null {
    if (
        row.table !== "transactions" ||
        existing === null ||
        row.deletedAt !== null ||
        !("deletedAt" in existing) ||
        existing.deletedAt !== null ||
        row.updatedAt !== existing.updatedAt ||
        (row.restoredAt ?? null) !== (existing.restoredAt ?? null)
    ) {
        return null;
    }
    // SAFETY: the guard above returned unless `row.table` is "transactions", the table `existing` came from.
    const stored = existing as TransactionsDoc;
    const incoming = row.fields;
    // SAFETY: `Object.keys` widens to string[]; the keys are this object's own.
    for (const field of Object.keys(transactionFields) as (keyof typeof transactionFields)[]) {
        if (
            !(TRANSACTION_VALUATION_FIELDS.has(field) || transactionFieldsEqual(field, stored[field], incoming[field]))
        ) {
            return null;
        }
    }
    const storedPendingCustom =
        stored.exchangeRateType === "custom" && stored.exchangeRate === null && stored.amountUsd === null;
    const incomingPendingCustom =
        incoming.exchangeRateType === "custom" && incoming.exchangeRate === null && incoming.amountUsd === null;
    if (storedPendingCustom === incomingPendingCustom) {
        return null;
    }
    const otherPolicy = storedPendingCustom ? incoming.exchangeRateType : stored.exchangeRateType;
    if (otherPolicy !== "official") {
        return null;
    }
    return incomingPendingCustom ? "incoming" : "existing";
}

type StoredDocument = Record<string, WireValue | undefined> & {
    deletedAt?: number | null;
    restoredAt?: number | null;
    key?: string;
    localId?: string;
};

export function toWire(table: SyncedTable, doc: SyncedDoc) {
    const fieldNames = Object.keys(FIELDS_BY_TABLE[table]);
    const source: StoredDocument = doc;
    const fields: WireFields = {};
    for (const name of fieldNames) {
        const value = source[name];
        if (value !== undefined) {
            fields[name] = value;
        }
    }
    const localId = source.localId ?? source.key;
    if (localId === undefined) {
        // Schema drift, not bad data: a stand-in id would have the client adopt the row afresh on every pull.
        throw new Error(`Synced row in ${table} carries neither localId nor key`);
    }
    return {
        deletedAt: source.deletedAt ?? null,
        deviceId: doc.deviceId,
        fields,
        localId,
        restoredAt: source.restoredAt ?? null,
        seq: doc.seq,
        table,
        updatedAt: doc.updatedAt,
    };
}
