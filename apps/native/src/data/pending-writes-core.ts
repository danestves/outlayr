import { firstOfMonth, startOfDay } from "@outlayr/money/calendar";
import { occurrenceId } from "@outlayr/money/occurrence";
import { anchorDayOf, RECURRING_TYPE } from "@outlayr/money/recurrence";
import { and, between, desc, eq, gt, inArray, isNull, like, or, sql } from "drizzle-orm";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { Database } from "@/db/client";
import { categories, transactions } from "@/db/schema";
import { transaction } from "@/db/transaction";
import { autologExpenseCount, countsAsAutolog } from "@/domain/autolog-cap";
import type { AutologAccess, PendingWriteLedgerEntry as LedgerEntry } from "@/domain/meta-values";
import type { NotificationReader, NotificationReads } from "@/lib/notification-read";
import type { ClaimedWrites, PendingWrite } from "@/lib/queue-file";

import { accountsRepo, getAccountById } from "./accounts-core";
import { Meta } from "./app-meta-core";
import {
    countAutologEntry,
    holdAutologWrite,
    readAutologAccess,
    readAutologUsage,
    readAutologWaiting,
    writeAutologWaiting,
} from "./autolog-cap-core";
import type { SpendDb } from "./budget-spent";
import { queueEnrichment } from "./enrichment-queue-core";
import { captureEntrySaved, usualCardFee } from "./entry-filed-core";
import {
    alreadyApplied,
    AMOUNT_EPSILON,
    decidePendingWrite,
    readNotification,
    settleWindow,
    WALLET_DEDUPE_WINDOW_MS,
} from "./pending-write-decision";
import type { PendingWriteDecision, PendingWriteFacts, SettledOccurrence } from "./pending-write-decision";
import { backfillRecurring } from "./recurrence-backfill";
import { readRemoteEnrichment } from "./settings-core";
import { transactionsRepo } from "./transactions-core";
import { rememberCard, rememberNotification, rememberRepriced, rememberWalletEntry } from "./wallet-state-core";

const PendingWritesOperation = Schema.Literals(["read", "write", "account", "claim", "release"]);

class PendingWritesError extends Schema.TaggedError<PendingWritesError>()("PendingWritesError", {
    cause: Schema.Defect(),
    operation: PendingWritesOperation,
}) {
    override get message(): string {
        return `Pending writes ${this.operation} failed`;
    }
}

const attempt = <A>(operation: typeof PendingWritesOperation.Type, run: () => PromiseLike<A>) =>
    Effect.tryPromise({ catch: (cause) => new PendingWritesError({ cause, operation }), try: run });

const listBanks = (db: Database) =>
    accountsRepo
        .listBanks(db)
        .pipe(Effect.mapError((cause) => new PendingWritesError({ cause, operation: "account" })));

const attemptSync = <A>(operation: typeof PendingWritesOperation.Type, run: () => A) =>
    Effect.try({ catch: (cause) => new PendingWritesError({ cause, operation }), try: run });

export const filedNote = sql<string>`lower(${transactions.note})`;

const LEDGER_LIMIT = 100;
const LEDGER_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export const appliedWriteIds = Effect.fn("PendingWrites.appliedWriteIds")(function* appliedWriteIds(
    db: SpendDb,
    since: number
) {
    const ledger = yield* readLedger(db);
    return ledger.filter((entry) => entry.at >= since).map((entry) => entry.id);
});

export const writeIdsByTransaction = Effect.fn("PendingWrites.writeIdsByTransaction")(function* writeIdsByTransaction(
    db: SpendDb
) {
    const ledger = yield* readLedger(db);
    return new Map(ledger.map((entry) => [entry.txId, entry.id]));
});

const readLedger = (db: SpendDb) => Meta.get(db, "pendingWriteLedger");

// Replaces, not appends: `alreadyApplied` answers with the FIRST entry, so a stale one would keep re-checking a
// deleted transaction and re-writing it on every replay.
function remember(ledger: readonly LedgerEntry[], entry: LedgerEntry, at: number): LedgerEntry[] {
    return [...ledger.filter((kept) => kept.id !== entry.id), entry]
        .filter((kept) => at - kept.at <= LEDGER_RETENTION_MS)
        .slice(-LEDGER_LIMIT);
}

