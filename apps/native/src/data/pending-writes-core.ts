import { firstOfMonth, startOfDay } from "@outlayr/money/calendar";
import { anchorDayOf, nextDate, RECURRING_TYPE } from "@outlayr/money/recurrence";
import { and, between, desc, eq, gt, inArray, isNull, like, or, sql } from "drizzle-orm";
import * as Cause from "effect/Cause";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import type { Database } from "@/db/client";
import { categories, transactions } from "@/db/schema";
import { transaction } from "@/db/transaction";
import { detectCurrency } from "@/domain/detect-currency";
import type { CardAccountCandidate } from "@/domain/match-card-account";
import { matchCardAccount } from "@/domain/match-card-account";
import { merchantKey } from "@/domain/merchant-resolver";
import { DEFAULT_CURRENCY } from "@/domain/money";
import { cleanMerchant, parseNotification } from "@/domain/parse-notification";
import type { ClaimedWrites, PendingWrite } from "@/lib/pending-writes-core";

import { accountsRepo, getAccountById } from "./accounts-core";
import { getMeta, META_KEYS, setMeta } from "./app-meta-core";
import type { SpendDb } from "./budget-spent";
import { suggestedCardFee } from "./card-fees-core";
import { MIN_KEY_LENGTH, queueEnrichment } from "./enrichment-queue-core";
import { backfillRecurring, occurrenceId } from "./recurrence-backfill";
import { readRemoteEnrichment } from "./settings-core";
import { transactionsRepo } from "./transactions-core";

const PendingWritesOperation = Schema.Literals(["read", "write", "account", "claim", "release"]);

