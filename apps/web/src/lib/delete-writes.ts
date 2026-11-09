import { settingsOf } from "@outlayr/backend/confect/ledgerView";
import type { LedgerBooks } from "@outlayr/backend/confect/ledgerView";
import { FIELDS_BY_TABLE } from "@outlayr/backend/confect/lib/syncTables";
import { cardFeeValues, savedFeeInput } from "@outlayr/money/card-fee";
import { deletionPlan } from "@outlayr/money/entry-deletion";
import { canonicalOccurrence, occurrenceFeeId, successorRow } from "@outlayr/money/occurrence";
import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import * as Effect from "effect/Effect";

import { nextRow, ratesLookup } from "./account-writes";
import type { CommitRow } from "./ledger-committer";

type Doc = LedgerBooks["transactions"][number];

const withId = <Row extends { localId: string }>(rows: readonly Row[]) =>
    rows.map((row) => ({ ...row, id: row.localId }));

// The columns native's database fills in by default, which a push must spell out.
const ENTRY_DEFAULTS = {
    customColor: null,
    details: null,
    emoji: null,
    exchangeRate: null,
    exchangeRateType: null,
    icon: null,
    imageColor: null,
    imageKey: null,
    onceRecurring: false,
    recurringCoefficient: 1,
    recurringEndDate: null,
    recurringType: RECURRING_TYPE.none,
};

/** A shared rule's row, in Dates and under `id`, as the row a push sends. */
export function entryPush<Row extends { id: string }>(row: Row, at: number): CommitRow {
    const merged = new Map<string, unknown>(Object.entries({ ...ENTRY_DEFAULTS, ...row }));
    const fields = Object.fromEntries(
        Object.keys(FIELDS_BY_TABLE.transactions).flatMap((key) => {
            const value = merged.get(key);
            if (value === undefined) {
                return [];
            }
            return [[key, value instanceof Date ? value.getTime() : value]];
        })
    );
    // SAFETY: the shared rules build `transactions` rows, and the arm's own schema re-checks them at push.
    return {
        deletedAt: null,
        fields,
        localId: row.id,
        restoredAt: null,
        table: "transactions",
        updatedAt: at,
    } as CommitRow;
}

/** The next charge a deleted carrier hands its schedule to, with its card fee. Empty when no peer needs one. */
function successorPush(books: LedgerBooks, carrier: Doc, at: number): CommitRow[] {
    const successor = successorRow(
        {
            ...carrier,
            accountId: carrier.accountId ?? null,
            date: new Date(carrier.date),
            id: carrier.localId,
            imageUri: null,
            recurringAnchorDay: carrier.recurringAnchorDay ?? null,
            recurringEndDate: carrier.recurringEndDate === null ? null : new Date(carrier.recurringEndDate),
            reminderLeadDays: null,
        },
        new Date(at)
    );
    // An existing id is the same charge from another device, and it may carry an edit or a deletion.
    if (successor === null || books.transactions.some((row) => row.localId === successor.id)) {
        return [];
    }
    const lookup = ratesLookup(books);
    const row = Effect.runSync(canonicalOccurrence(lookup, successor, settingsOf(books.appMeta).currency));
    const fee = books.transactions.find((doc) => doc.deletedAt === null && doc.feeForId === carrier.localId);
    if (fee?.currency == null) {
        return [entryPush(row, at)];
    }
    const values = Effect.runSync(
        cardFeeValues(
            lookup,
            row.id,
            row,
            savedFeeInput({ ...fee, currency: fee.currency, feeRate: fee.feeRate ?? null })
        )
    );
    // Fee first: a successor already written makes a retry skip both, which would lose a fee in an unwritten batch.
    return [entryPush({ ...values, id: occurrenceFeeId(row.id) }, at), entryPush(row, at)];
}

/**
 * The rows that delete these entries and transfers, as native's delete does. Push batches commit separately, so what
 * was asked for goes last: a push that dies midway leaves it in the list, and deleting again finishes the rest.
 */
export function deletionOf(books: LedgerBooks, ids: Iterable<string>, at: number) {
    const wanted = new Set(ids);
    const gone = deletionPlan(
        {
            installmentPlans: withId(books.installmentPlans),
            installments: withId(books.installments),
            outsidePayments: withId(books.outsidePayments),
            transactions: withId(books.transactions),
            transfers: withId(books.transfers),
        },
        wanted
    );
    const asked = books.transactions.filter((row) => gone.transactions.has(row.localId) && wanted.has(row.localId));
    const tombstone = { deletedAt: at };
    return {
        count: [...wanted].filter((id) => gone.transactions.has(id) || gone.transfers.has(id)).length,
        rows: [
            ...asked.flatMap((row) => successorPush(books, row, at)),
            ...books.transactions
                .filter((row) => gone.transactions.has(row.localId) && !wanted.has(row.localId))
                .map((row) => nextRow("transactions", row, { ...tombstone, accountId: row.accountId ?? null }, at)),
            ...books.transfers
                .filter((row) => gone.transfers.has(row.localId))
                .map((row) => nextRow("transfers", row, tombstone, at)),
            ...books.installments
                .filter((row) => gone.installments.has(row.localId))
                .map((row) => nextRow("installments", row, tombstone, at)),
            ...books.outsidePayments
                .filter((row) => gone.outsidePayments.has(row.localId))
                .map((row) => nextRow("outsidePayments", row, tombstone, at)),
            ...books.installmentPlans
                .filter((row) => gone.installmentPlans.has(row.localId))
                .map((row) => nextRow("installmentPlans", row, tombstone, at)),
            // The tombstone retires to `none`, which is how deleting the pending charge stops a subscription.
            ...asked.map((row) =>
                nextRow(
                    "transactions",
                    row,
                    { ...tombstone, accountId: row.accountId ?? null, recurringType: RECURRING_TYPE.none },
                    at
                )
            ),
        ],
    };
}