// The pushes a drain would still write: a replayed claim, a repeat of a logged purchase, or a second copy of one in
// the same batch would only be skipped.
export const unloggedPushes = Effect.fn("PendingWrites.unloggedPushes")(function* unloggedPushes(
    db: Database,
    jobs: readonly PendingWrite[]
) {
    const ledger = yield* readLedger(db);
    const kept: PendingWrite[] = [];
    for (const job of jobs) {
        const key = job.dedupeKey?.trim();
        const copy = kept.some(
            (other) =>
                key && other.dedupeKey?.trim() === key && Math.abs(other.date - job.date) <= WALLET_DEDUPE_WINDOW_MS
        );
        if (!(copy || alreadyApplied(ledger, job))) {
            kept.push(job);
        }
    }
    return kept;
});

// A tombstone must not block: re-running the automation after deleting a duplicate has to put the charge back.
const stillOnLedger = Effect.fn("PendingWrites.stillOnLedger")(function* stillOnLedger(db: Database, txId: string) {
    const rows = yield* attempt("read", () =>
        db
            .select({ id: transactions.id })
            .from(transactions)
            .where(and(eq(transactions.id, txId), isNull(transactions.deletedAt)))
            .limit(1)
    );
    return rows[0] != null;
});

export const pendingWriteTxId = Effect.fn("PendingWrites.pendingWriteTxId")(function* pendingWriteTxId(
    db: Database,
    id: string
) {
    const ledger = yield* readLedger(db);
    const entry = ledger.find((kept) => kept.id === id);
    return entry && (yield* stillOnLedger(db, entry.txId)) ? entry.txId : null;
});

interface DrainResult {
    applied: number;
    autologged: number;
}

const NOTHING_DRAINED: DrainResult = { applied: 0, autologged: 0 };

type Batch = Pick<PendingWriteFacts, "access" | "ledger" | "usage">;

const filedRows = Effect.fn("PendingWrites.filedRows")(function* filedRows(db: Database, ledger: Batch["ledger"]) {
    const ids = [...new Set(ledger.map((entry) => entry.txId))];
    if (ids.length === 0) {
        return [];
    }
    return yield* attempt("read", () =>
        db
            .select({
                accountId: transactions.accountId,
                amount: transactions.amount,
                currency: transactions.currency,
                date: transactions.date,
                id: transactions.id,
                income: transactions.income,
                note: transactions.note,
            })
            .from(transactions)
            .where(and(inArray(transactions.id, ids), isNull(transactions.deletedAt)))
    );
});

const openSubscriptions = (db: Database, write: PendingWrite) => {
    const { hi, lo } = settleWindow(write.date);
    return attempt("read", () =>
        db
            .select({
                accountId: transactions.accountId,
                amount: transactions.amount,
                currency: transactions.currency,
                date: transactions.date,
                id: transactions.id,
                note: transactions.note,
                recurringAnchorDay: transactions.recurringAnchorDay,
                recurringCoefficient: transactions.recurringCoefficient,
                recurringEndDate: transactions.recurringEndDate,
                recurringType: transactions.recurringType,
            })
            .from(transactions)
            .where(
                and(
                    eq(transactions.onceRecurring, true),
                    isNull(transactions.deletedAt),
                    isNull(transactions.feeForId),
                    eq(transactions.income, write.income),
                    or(
                        between(transactions.date, new Date(lo), new Date(hi)),
                        gt(transactions.recurringType, RECURRING_TYPE.none)
                    )
                )
            )
    );
};

const gatherFacts = Effect.fn("PendingWrites.gatherFacts")(function* gatherFacts(
    db: Database,
    write: PendingWrite,
    batch: Batch
) {
    return {
        ...batch,
        banks: yield* listBanks(db),
        cards: yield* Meta.get(db, "walletCards"),
        category: {
            fallback: yield* firstCategory(db, write.income),
            known: yield* knownCategory(db, write),
            lookups: yield* readRemoteEnrichment(db),
        },
        filed: yield* filedRows(db, batch.ledger),
        ledgerCurrency: yield* Meta.get(db, "currency"),
        subscriptions: yield* openSubscriptions(db, write),
    } satisfies PendingWriteFacts;
});