export class PendingWritesError extends Schema.TaggedError<PendingWritesError>()("PendingWritesError", {
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

// One purchase can fire twice (authorize, then settle) as two intents; ten minutes covers that and a retry, and
// `PushLedger` in `app-intents/SharedStore.swift` copies it. Not widened to next-day settlement: that would collapse
// a real second purchase, and a missing row is unrecoverable where a duplicate isn't.
export const WALLET_DEDUPE_WINDOW_MS = 10 * 60 * 1000;

export const SETTLE_REPEAT_WINDOW_MS = 4 * 24 * 60 * 60 * 1000;
const REPEATS_ON_SETTLE = /payoneer/i;

export const filedNote = sql<string>`lower(${transactions.note})`;

export const SUBSCRIPTION_SETTLE_WINDOW_MS = 4 * 24 * 60 * 60 * 1000;
export const SUBSCRIPTION_PRICE_BAND = { max: 2, min: 0.5 } as const;
const AMOUNT_EPSILON = 0.005;
const MAX_MISSED_LANDINGS = 60;

function orNullOnFailure<S extends Schema.Top>(schema: S) {
    return Schema.NullOr(schema).pipe(Schema.catchDecoding(() => Effect.succeedSome(null)));
}

const RepricedSubscription = Schema.Struct({
    currency: Schema.String,
    from: Schema.Finite,
    note: Schema.String,
    to: Schema.Finite,
});

export type RepricedSubscription = typeof RepricedSubscription.Type;

const decodeRepriced = Schema.decodeUnknownOption(Schema.Array(orNullOnFailure(RepricedSubscription)));

export function parseRepriced(raw: string | null | undefined): RepricedSubscription[] {
    if (!raw) {
        return [];
    }
    try {
        const parsed = decodeRepriced(JSON.parse(raw));
        return Option.isSome(parsed) ? parsed.value.filter((entry) => entry !== null) : [];
    } catch {
        return [];
    }
}

export const takeRepriced = Effect.fn("PendingWrites.takeRepriced")(function* takeRepriced(db: Database) {
    const entries = parseRepriced(yield* getMeta(db, META_KEYS.repricedSubscriptions));
    if (entries.length > 0) {
        yield* setMeta(db, META_KEYS.repricedSubscriptions, "[]");
    }
    return entries;
});

const LastWalletEntry = Schema.Struct({
    /** Epoch ms of the commit, not of the purchase. */
    at: Schema.Finite,
    push: Schema.optional(Schema.Literal(true)),
    txId: Schema.String,
});

export type LastWalletEntry = typeof LastWalletEntry.Type;

const decodeLastWalletEntry = Schema.decodeUnknownOption(LastWalletEntry);

export function parseLastWalletEntry(raw: string | null | undefined): LastWalletEntry | null {
    if (!raw) {
        return null;
    }
    try {
        return Option.getOrNull(decodeLastWalletEntry(JSON.parse(raw)));
    } catch {
        return null;
    }
}

const NotificationText = Schema.Struct({
    amountText: Schema.NullOr(Schema.String),
    at: Schema.Finite,
    text: Schema.String,
});

export type NotificationText = typeof NotificationText.Type;

const decodeNotificationTexts = Schema.decodeUnknownOption(Schema.Array(orNullOnFailure(NotificationText)));
const NOTIFICATION_TEXTS_LIMIT = 5;

export function parseNotificationTexts(raw: string | null | undefined): NotificationText[] {
    if (!raw) {
        return [];
    }
    try {
        const parsed = decodeNotificationTexts(JSON.parse(raw));
        return Option.isSome(parsed) ? parsed.value.filter((entry) => entry !== null) : [];
    } catch {
        return [];
    }
}

const rememberNotification = Effect.fn("PendingWrites.rememberNotification")(function* rememberNotification(
    db: Database,
    entry: NotificationText
) {
    const kept = parseNotificationTexts(yield* getMeta(db, META_KEYS.notificationTexts));
    const last = kept.at(-1);
    if (last?.text === entry.text && Math.abs(entry.at - last.at) <= WALLET_DEDUPE_WINDOW_MS) {
        return;
    }
    const next = [...kept, entry].slice(-NOTIFICATION_TEXTS_LIMIT);
    yield* setMeta(db, META_KEYS.notificationTexts, JSON.stringify(next));
});

const WalletCard = Schema.Struct({
    accountId: Schema.optional(Schema.NullOr(Schema.String)),
    lastAt: Schema.Finite,
    text: Schema.String,
    waiting: Schema.mutableKey(Schema.optional(Schema.Array(Schema.String))),
});

export type WalletCard = typeof WalletCard.Type;

const decodeWalletCards = Schema.decodeUnknownOption(Schema.Array(orNullOnFailure(WalletCard)));

export function parseWalletCards(raw: string | null | undefined): WalletCard[] {
    if (!raw) {
        return [];
    }
    try {
        const parsed = decodeWalletCards(JSON.parse(raw));
        return Option.isSome(parsed) ? parsed.value.filter((card) => card !== null) : [];
    } catch {
        return [];
    }
}

export function cardAccountId(
    text: string,
    cards: readonly WalletCard[],
    candidates: readonly CardAccountCandidate[]
): string | null {
    const picked = cards.find((card) => card.text === text)?.accountId;
    if (picked === null) {
        return null;
    }
    if (picked !== undefined && candidates.some((candidate) => candidate.id === picked)) {
        return picked;
    }
    return matchCardAccount(text, candidates);
}

const updateWalletCards = Effect.fn("PendingWrites.updateWalletCards")(function* updateWalletCards(
    db: Database,
    change: (cards: WalletCard[]) => WalletCard[]
) {
    const cards = parseWalletCards(yield* getMeta(db, META_KEYS.walletCards));
    yield* setMeta(db, META_KEYS.walletCards, JSON.stringify(change(cards)));
});

export function cardStatus<Account extends CardAccountCandidate>(
    text: string,
    cards: readonly WalletCard[],
    live: readonly Account[]
) {
    const id = cardAccountId(text, cards, live);
    const account = live.find((row) => row.id === id);
    const asks = live.length > 0 && !account && cards.find((card) => card.text === text)?.accountId !== null;
    return { account, asks };
}

export const cardStillAsks = Effect.fn("PendingWrites.cardStillAsks")(function* cardStillAsks(
    db: Database,
    text: string
) {
    const live = yield* listBanks(db);
    return cardStatus(text, parseWalletCards(yield* getMeta(db, META_KEYS.walletCards)), live).asks;
});

export const pickCardAccount = Effect.fn("PendingWrites.pickCardAccount")(function* pickCardAccount(
    db: Database,
    text: string,
    accountId: string | null
) {
    if (accountId !== null && (yield* attemptSync("account", () => getAccountById(db, accountId))) === null) {
        return;
    }
    yield* transaction(
        db,
        updateWalletCards(db, (cards) => cards.map((card) => (card.text === text ? { ...card, accountId } : card))),
        (cause) => new PendingWritesError({ cause, operation: "write" })
    );
    yield* fileWaitingPurchases(db);
});

export const fileWaitingPurchases = Effect.fn("PendingWrites.fileWaitingPurchases")(function* fileWaitingPurchases(
    db: Database
) {
    const cards = parseWalletCards(yield* getMeta(db, META_KEYS.walletCards));
    const waitingCards = cards.filter((card) => (card.waiting?.length ?? 0) > 0);
    if (waitingCards.length === 0) {
        return;
    }
    const live = yield* listBanks(db);
    const attempts = waitingCards.flatMap((card) => {
        const { account } = cardStatus(card.text, cards, live);
        return account
            ? (card.waiting ?? []).map((txId) =>
                  transactionsRepo.attachAccount(db, txId, account).pipe(
                      Effect.map((attached) => (attached ? txId : null)),
                      Effect.catchCause((cause) =>
                          Cause.hasInterruptsOnly(cause) ? Effect.failCause(cause) : Effect.succeed(null)
                      )
                  )
              )
            : [];
    });
    const settled = yield* Effect.all(attempts, { concurrency: "unbounded" });
    const done = new Set(settled.filter((txId) => txId !== null));
    if (done.size === 0) {
        return;
    }
    yield* transaction(
        db,
        updateWalletCards(db, (next) =>
            next.map((card) => (card.waiting ? { ...card, waiting: card.waiting.filter((id) => !done.has(id)) } : card))
        ),
        (cause) => new PendingWritesError({ cause, operation: "write" })
    );
});

const rememberCard = Effect.fn("PendingWrites.rememberCard")(function* rememberCard(
    db: Database,
    text: string,
    at: number,
    unattached: string | null
) {
    yield* updateWalletCards(db, (cards) => {
        const known = cards.find((card) => card.text === text);
        const seen: WalletCard = known ? { ...known, lastAt: Math.max(known.lastAt, at) } : { lastAt: at, text };
        if (unattached !== null) {
            seen.waiting = [...(seen.waiting ?? []), unattached];
        }
        return known ? cards.map((card) => (card === known ? seen : card)) : [...cards, seen];
    });
});

// The card is the sure sign; the key prefixes cover automations built before the card parameter existed.
function fromAutomation(job: PendingWrite): boolean {
    return Boolean(job.card?.trim()) || /^(?:wallet|notification):/.test(job.dedupeKey ?? "");
}

function sourceOf(job: PendingWrite): string | null {
    const kind = /^(wallet|notification):/.exec(job.dedupeKey ?? "")?.[1];
    return kind ? `${kind}:${job.card?.trim().toLowerCase() ?? ""}` : null;
}

function readNotification(job: PendingWrite): PendingWrite | null {
    if (!job.text) {
        return job;
    }
    const parsed = parseNotification(job.text);
    if (!parsed) {
        return null;
    }
    return {
        ...job,
        amount: parsed.amount,
        amountText: parsed.amountText,
        income: job.income || parsed.income,
        note: parsed.merchant ?? "",
    };
}

const LEDGER_LIMIT = 100;
const LEDGER_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

const LedgerEntry = Schema.Struct({
    at: Schema.Finite,
    date: Schema.optional(Schema.Finite),
    id: Schema.String,
    key: Schema.NullOr(Schema.String),
    source: Schema.optional(Schema.String),
    txId: Schema.String,
});

type LedgerEntry = typeof LedgerEntry.Type;

// Per entry: one bad row must not discard the only record of which purchases were committed.
const decodeLedger = Schema.decodeUnknownOption(Schema.Array(orNullOnFailure(LedgerEntry)));

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

const readLedger = Effect.fn("PendingWrites.readLedger")(function* readLedger(db: SpendDb) {
    const raw = yield* getMeta(db, META_KEYS.pendingWriteLedger);
    if (!raw) {
        return [];
    }
    try {
        const parsed = decodeLedger(JSON.parse(raw));
        return Option.isSome(parsed) ? parsed.value.filter((entry) => entry !== null) : [];
    } catch {
        return [];
    }
});

// Replaces, not appends: `alreadyApplied` answers with the FIRST entry, so a stale one would keep re-checking a
// deleted transaction and re-writing it on every replay.
function remember(ledger: LedgerEntry[], entry: LedgerEntry, at: number): LedgerEntry[] {
    return [...ledger.filter((kept) => kept.id !== entry.id), entry]
        .filter((kept) => at - kept.at <= LEDGER_RETENTION_MS)
        .slice(-LEDGER_LIMIT);
}

// The enqueue id matches with no window (the same id means a replayed queue file); the purchase key is windowed
// because two runs naming one purchase are separate intents.
function alreadyApplied(ledger: LedgerEntry[], job: PendingWrite): LedgerEntry | null {
    const replayed = ledger.find((entry) => entry.id === job.id);
    if (replayed) {
        return replayed;
    }
    const key = job.dedupeKey?.trim();
    if (!key) {
        return null;
    }
    return (
        ledger.find(
            (entry) => entry.key === key && Math.abs(job.date - (entry.date ?? entry.at)) <= WALLET_DEDUPE_WINDOW_MS
        ) ?? null
    );
}

function settleRepeatOf(ledger: LedgerEntry[], job: PendingWrite): LedgerEntry | null {
    const key = job.dedupeKey?.trim();
    if (!key || !REPEATS_ON_SETTLE.test(job.card ?? "")) {
        return null;
    }
    const dateOf = (entry: LedgerEntry) => entry.date ?? entry.at;
    const repeated = (first: LedgerEntry) =>
        ledger.some(
            (other) =>
                other.txId === first.txId &&
                other.id !== first.id &&
                dateOf(other) - dateOf(first) > WALLET_DEDUPE_WINDOW_MS
        );
    return (
        ledger.find(
            (entry) =>
                entry.key === key && Math.abs(job.date - dateOf(entry)) <= SETTLE_REPEAT_WINDOW_MS && !repeated(entry)
        ) ?? null
    );
}

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

// Each job is recorded against its row in the same SQLite transaction as the insert, which collapses the queue's
// at-least-once delivery to exactly once.
export const applyPendingWrites = Effect.fn("PendingWrites.applyPendingWrites")(function* applyPendingWrites(
    db: Database,
    jobs: PendingWrite[],
    now: Date = new Date()
) {
    if (jobs.length === 0) {
        return 0;
    }
    const at = now.getTime();
    let ledger = yield* readLedger(db);
    let applied = 0;

    // Exactly-once depends on this job seeing the ledger row the previous job's SQLite transaction committed, so the
    // jobs must land one at a time.
    for (const queued of jobs) {
        const job = readNotification(queued);
        if (queued.text) {
            yield* rememberNotification(db, {
                amountText: job?.amountText ?? null,
                at: queued.date,
                text: queued.text,
            });
        }
        if (!job) {
            continue;
        }
        const seen = alreadyApplied(ledger, job);
        const repeat = seen ? null : settleRepeatOf(ledger, job);
        const duplicate = repeat ?? (seen && (yield* stillOnLedger(db, seen.txId)) ? seen : null);
        if (duplicate) {
            if (duplicate.id !== job.id) {
                ledger = remember(ledger, { at, date: job.date, id: job.id, key: null, txId: duplicate.txId }, at);
                yield* setMeta(db, META_KEYS.pendingWriteLedger, JSON.stringify(ledger));
            }
            continue;
        }
        const known = yield* knownCategory(db, job);
        const lookup =
            known == null && merchantKey(job.note).length >= MIN_KEY_LENGTH && (yield* readRemoteEnrichment(db));
        const categoryId = known ?? (lookup ? null : yield* firstCategory(db, job.income));
        if (categoryId == null && !lookup) {
            // Dropping beats inventing a category the user never made.
            yield* Effect.logWarning("[outlayr] dropped a queued entry with no category");
            continue;
        }
        const { account, asks } = yield* resolveAccount(db, job);
        const currency = resolveWriteCurrency(job, account);
        const twin = fromAutomation(job) ? yield* sameCharge(db, job, account, currency, ledger) : null;
        const settled =
            fromAutomation(job) && !twin ? yield* settledOccurrence(db, job, account, currency, ledger, now) : null;
        yield* transaction(
            db,
            // oxlint-disable-next-line no-loop-func -- run in place, so nothing outlives the iteration whose `job` and `categoryId` it reads
            Effect.gen(function* write() {
                if (settled && settled.date.getTime() !== job.date) {
                    const date = new Date(job.date);
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
                if (settled && Math.abs(settled.amount - job.amount) > AMOUNT_EPSILON) {
                    yield* attempt("write", () =>
                        db
                            .update(transactions)
                            .set({ amount: job.amount, amountUsd: null, updatedAt: now })
                            .where(eq(transactions.id, settled.id))
                    );
                    const repriced = parseRepriced(yield* getMeta(db, META_KEYS.repricedSubscriptions));
                    repriced.push({
                        currency: settled.currency,
                        from: settled.amount,
                        note: settled.note,
                        to: job.amount,
                    });
                    yield* setMeta(db, META_KEYS.repricedSubscriptions, JSON.stringify(repriced));
                }
                const txId =
                    twin?.id ??
                    settled?.id ??
                    (yield* transactionsRepo.create(db, {
                        accountId: account?.id ?? null,
                        amount: job.amount,
                        categoryId,
                        currency,
                        date: new Date(job.date),
                        details: null,
                        fee: job.income
                            ? null
                            : yield* attemptSync("read", () =>
                                  suggestedCardFee(db, { account, categoryId, currency, merchant: job.note })
                              ),
                        income: job.income,
                        note: job.note,
                    }));
                if (lookup && !twin && !settled) {
                    yield* queueEnrichment(db, txId);
                }
                const source = sourceOf(job) ?? undefined;
                ledger = remember(
                    ledger,
                    { at, date: job.date, id: job.id, key: job.dedupeKey?.trim() || null, source, txId },
                    at
                );
                yield* setMeta(db, META_KEYS.pendingWriteLedger, JSON.stringify(ledger));
                if (fromAutomation(job)) {
                    const entry: LastWalletEntry = job.text ? { at, push: true, txId } : { at, txId };
                    yield* setMeta(db, META_KEYS.lastWalletEntry, JSON.stringify(entry));
                }
                const card = job.card?.trim();
                if (card) {
                    yield* rememberCard(db, card, job.date, asks && currency ? txId : null);
                }
            }),
            (cause) => new PendingWritesError({ cause, operation: "write" })
        );
        const opened =
            twin && !twin.accountId && account
                ? yield* attemptSync("account", () => getAccountById(db, account.id))
                : null;
        if (twin && opened) {
            yield* transactionsRepo.attachAccount(db, twin.id, opened, now);
        }
        applied += 1;
    }

    return applied;
});

interface MatchedAccount {
    currency: string;
    id: string;
}

function merchantOf(note: string): string {
    return cleanMerchant(note)?.toLowerCase() ?? "";
}

const sameCharge = Effect.fn("PendingWrites.sameCharge")(function* sameCharge(
    db: Database,
    job: PendingWrite,
    account: MatchedAccount | null,
    currency: string | null,
    ledger: readonly LedgerEntry[]
) {
    const source = sourceOf(job);
    if (!source) {
        return null;
    }
    const fed = new Set(ledger.filter((entry) => entry.source === source).map((entry) => entry.txId));
    const ids = ledger
        .filter(
            (entry) =>
                entry.source !== undefined &&
                entry.source !== source &&
                !fed.has(entry.txId) &&
                Math.abs(job.date - (entry.date ?? entry.at)) <= WALLET_DEDUPE_WINDOW_MS
        )
        .map((entry) => entry.txId);
    if (ids.length === 0) {
        return null;
    }
    const code = currency ?? (yield* getMeta(db, META_KEYS.currency)) ?? DEFAULT_CURRENCY;
    const rows = yield* attempt("read", () =>
        db
            .select({
                accountId: transactions.accountId,
                amount: transactions.amount,
                currency: transactions.currency,
                date: transactions.date,
                id: transactions.id,
                note: transactions.note,
            })
            .from(transactions)
            .where(
                and(inArray(transactions.id, ids), isNull(transactions.deletedAt), eq(transactions.income, job.income))
            )
    );
    const merchant = merchantOf(job.note);
    const [match] = rows
        .filter((row) => {
            if (account && row.accountId && row.accountId !== account.id) {
                return false;
            }
            if (row.currency === code) {
                return Math.abs(row.amount - job.amount) <= AMOUNT_EPSILON;
            }
            const filed = merchantOf(row.note);
            return merchant !== "" && filed !== "" && (filed.includes(merchant) || merchant.includes(filed));
        })
        .sort((a, b) => Math.abs(a.date.getTime() - job.date) - Math.abs(b.date.getTime() - job.date));
    return match ? { accountId: match.accountId, id: match.id } : null;
});

const settledOccurrence = Effect.fn("PendingWrites.settledOccurrence")(function* settledOccurrence(
    db: Database,
    job: PendingWrite,
    account: MatchedAccount | null,
    currency: string | null,
    ledger: readonly LedgerEntry[],
    now: Date
) {
    const code = currency ?? (yield* getMeta(db, META_KEYS.currency)) ?? DEFAULT_CURRENCY;
    const taken = new Set(ledger.map((entry) => entry.txId));
    const lo = job.date - SUBSCRIPTION_SETTLE_WINDOW_MS;
    const hi = job.date + SUBSCRIPTION_SETTLE_WINDOW_MS;
    const rows = yield* attempt("read", () =>
        db
            .select({
                accountId: transactions.accountId,
                amount: transactions.amount,
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
                    eq(transactions.income, job.income),
                    eq(transactions.currency, code),
                    or(
                        between(transactions.date, new Date(lo), new Date(hi)),
                        gt(transactions.recurringType, RECURRING_TYPE.none)
                    )
                )
            )
    );
    const inWindow = (at: Date) => at.getTime() >= lo && at.getTime() <= hi;
    const stored = rows.filter((row) => inWindow(row.date)).map((row) => ({ ...row, landing: null }));
    const landings = rows.flatMap((row) => {
        if (row.recurringType === RECURRING_TYPE.none) {
            return [];
        }
        let landing = nextDate(row.date, row.recurringType, row.recurringCoefficient, anchorDayOf(row));
        for (let missed = 0; landing && landing.getTime() < lo && missed < MAX_MISSED_LANDINGS; missed += 1) {
            landing = nextDate(landing, row.recurringType, row.recurringCoefficient, anchorDayOf(row));
        }
        const ended = row.recurringEndDate != null && landing != null && landing > row.recurringEndDate;
        return landing && inWindow(landing) && !ended ? [{ ...row, date: landing, landing }] : [];
    });
    const merchant = job.note.trim().toLowerCase();
    const named = (note: string) => {
        const filed = note.trim().toLowerCase();
        return merchant !== "" && filed !== "" && (filed.includes(merchant) || merchant.includes(filed));
    };
    const open = [...stored, ...landings].filter(
        (row) => !taken.has(row.id) && (!account || !row.accountId || row.accountId === account.id)
    );
    const byDate = (a: { date: Date }, b: { date: Date }) =>
        Math.abs(a.date.getTime() - job.date) - Math.abs(b.date.getTime() - job.date);
    const samePrice = open
        .filter((row) => Math.abs(row.amount - job.amount) <= AMOUNT_EPSILON)
        .sort((a, b) => Number(named(b.note)) - Number(named(a.note)) || byDate(a, b));
    const repriced = open
        .filter((row) => {
            const ratio = job.amount / row.amount;
            return named(row.note) && ratio >= SUBSCRIPTION_PRICE_BAND.min && ratio <= SUBSCRIPTION_PRICE_BAND.max;
        })
        .sort(byDate);
    const match = samePrice[0] ?? repriced[0];
    if (!match) {
        return null;
    }
    if (!match.landing) {
        return {
            amount: match.amount,
            currency: code,
            date: match.date,
            id: match.id,
            note: match.note,
            recurringAnchorDay: match.recurringAnchorDay,
        };
    }
    const { landing } = match;
    yield* backfillRecurring(db, match.id, new Date(Math.max(now.getTime(), landing.getTime())));
    const id = occurrenceId(match.id, landing);
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
    return written ? { ...written, currency: code, id } : null;
});

const resolveAccount = Effect.fn("PendingWrites.resolveAccount")(function* resolveAccount(
    db: Database,
    job: PendingWrite
) {
    const card = job.card?.trim();
    if (!card) {
        return { account: null, asks: false };
    }
    const rows = yield* listBanks(db);
    const status = cardStatus(card, parseWalletCards(yield* getMeta(db, META_KEYS.walletCards)), rows);
    const charged = job.currency?.trim().toUpperCase() || detectCurrency(job.amountText);
    const same = charged ? rows.filter((row) => row.currency === charged) : [];
    const account =
        status.account ?? (status.asks ? same.find((row) => row.id === matchCardAccount(card, same)) : undefined);
    return {
        account: account ? { currency: account.currency, id: account.id } : null,
        asks: status.asks && !account,
    };
});

// "$" is on 22 currencies, so an ambiguous symbol defers to the card's account currency before staying null.
function resolveWriteCurrency(job: PendingWrite, account: MatchedAccount | null): string | null {
    const pinned = job.currency?.trim().toUpperCase();
    if (pinned) {
        return pinned;
    }
    return detectCurrency(job.amountText) ?? account?.currency ?? null;
}

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

let draining: Deferred.Deferred<number, DrainFailure> | null = null;

// One drain at a time: `claimPendingWrites` re-returns an unreleased claim (crash recovery), so overlapping drains
// get the same jobs, both pass `alreadyApplied`, and insert twice. Mount and a cold launch's first "active" overlap.
export const drainPendingWrites = Effect.fn("PendingWrites.drainPendingWrites")(function* drainPendingWrites(
    db: Database,
    claim: () => ClaimedWrites,
    release: (claimed: ClaimedWrites) => void
) {
    if (draining !== null) {
        return yield* Deferred.await(draining);
    }
    const pass = Deferred.makeUnsafe<number, DrainFailure>();
    draining = pass;
    return yield* runDrain(db, claim, release).pipe(
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
    release: (claimed: ClaimedWrites) => void
) {
    const claimed = yield* attemptSync("claim", claim);
    if (claimed.names.length === 0) {
        return 0;
    }
    const applied = yield* applyPendingWrites(db, claimed.jobs);
    yield* attemptSync("release", () => {
        release(claimed);
    });
    return applied;
});
