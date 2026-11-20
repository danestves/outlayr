import { isBalanced } from "@outlayr/money/split";
import type { Allocation } from "@outlayr/money/split";
import { isRealSplit } from "@outlayr/money/split-draft";

import { liveAttachments, liveSplits } from "./entry-record";
import type { CommitRow } from "./ledger-committer";
import type { Attachment, RecordBooks, SplitPart } from "./ledger-db";

// A tombstone must open a later era than any restore the row carries, or the merge keeps the live copy.
const tombstone = (row: Attachment | SplitPart, at: number) => {
    const era = Math.max(row.deletedAt ?? 0, row.restoredAt ?? 0);
    return { deletedAt: Math.max(at, era + 1), localId: row.localId, updatedAt: Math.max(at, row.updatedAt + 1) };
};

const removedPart = (part: SplitPart, at: number): CommitRow => ({
    ...tombstone(part, at),
    fields: {
        amount: part.amount,
        categoryId: part.categoryId,
        sortOrder: part.sortOrder,
        transactionId: part.transactionId,
    },
    table: "transactionSplits",
});

/**
 * Rewritten wholesale, as the phone does: parts have no identity worth keeping. One part is stored as no split, so
 * the entry reads as its own category again. Null when the parts do not add up to the entry's amount.
 */
export function splitRows(
    books: RecordBooks,
    entry: { amount: number; id: string },
    parts: readonly Allocation[],
    decimals: number,
    at: number
): CommitRow[] | null {
    const real = isRealSplit(parts);
    if (real && !isBalanced(entry.amount, parts, decimals)) {
        return null;
    }
    const cleared = liveSplits(books, entry.id).map((part) => removedPart(part, at));
    if (!real) {
        return cleared;
    }
    return [
        ...cleared,
        ...parts.map((part, sortOrder): CommitRow => ({
            deletedAt: null,
            fields: { amount: part.amount, categoryId: part.categoryId, sortOrder, transactionId: entry.id },
            localId: crypto.randomUUID(),
            table: "transactionSplits",
            updatedAt: at,
        })),
    ];
}

export function attachedFile(
    books: RecordBooks,
    entryId: string,
    file: { imageKey: string; name: string | null },
    at: number
): CommitRow {
    const last = liveAttachments(books, entryId).at(-1);
    return {
        deletedAt: null,
        fields: { ...file, sortOrder: last === undefined ? 0 : last.sortOrder + 1, transactionId: entryId },
        localId: crypto.randomUUID(),
        table: "transactionAttachments",
        updatedAt: at,
    };
}

export const removedFile = (attachment: Attachment, at: number): CommitRow => ({
    ...tombstone(attachment, at),
    fields: {
        imageKey: attachment.imageKey,
        name: attachment.name,
        sortOrder: attachment.sortOrder,
        transactionId: attachment.transactionId,
    },
    table: "transactionAttachments",
});
