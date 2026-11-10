import { filedOn, wall } from "@outlayr/money/ledger-zone";
import { occurrenceId, occurrenceRow } from "@outlayr/money/occurrence";
import { RECURRING_TYPE } from "@outlayr/money/recurrence";

import { nextRow } from "./account-writes";
import type { Ledger } from "./dashboard-series-ledger";
import { chargePush, deletionOf } from "./delete-writes";
import { createdEntry, editedEntry } from "./entry-writes";
import type { EntryDraft } from "./entry-writes";
import type { CommitRow } from "./ledger-committer";
import { addDays, chainOf, chargeAt, firstFrom, seedOf, walk } from "./recurring";
import type { Candidate, Charge, Pause, RecurringBook, Schedule, Seed } from "./recurring";

type Doc = Ledger["books"]["transactions"][number];

export interface ScheduleDraft {
    accountId: string | null;
    amount: number;
    categoryId: string | null;
    currency: string;
    /** The first charge for a new chain, the next one for an edit. */
    date: number;
    endDate: number | null;
    every: number;
    income: boolean;
    note: string;
    type: number;
}

export type DraftProblem = "amount" | "category" | "ending" | "name";

export function draftProblems(draft: ScheduleDraft): DraftProblem[] {
    return [
        draft.note.trim() === "" ? ("name" as const) : null,
        draft.amount > 0 ? null : ("amount" as const),
        draft.categoryId === null ? ("category" as const) : null,
        draft.endDate !== null && draft.endDate <= draft.date ? ("ending" as const) : null,
    ].filter((problem) => problem !== null);
}

const entryDraftOf = (draft: ScheduleDraft, details: string): EntryDraft => ({
    accountId: draft.accountId,
    amount: draft.amount,
    categoryId: draft.categoryId,
    currency: draft.currency,
    date: draft.date,
    details,
    fee: null,
    feeNote: "",
    income: draft.income,
    note: draft.note.trim(),
    recurringCoefficient: draft.every,
    recurringEndDate: draft.endDate,
    recurringType: draft.type,
});

const retired = (doc: Doc, at: number) =>
    nextRow(
        "transactions",
        doc,
        {
            accountId: doc.accountId ?? null,
            recurringAnchorDay: null,
            recurringCoefficient: 1,
            recurringEndDate: null,
            recurringType: RECURRING_TYPE.none,
        },
        at
    );

/** Rows deleted out of a chain must not hand it on: a charge later today otherwise counts as logged. */
const unchained = (books: Ledger["books"], ids: ReadonlySet<string>): Ledger["books"] => ({
    ...books,
    transactions: books.transactions.map((row) =>
        ids.has(row.localId) ? { ...row, recurringType: RECURRING_TYPE.none } : row
    ),
});

/** A charge already logged stays as the entry it is; a pending one goes, with its card fee. */
const withdrawn = (ledger: Ledger, doc: Doc, at: number): CommitRow[] =>
    doc.date > ledger.now
        ? deletionOf(unchained(ledger.books, new Set([doc.localId])), [doc.localId], at).rows
        : [retired(doc, at)];

interface Override {
    accountId?: string | null;
    amount?: number;
    date?: number;
}

/** A charge of the chain under the id native's back-fill derives for it, so a phone sweeping later upserts it. */
function chargeRows(ledger: Ledger, seed: Seed, charge: Charge, carries: boolean, at: number, override: Override = {}) {
    const row = occurrenceRow(
        {
            ...seed,
            accountId: seed.accountId,
            date: new Date(seed.date),
            id: seed.localId,
            imageUri: null,
            recurringAnchorDay: chainOf(seed, ledger.offsetAt).anchor,
            recurringEndDate: seed.recurringEndDate === null ? null : new Date(seed.recurringEndDate),
            reminderLeadDays: null,
        },
        new Date(charge.at),
        carries,
        new Date(at)
    );
    const date = override.date ?? charge.at;
    const filed = filedOn(date, ledger.offsetAt);
    return chargePush(
        ledger.books,
        seed.localId,
        {
            ...row,
            accountId: override.accountId === undefined ? row.accountId : override.accountId,
            amount: override.amount ?? row.amount,
            date: new Date(date),
            day: new Date(filed.day),
            month: new Date(filed.month),
        },
        at
    );
}

const afterCharge = (ledger: Ledger, schedule: Schedule, charge: Charge): Charge | null => {
    const [first] = walk({ ...schedule.chain, start: charge.at + ledger.offsetAt(charge.at) });
    return first === undefined ? null : chargeAt(first, ledger.offsetAt);
};

export const createdSchedule = (ledger: Ledger, draft: ScheduleDraft, at: number) =>
    createdEntry(ledger, crypto.randomUUID(), entryDraftOf(draft, ""), at);

export interface Outcome {
    book?: (book: RecurringBook) => RecurringBook;
    rows: CommitRow[];
}

