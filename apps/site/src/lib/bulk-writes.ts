import type { Ledger } from "./dashboard-series-ledger";
import { baseOf, draftOf, editedEntry, entryProblem, isFinanced } from "./entry-writes";
import type { EntryValues } from "./entry-writes";
import type { CommitRow } from "./ledger-committer";

const MINUTE_MS = 60_000;

/** What a bulk action asks of one entry's form, or null when it does not apply to that entry. */
export type BulkChange = (values: EntryValues) => Partial<EntryValues> | null;

export const toCategory =
    (categoryId: string, income: boolean): BulkChange =>
    (values) =>
        values.income === income ? { categoryId } : null;

/** The entry keeps its amount and currency: a new account changes where the money sat, not how much it was. */
export const toAccount =
    (accountId: string): BulkChange =>
    () => ({ accountId });

/** `day` is the ledger's yyyy-mm-dd. Each entry keeps its own time, so the day's order stays. */
export const toDay =
    (day: string): BulkChange =>
    ({ dateText }) => ({ dateText: `${day}${dateText.slice(day.length)}` });

/**
 * The rows that apply one change to many entries, each through the single-entry rules, so a fee, frozen USD and a
 * schedule move as they do in the drawer. Transfers, card fees, financed entries and anything those rules refuse stay
 * as they are and count as skipped.
 */
export function bulkEdited(
    ledger: Ledger,
    ids: Iterable<string>,
    change: BulkChange,
    feeNoteOf: (values: EntryValues) => string,
    at = Date.now()
) {
    const { books } = ledger;
    const rows: CommitRow[] = [];
    let count = 0;
    let skipped = 0;
    for (const id of ids) {
        const doc = books.transactions.find((row) => row.localId === id && row.deletedAt === null);
        const editable = doc && doc.feeForId == null && doc.transferId == null && !isFinanced(books, doc);
        const base = editable ? baseOf(ledger, doc) : null;
        const patch = base && change(base.start);
        if (!doc || !base || !patch) {
            skipped += 1;
            continue;
        }
        const values = { ...base.start, ...patch };
        const planned = draftOf(ledger, values, base, "");
        // The form's text stops at the minute, and entries logged in the same minute order by what is under it.
        const moved = values.dateText === base.start.dateText ? 0 : doc.date % MINUTE_MS;
        const draft = { ...planned, date: planned.date + moved, feeNote: feeNoteOf(values) };
        if (entryProblem(ledger, draft, doc, at) === null) {
            rows.push(...editedEntry(ledger, doc, draft, at));
            count += 1;
        } else {
            skipped += 1;
        }
    }
    return { count, rows, skipped };
}