type Landing = Extract<PendingWriteDecision, { kind: "land" }>;

const writeLanding = Effect.fn("PendingWrites.writeLanding")(function* writeLanding(
    db: Database,
    { currency, landing, parentId }: Landing,
    now: Date
) {
    yield* backfillRecurring(db, parentId, new Date(Math.max(now.getTime(), landing.getTime())));
    const id = occurrenceId(parentId, landing);
    const [written] = yield* attempt("read", () =>
        db
            .select({
                amount: transactions.amount,
                date: transactions.date,
                note: transactions.note,
                recurringAnchorDay: transactions.recurringAnchorDay,
            })
            .from(transactions)
            .where(and(eq(transactions.id, id), isNull(transactions.deletedAt)))
            .limit(1)
    );
    return written ? { ...written, currency, id } : null;
});

const decide = Effect.fn("PendingWrites.decide")(function* decide(
    db: Database,
    write: PendingWrite,
    batch: Batch,
    now: Date
) {
    const decision = decidePendingWrite(write, yield* gatherFacts(db, write, batch));
    if (decision.kind !== "land") {
        return decision;
    }
    const occurrence = yield* writeLanding(db, decision, now);
    return occurrence ? ({ filing: decision.filing, kind: "settle", occurrence } as const) : decision.otherwise;
});

const settleOccurrence = Effect.fn("PendingWrites.settleOccurrence")(function* settleOccurrence(
    db: Database,
    write: PendingWrite,
    settled: SettledOccurrence,
    now: Date
) {
    if (settled.date.getTime() !== write.date) {
        const date = new Date(write.date);
        yield* attempt("write", () =>
            db
                .update(transactions)
                .set({
                    amountUsd: null,
                    date,
                    day: startOfDay(date),
                    month: firstOfMonth(date),
                    recurringAnchorDay: anchorDayOf(settled),
                    updatedAt: now,
                })
                .where(eq(transactions.id, settled.id))
        );
    }
    if (Math.abs(settled.amount - write.amount) > AMOUNT_EPSILON) {
        yield* attempt("write", () =>
            db
                .update(transactions)
                .set({ amount: write.amount, amountUsd: null, updatedAt: now })
                .where(eq(transactions.id, settled.id))
        );
        yield* rememberRepriced(db, {
            currency: settled.currency,
            from: settled.amount,
            note: settled.note,
            to: write.amount,
        });
    }
    return settled.id;
});

type Filed = Extract<PendingWriteDecision, { kind: "file" | "merge" | "settle" }>;

const createEntry = Effect.fn("PendingWrites.createEntry")(function* createEntry(
    db: Database,
    write: PendingWrite,
    { account, autolog, categoryId, currency, logoCandidate, lookup, note }: Extract<Filed, { kind: "file" }>
) {
    const fee = yield* attemptSync("read", () =>
        usualCardFee(db, { account, categoryId, currency, income: write.income, merchant: note })
    );
    const id = yield* transactionsRepo.create(
        db,
        {
            accountId: account?.id ?? null,
            amount: write.amount,
            categoryId,
            currency,
            date: new Date(write.date),
            details: null,
            fee,
            income: write.income,
            note,
        },
        { logoCandidate }
    );
    if (lookup) {
        yield* queueEnrichment(db, id);
    }
    if (countsAsAutolog(autolog)) {
        yield* attempt("write", () => db.update(transactions).set({ unreviewed: true }).where(eq(transactions.id, id)));
    }
    return id;
});

const filedRow = Effect.fn("PendingWrites.filedRow")(function* filedRow(
    db: Database,
    write: PendingWrite,
    decision: Filed,
    now: Date
) {
    if (decision.kind === "merge") {
        return decision.txId;
    }
    if (decision.kind === "settle") {
        return yield* settleOccurrence(db, write, decision.occurrence, now);
    }
    return yield* createEntry(db, write, decision);
});