const seedFrom = (seed: Seed, draft: ScheduleDraft): Seed => ({
    ...seed,
    accountId: draft.accountId,
    amount: draft.amount,
    amountUsd: draft.amount === seed.amount && draft.currency === seed.currency ? seed.amountUsd : null,
    categoryId: draft.categoryId,
    currency: draft.currency,
    income: draft.income,
    note: draft.note.trim(),
    recurringCoefficient: draft.every,
    recurringEndDate: draft.endDate,
    recurringType: draft.type,
});

/** A chain carried past a short month still aims for its day when the edit keeps its date and cadence. */
const keepsAnchor = (schedule: Schedule, draft: ScheduleDraft) =>
    schedule.next?.at === draft.date && schedule.chain.type === draft.type && schedule.chain.every === draft.every;

/** A pending charge is edited in place; a logged one keeps its amount and the chain restarts at the next charge. */
export function editedSchedule(ledger: Ledger, schedule: Schedule, draft: ScheduleDraft, at: number): Outcome {
    const { carrier, pause } = schedule;
    const details = carrier?.details ?? schedule.seed.details ?? "";
    if (pause) {
        return {
            book: (book) => ({
                ...book,
                paused: book.paused.map((each) =>
                    each.fromId === pause.fromId ? { ...each, seed: seedFrom(each.seed, draft) } : each
                ),
            }),
            rows: carrier
                ? editedEntry(ledger, carrier, entryDraftOf({ ...draft, date: carrier.date }, details), at)
                : [],
        };
    }
    if (carrier && carrier.date > ledger.now) {
        return { rows: editedEntry(ledger, carrier, entryDraftOf(draft, details), at) };
    }
    return {
        rows: [
            ...(carrier ? [retired(carrier, at)] : []),
            ...createdEntry(
                ledger,
                crypto.randomUUID(),
                {
                    ...entryDraftOf(draft, details),
                    recurringAnchorDay: keepsAnchor(schedule, draft) ? schedule.chain.anchor : undefined,
                },
                at
            ),
        ],
    };
}

/** Logs a due charge, which carries the chain on from there. */
export function loggedCharge(ledger: Ledger, schedule: Schedule, charge: Charge, override: Override, at: number) {
    const { carrier } = schedule;
    return carrier ? [...chargeRows(ledger, schedule.seed, charge, true, at, override), retired(carrier, at)] : [];
}

/** Drops every charge still due, so the chain picks up at its next one. */
export function skippedDue(ledger: Ledger, schedule: Schedule, at: number): CommitRow[] {
    const { carrier, next } = schedule;
    if (!carrier) {
        return [];
    }
    if (next === null) {
        return [
            nextRow(
                "transactions",
                carrier,
                { accountId: carrier.accountId ?? null, recurringEndDate: carrier.date },
                at
            ),
        ];
    }
    return [...chargeRows(ledger, schedule.seed, next, true, at), retired(carrier, at)];
}

export type PauseMode = "next" | "open" | "until";

/** The charge a pause resumes on. Null when it waits for the person, or nothing is left to skip to. */
export function resumeCharge(ledger: Ledger, schedule: Schedule, mode: PauseMode, until: string): Charge | null {
    if (mode === "open") {
        return null;
    }
    if (mode === "next") {
        return schedule.next === null ? null : afterCharge(ledger, schedule, schedule.next);
    }
    const day = until > ledger.today ? until : addDays(ledger.today, 1);
    if (schedule.next !== null && schedule.next.day >= day) {
        return schedule.next;
    }
    return firstFrom(schedule.chain, day, ledger.offsetAt);
}

/** Native has no pause, so the chain really stops; a dated pause writes its resuming charge at once. */
export function pausedSchedule(
    ledger: Ledger,
    schedule: Schedule,
    mode: PauseMode,
    until: string,
    at: number
): Outcome {
    const { carrier } = schedule;
    if (!carrier) {
        return { rows: [] };
    }
    const resume = resumeCharge(ledger, schedule, mode, until);
    const pause: Pause = {
        fromId: schedule.id,
        resumes: resume?.day ?? null,
        seed: schedule.seed,
        since: ledger.today,
        toId: resume ? occurrenceId(carrier.localId, new Date(resume.at)) : null,
    };
    return {
        book: (book) => ({ ...book, paused: [...book.paused.filter((each) => each.fromId !== pause.fromId), pause] }),
        rows: [
            ...withdrawn(ledger, carrier, at),
            ...(resume ? chargeRows(ledger, schedule.seed, resume, true, at) : []),
        ],
    };
}

const withoutPause = (id: string) => (book: RecurringBook) => ({
    ...book,
    paused: book.paused.filter((each) => each.fromId !== id),
});

