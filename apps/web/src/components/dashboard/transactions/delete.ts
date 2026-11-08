import type { LedgerBooks } from "@outlayr/backend/confect/ledgerView";
import type { PushRow } from "@outlayr/backend/confect/sync";

type Books = Pick<LedgerBooks, "installmentPlans" | "transactions">;
type Doc = LedgerBooks["transactions"][number];

// Deleting one of these also moves a schedule, a transfer or an installment plan. Those rules live on native.
const isPlain = (doc: Doc, planned: ReadonlySet<string>) =>
    !doc.feeForId &&
    !doc.transferId &&
    !doc.installmentId &&
    doc.recurringType === 0 &&
    !doc.onceRecurring &&
    doc.recurringAnchorDay == null &&
    !planned.has(doc.localId);

/** Which of these entries the web may delete, by `localId`. */
export function plainEntries(books: Books) {
    const planned = new Set(books.installmentPlans.map((plan) => plan.transactionId));
    return new Set(books.transactions.filter((doc) => isPlain(doc, planned)).map((doc) => doc.localId));
}

function tombstone(doc: Doc, now: number): PushRow {
    const {
        _creationTime,
        _id,
        deletedAt: _deletedAt,
        deviceId: _deviceId,
        localId,
        restoredAt,
        seq: _seq,
        updatedAt: _updatedAt,
        userId: _userId,
        ...rest
    } = doc;
    // SAFETY: this only drops keys. Live query rows carry $key and $origin, which the types omit and Convex rejects.
    const fields = Object.fromEntries(Object.entries(rest).filter(([key]) => !key.startsWith("$"))) as typeof rest;
    return {
        deletedAt: now,
        fields: { ...fields, accountId: fields.accountId ?? null },
        localId,
        restoredAt,
        table: "transactions",
        updatedAt: now,
    };
}

/** The rows that delete these entries with their card fees, ignoring any entry the web may not delete. */
export function deletionOf(books: Books, ids: Iterable<string>, now: number) {
    const plain = plainEntries(books);
    const wanted = new Set([...ids].filter((id) => plain.has(id)));
    const docs = books.transactions.filter(
        (doc) => wanted.has(doc.localId) || (doc.feeForId != null && wanted.has(doc.feeForId))
    );
    return {
        count: wanted.size,
        keys: docs.map((doc) => doc._id),
        rows: docs.map((doc) => tombstone(doc, now)),
    };
}
