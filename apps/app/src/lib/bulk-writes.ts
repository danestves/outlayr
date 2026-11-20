import type { Ledger } from "./dashboard-series-ledger";
import { baseOf, draftOf, editedEntry, entryProblem, isFinanced } from "./entry-writes";
import type { EntryProblem, EntryValues } from "./entry-writes";
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

/** `text` is typed in the entry's own currency; income or expense decides the sign, so it carries none. */
export const toAmount =
    (text: string): BulkChange =>
    () => ({ amountText: text });

/** Why one entry refused a change: a single-entry rule, or an entry these writes never touch. */
export type EditRefusal = EntryProblem | "locked" | "skipped";

/** The live entry the drawer's rules let a change rewrite: not a transfer leg, a card fee or a financed entry. */
export function editableDoc(books: Ledger["books"], id: string) {
    const doc = books.transactions.find((row) => row.localId === id && row.deletedAt === null);
    return doc && doc.feeForId == null && doc.transferId == null && !isFinanced(books, doc) ? doc : undefined;
}

/**
 * The rows that apply one change to one entry through the single-entry rules, so a fee, frozen USD and a schedule
 * move as they do in the drawer. Transfers, card fees and financed entries are locked.
 */
export function entryEdit(
    ledger: Ledger,
    id: string,
    change: BulkChange,
    feeNoteOf: (values: EntryValues) => string,
    at = Date.now()
): { refusal: EditRefusal } | { rows: CommitRow[] } {
    const doc = editableDoc(ledger.books, id);
    if (!doc) {
        return { refusal: "locked" };
    }
    const base = baseOf(ledger, doc);
    const patch = change(base.start);
    if (!patch) {
        return { refusal: "skipped" };
    }
    const values = { ...base.start, ...patch };
    const planned = draftOf(ledger, values, base, "");
    // The form's text stops at the minute, and entries logged in the same minute order by what is under it.
    const moved = values.dateText === base.start.dateText ? 0 : doc.date % MINUTE_MS;
    const draft = { ...planned, date: planned.date + moved, feeNote: feeNoteOf(values) };
    const problem = entryProblem(ledger, draft, doc, at);
    return problem === null ? { rows: editedEntry(ledger, doc, draft, at) } : { refusal: problem };
}

/** {@link entryEdit} over many entries. Anything refused stays as it is and counts as skipped. */
export function bulkEdited(
    ledger: Ledger,
    ids: Iterable<string>,
    change: BulkChange,
    feeNoteOf: (values: EntryValues) => string,
    at = Date.now()
) {
    const rows: CommitRow[] = [];
    let count = 0;
    let skipped = 0;
    for (const id of ids) {
        const edit = entryEdit(ledger, id, change, feeNoteOf, at);
        if ("rows" in edit) {
            rows.push(...edit.rows);
            count += 1;
        } else {
            skipped += 1;
        }
    }
    return { count, rows, skipped };
}