const fileDecision = Effect.fn("PendingWrites.fileDecision")(function* fileDecision(
    db: Database,
    write: PendingWrite,
    decision: Filed,
    batch: Pick<Batch, "ledger" | "usage">,
    now: Date
) {
    const at = now.getTime();
    const { card, key, source, wallet } = decision.filing;
    return yield* transaction(
        db,
        Effect.gen(function* file() {
            const txId = yield* filedRow(db, write, decision, now);
            const counted = decision.kind === "file" && countsAsAutolog(decision.autolog);
            const usage = counted ? yield* countAutologEntry(db, batch.usage, write.date) : batch.usage;
            const ledger = remember(batch.ledger, { at, date: write.date, id: write.id, key, source, txId }, at);
            yield* Meta.set(db, "pendingWriteLedger", ledger);
            if (wallet) {
                yield* rememberWalletEntry(db, txId, at, wallet.push);
            }
            if (card) {
                yield* rememberCard(db, card.text, write.date, card.waits ? txId : null);
            }
            return { ledger, usage };
        }),
        (cause) => new PendingWritesError({ cause, operation: "write" })
    );
});

// Each pending write is recorded against its row in the same SQLite transaction as the insert, which collapses the
// queue's at-least-once delivery to exactly once.
export const applyPendingWrites = Effect.fn("PendingWrites.applyPendingWrites")(function* applyPendingWrites(
    db: Database,
    jobs: PendingWrite[],
    now: Date = new Date(),
    knownAccess?: AutologAccess,
    reads?: NotificationReads
) {
    if (jobs.length === 0) {
        return NOTHING_DRAINED;
    }
    const at = now.getTime();
    let ledger = yield* readLedger(db);
    let applied = 0;
    let autologged = 0;
    const access = knownAccess ?? (yield* readAutologAccess(db));
    let usage = yield* readAutologUsage(db);

    // Exactly-once depends on this pending write seeing the ledger row the previous one's SQLite transaction
    // committed, so they must land one at a time.
    for (const queued of jobs) {
        const write = readNotification(queued, reads);
        if (queued.text) {
            yield* rememberNotification(
                db,
                { amountText: write?.amountText ?? null, at: queued.date, text: queued.text },
                WALLET_DEDUPE_WINDOW_MS
            );
        }
        if (!write) {
            continue;
        }
        const decision = yield* decide(db, write, { access, ledger, usage }, now);
        if (decision.kind === "duplicate") {
            if (decision.relink) {
                const entry = { at, date: write.date, id: write.id, key: null, txId: decision.txId };
                ledger = remember(ledger, entry, at);
                yield* Meta.set(db, "pendingWriteLedger", ledger);
            }
            continue;
        }
        if (decision.kind === "drop") {
            // Dropping beats inventing a category the user never made.
            yield* Effect.logWarning("[outlayr] dropped a queued entry with no category");
            continue;
        }
        if (decision.kind === "hold") {
            usage = yield* holdAutologWrite(db, usage, queued, write.date);
            continue;
        }
        ({ ledger, usage } = yield* fileDecision(db, write, decision, { ledger, usage }, now));
        if (decision.kind === "file") {
            captureEntrySaved({ income: write.income, mode: "create", source: decision.autolog });
            autologged += autologExpenseCount(decision.autolog, write.income);
        }
        if (decision.kind === "merge" && decision.attach !== null) {
            const { attach, txId } = decision;
            const opened = yield* attemptSync("account", () => getAccountById(db, attach));
            if (opened) {
                yield* transactionsRepo.attachAccount(db, txId, opened, now);
            }
        }
        applied += 1;
    }

    return { applied, autologged } satisfies DrainResult;
});

