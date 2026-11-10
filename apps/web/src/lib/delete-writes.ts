import { settingsOf } from "@outlayr/backend/confect/ledgerView";
import type { LedgerBooks } from "@outlayr/backend/confect/ledgerView";
import { FIELDS_BY_TABLE } from "@outlayr/backend/confect/lib/syncTables";
import { cardFeeValues, savedFeeInput } from "@outlayr/money/card-fee";
import { deletionPlan } from "@outlayr/money/entry-deletion";
import { canonicalOccurrence, occurrenceFeeId, successorRow } from "@outlayr/money/occurrence";
import { RECURRING_TYPE } from "@outlayr/money/recurrence";
import * as Effect from "effect/Effect";

import { nextRow, planBooks, ratesLookup } from "./account-writes";
import type { CommitRow } from "./ledger-committer";

type Doc = LedgerBooks["transactions"][number];

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

type Taken = Pick<LedgerBooks, "installmentPlans" | "installments" | "outsidePayments" | "transactions" | "transfers">;

/** What a deletion plan takes besides the entries `asked` for, which their own caller writes. */
export const takenWith = (books: Taken, gone: ReturnType<typeof deletionPlan>, asked: ReadonlySet<string>): Taken => ({
    installmentPlans: books.installmentPlans.filter((row) => gone.installmentPlans.has(row.localId)),
    installments: books.installments.filter((row) => gone.installments.has(row.localId)),
    outsidePayments: books.outsidePayments.filter((row) => gone.outsidePayments.has(row.localId)),
    transactions: books.transactions.filter((row) => gone.transactions.has(row.localId) && !asked.has(row.localId)),
    transfers: books.transfers.filter((row) => gone.transfers.has(row.localId)),
});

/**
 * Their tombstones. Push batches commit separately, so these go before what was asked for: a push that dies midway
 * leaves that in the list, and deleting again finds the rest through it.
 */
export function tombstonesOf(taken: Taken, at: number): CommitRow[] {
    const tombstone = { deletedAt: at };
    return [
        ...taken.transactions.map((row) =>
            nextRow("transactions", row, { ...tombstone, accountId: row.accountId ?? null }, at)
        ),
        ...taken.transfers.map((row) => nextRow("transfers", row, tombstone, at)),
        ...taken.installments.map((row) => nextRow("installments", row, tombstone, at)),
        ...taken.outsidePayments.map((row) => nextRow("outsidePayments", row, tombstone, at)),
        ...taken.installmentPlans.map((row) => nextRow("installmentPlans", row, tombstone, at)),
    ];
}

/** The rows that delete these entries and transfers, as native's delete does, with what was asked for last. */
export function deletionOf(books: LedgerBooks, ids: Iterable<string>, at: number) {
    const wanted = new Set(ids);
    const gone = deletionPlan(planBooks(books), wanted);
    const asked = books.transactions.filter((row) => gone.transactions.has(row.localId) && wanted.has(row.localId));
    return {
        count: [...wanted].filter((id) => gone.transactions.has(id) || gone.transfers.has(id)).length,
        rows: [
            ...asked.flatMap((row) => successorPush(books, row, at)),
            ...tombstonesOf(takenWith(books, gone, wanted), at),
            // The tombstone retires to `none`, which is how deleting the pending charge stops a subscription.
            ...asked.map((row) =>
                nextRow(
                    "transactions",
                    row,
                    { accountId: row.accountId ?? null, deletedAt: at, recurringType: RECURRING_TYPE.none },
                    at
                )
            ),
        ],
    };
}