/** Picks the chain back up at its first charge after today. */
export function resumedSchedule(ledger: Ledger, schedule: Schedule, at: number): Outcome {
    const { carrier, pause } = schedule;
    if (!pause) {
        return { rows: [] };
    }
    const chain = chainOf(pause.seed, ledger.offsetAt);
    const tomorrow = addDays(ledger.today, 1);
    // A walk starts after its seed, and the seed of a pause is the charge it withdrew, which may still be ahead.
    const withdrawnCharge = chargeAt(chain.start, ledger.offsetAt);
    const resume = withdrawnCharge.day >= tomorrow ? withdrawnCharge : firstFrom(chain, tomorrow, ledger.offsetAt);
    const book = withoutPause(pause.fromId);
    if (resume === null) {
        return { book, rows: carrier ? withdrawn(ledger, carrier, at) : [] };
    }
    if (carrier && schedule.next?.day === resume.day) {
        return { book, rows: [] };
    }
    const seed = carrier ? seedOf(carrier) : schedule.seed;
    return {
        book,
        rows: [
            ...(carrier ? withdrawn(ledger, carrier, at) : []),
            ...chargeRows(ledger, { ...seed, date: pause.seed.date }, resume, true, at),
        ],
    };
}

/** A chain that ran past its end starts again from its next charge, with no end. */
export function restartedSchedule(ledger: Ledger, schedule: Schedule, at: number): CommitRow[] {
    const { carrier } = schedule;
    const seed = { ...schedule.seed, recurringEndDate: null };
    const resume = firstFrom(chainOf(seed, ledger.offsetAt), addDays(ledger.today, 1), ledger.offsetAt);
    return carrier && resume ? [retired(carrier, at), ...chargeRows(ledger, seed, resume, true, at)] : [];
}

/** Ends the chain at its carrier: a pending charge still comes, nothing after it does. */
export function stoppedSchedule(schedule: Schedule, at: number): CommitRow[] {
    const { carrier } = schedule;
    return carrier
        ? [
              nextRow(
                  "transactions",
                  carrier,
                  { accountId: carrier.accountId ?? null, recurringEndDate: carrier.date },
                  at
              ),
          ]
        : [];
}

/** The chain goes; logged entries stay unless `entries` names them, and none of them hands the schedule on. */
export function deletedSchedule(ledger: Ledger, schedule: Schedule, entries: readonly string[], at: number): Outcome {
    const { carrier, pause } = schedule;
    const doomed = new Set(entries);
    return {
        book: pause ? withoutPause(pause.fromId) : undefined,
        rows: [
            ...(carrier && !doomed.has(carrier.localId) ? withdrawn(ledger, carrier, at) : []),
            ...(doomed.size > 0 ? deletionOf(unchained(ledger.books, doomed), doomed, at).rows : []),
        ],
    };
}

/** A one-off copy dated now. */
export const loggedAgain = (ledger: Ledger, schedule: Schedule, at: number) => {
    const { seed } = schedule;
    return createdEntry(
        ledger,
        crypto.randomUUID(),
        {
            accountId: seed.accountId,
            amount: seed.amount,
            categoryId: seed.categoryId,
            currency: seed.currency ?? ledger.currency,
            date: at,
            details: seed.details ?? "",
            fee: null,
            feeNote: "",
            income: seed.income,
            note: seed.note,
            recurringCoefficient: 1,
            recurringEndDate: null,
            recurringType: RECURRING_TYPE.none,
        },
        at
    );
};

const linkedRows = (docs: readonly Doc[], at: number) =>
    docs.map((doc) => nextRow("transactions", doc, { accountId: doc.accountId ?? null, onceRecurring: true }, at));

/**
 * The latest entry becomes the chain's carrier; linking marks the rest as its past charges.
 * A changed draft starts a fresh chain on its next date instead, since the carrier already happened.
 */
export function confirmedCandidate(
    ledger: Ledger,
    candidate: Candidate,
    linkPast: boolean,
    at: number,
    changed: ScheduleDraft | null = null
): CommitRow[] {
    const ids = new Set(candidate.entries.map((entry) => entry.id));
    const docs = ledger.books.transactions.filter((doc) => ids.has(doc.localId)).toSorted((a, b) => b.date - a.date);
    const [latest, ...rest] = docs;
    if (!latest) {
        return [];
    }
    if (changed) {
        return [...createdSchedule(ledger, changed, at), ...(linkPast ? linkedRows(docs, at) : [])];
    }
    return [
        nextRow(
            "transactions",
            latest,
            {
                accountId: latest.accountId ?? null,
                onceRecurring: true,
                recurringAnchorDay: wall(latest.date, ledger.offsetAt(latest.date)).getUTCDate(),
                recurringCoefficient: candidate.every,
                recurringEndDate: null,
                recurringType: candidate.type,
            },
            at
        ),
        ...(linkPast ? linkedRows(rest, at) : []),
    ];
}

export const dismissedCandidate = (key: string) => (book: RecurringBook) => ({
    ...book,
    dismissed: [...new Set([...book.dismissed, key])],
});