// The intent's category (case-insensitive: Siri picks the casing), else where this merchant was filed last time.
const knownCategory = Effect.fn("PendingWrites.knownCategory")(function* knownCategory(
    db: Database,
    job: PendingWrite
) {
    if (job.categoryId) {
        const { categoryId } = job;
        const byId = yield* attempt("read", () =>
            db
                .select({ id: categories.id })
                .from(categories)
                .where(
                    and(eq(categories.id, categoryId), eq(categories.income, job.income), isNull(categories.deletedAt))
                )
                .limit(1)
        );
        if (byId[0]) {
            return byId[0].id;
        }
    }
    if (job.category) {
        const { category } = job;
        const named = yield* attempt("read", () =>
            db
                .select({ id: categories.id })
                .from(categories)
                .where(
                    and(
                        like(categories.name, category),
                        eq(categories.income, job.income),
                        isNull(categories.deletedAt)
                    )
                )
                .limit(1)
        );
        if (named[0]) {
            return named[0].id;
        }
    }

    const note = job.note.trim();
    if (note) {
        const seenBefore = yield* attempt("read", () =>
            db
                .select({ categoryId: transactions.categoryId })
                .from(transactions)
                .where(
                    and(
                        eq(filedNote, sql`lower(${note})`),
                        eq(transactions.income, job.income),
                        isNull(transactions.deletedAt)
                    )
                )
                .orderBy(desc(transactions.date))
                .limit(1)
        );
        const previous = seenBefore[0]?.categoryId;
        if (previous) {
            return previous;
        }
    }
    return null;
});

const firstCategory = Effect.fn("PendingWrites.firstCategory")(function* firstCategory(db: Database, income: boolean) {
    const fallback = yield* attempt("read", () =>
        db
            .select({ id: categories.id })
            .from(categories)
            .where(and(eq(categories.income, income), isNull(categories.parentId), isNull(categories.deletedAt)))
            .limit(1)
    );
    return fallback[0]?.id ?? null;
});

let draining: Deferred.Deferred<DrainResult, DrainFailure> | null = null;
let rerun = false;

// One drain at a time: `claimPendingWrites` re-returns an unreleased claim (crash recovery), so overlapping drains
// get the same jobs, both pass `alreadyApplied`, and insert twice. Mount and a cold launch's first "active" overlap.
export const drainPendingWrites = Effect.fn("PendingWrites.drainPendingWrites")(function* drainPendingWrites(
    db: Database,
    claim: () => ClaimedWrites,
    release: (claimed: ClaimedWrites) => void,
    reader?: NotificationReader
) {
    if (draining !== null) {
        rerun = true;
        return yield* Deferred.await(draining);
    }
    const pass = Deferred.makeUnsafe<DrainResult, DrainFailure>();
    draining = pass;
    return yield* Effect.gen(function* drainUntilSettled() {
        let applied = 0;
        let autologged = 0;
        do {
            rerun = false;
            const drained = yield* runDrain(db, claim, release, reader);
            applied += drained.applied;
            autologged += drained.autologged;
        } while (rerun);
        return { applied, autologged } satisfies DrainResult;
    }).pipe(
        Effect.onExit((exit) =>
            Effect.suspend(() => {
                draining = null;
                return Deferred.done(pass, exit);
            })
        ),
        Effect.uninterruptible
    );
});

type DrainFailure = Effect.Error<ReturnType<typeof runDrain>>;

const runDrain = Effect.fn("PendingWrites.runDrain")(function* runDrain(
    db: Database,
    claim: () => ClaimedWrites,
    release: (claimed: ClaimedWrites) => void,
    reader?: NotificationReader
) {
    const claimed = yield* attemptSync("claim", claim);
    const access = yield* readAutologAccess(db);
    const waiting = access === "open" ? yield* readAutologWaiting(db) : [];
    if (claimed.names.length === 0 && waiting.length === 0) {
        return NOTHING_DRAINED;
    }
    const reads = reader ? yield* reader(db, [...waiting, ...claimed.jobs]) : undefined;
    const now = new Date();
    const released = yield* applyPendingWrites(db, waiting, now, access, reads);
    const fresh = yield* applyPendingWrites(db, claimed.jobs, now, access, reads);
    if (waiting.length > 0) {
        yield* writeAutologWaiting(db, []);
    }
    if (fresh.autologged > 0) {
        yield* Meta.set(db, "reviewPending", true);
    }
    yield* attemptSync("release", () => {
        release(claimed);
    });
    return { applied: released.applied + fresh.applied, autologged: fresh.autologged } satisfies DrainResult;
});
