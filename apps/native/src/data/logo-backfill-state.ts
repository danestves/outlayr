import { inArray } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as Semaphore from "effect/Semaphore";

import type { Database } from "@/db/client";
import { transactions } from "@/db/schema";

import { getMeta, META_KEYS, setMeta } from "./app-meta-core";
import type { SpendDb } from "./budget-spent";

const DISMISSAL_LIMIT = 200;

const LogoBackfillStateArea = Schema.Literals(["candidates"]);

export class LogoBackfillStateError extends Schema.TaggedError<LogoBackfillStateError>()("LogoBackfillStateError", {
    area: LogoBackfillStateArea,
    cause: Schema.Defect(),
}) {
    override get message(): string {
        return `Logo backfill ${this.area} state failed`;
    }
}

const query = <A>(area: typeof LogoBackfillStateArea.Type, run: () => PromiseLike<A>) =>
    Effect.tryPromise({ catch: (cause) => new LogoBackfillStateError({ area, cause }), try: run });

// Each write is a read-modify-write of one JSON value and saves overlap (Wallet drain, form save), so they queue. A
// holder only awaits its own statements, so a caller inside `transaction` can't deadlock one outside it.
const exclusive = Semaphore.makeUnsafe(1);

const decodeIdList = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.mutable(Schema.Array(Schema.String))));

const readIds = Effect.fn("LogoBackfillState.readIds")(function* readIds(db: SpendDb, key: string) {
    const raw = yield* getMeta(db, key);
    return raw ? Option.getOrElse(decodeIdList(raw), () => []) : [];
});

// A removed logo and one that never arrived both leave every identity column null; without this list the backfill
// puts back the image the user just removed.
export const dismissedLogoIds = Effect.fn("LogoBackfillState.dismissedLogoIds")(function* dismissedLogoIds(
    db: SpendDb
) {
    return new Set(yield* readIds(db, META_KEYS.logoDismissals));
});

export const forgetLogoDismissal = Effect.fn("LogoBackfillState.forgetLogoDismissal")(function* forgetLogoDismissal(
    db: SpendDb,
    id: string
) {
    yield* exclusive.withPermits(1)(
        Effect.gen(function* forget() {
            const ids = yield* dismissedLogoIds(db);
            if (ids.delete(id)) {
                yield* setMeta(db, META_KEYS.logoDismissals, JSON.stringify([...ids]));
            }
        })
    );
});

export const rememberLogoDismissal = Effect.fn("LogoBackfillState.rememberLogoDismissal")(
    function* rememberLogoDismissal(db: SpendDb, id: string) {
        yield* exclusive.withPermits(1)(
            Effect.gen(function* remember() {
                const ids = yield* dismissedLogoIds(db);
                ids.delete(id);
                const kept = [...ids, id].slice(-DISMISSAL_LIMIT);
                yield* setMeta(db, META_KEYS.logoDismissals, JSON.stringify(kept));
            })
        );
    }
);

const decodeStampedIds = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Record(Schema.String, Schema.Finite)));

const readStamped = Effect.fn("LogoBackfillState.readStamped")(function* readStamped(db: SpendDb, key: string) {
    const raw = yield* getMeta(db, key);
    const stamped: Record<string, number> = raw ? Option.getOrElse(decodeStampedIds(raw), () => ({})) : {};
    return stamped;
});

// Only a row whose `updatedAt` still matches this device's bare write is ours: a synced or peer-edited row is the
// other device's to paint, and a logo removed over there must not reappear here.
export const candidateLogoIds = Effect.fn("LogoBackfillState.candidateLogoIds")(function* candidateLogoIds(
    db: SpendDb
) {
    return new Map(Object.entries(yield* readStamped(db, META_KEYS.logoCandidates)));
});

const writeCandidates = (db: SpendDb, candidates: Map<string, number>) =>
    setMeta(db, META_KEYS.logoCandidates, JSON.stringify(Object.fromEntries(candidates)));

export const rememberLogoCandidates = Effect.fn("LogoBackfillState.rememberLogoCandidates")(
    function* rememberLogoCandidates(db: SpendDb, ids: readonly string[], at: number, keepMs: number) {
        yield* exclusive.withPermits(1)(
            Effect.gen(function* remember() {
                const candidates = yield* candidateLogoIds(db);
                for (const id of ids) {
                    candidates.set(id, at);
                }
                for (const [candidate, stamped] of candidates) {
                    if (at - stamped > keepMs) {
                        candidates.delete(candidate);
                    }
                }
                yield* writeCandidates(db, candidates);
            })
        );
    }
);

export const rememberLogoCandidate = Effect.fn("LogoBackfillState.rememberLogoCandidate")(
    function* rememberLogoCandidate(db: SpendDb, id: string, at: number, keepMs: number) {
        yield* rememberLogoCandidates(db, [id], at, keepMs);
    }
);

// Every local path that bumps a row's `updatedAt` without giving it an identity must call this BEFORE its write, in the
// same transaction, or the row reads as a peer's edit and is never painted. Rows are read live: a peer's edit can land
// after the caller's snapshot, so only a stamp matching the row as it is now moves.
export const refreshLogoCandidates = Effect.fn("LogoBackfillState.refreshLogoCandidates")(
    function* refreshLogoCandidates(db: Database, ids: readonly string[], at: number) {
        if (ids.length === 0) {
            return;
        }
        yield* exclusive.withPermits(1)(
            Effect.gen(function* refresh() {
                const candidates = yield* candidateLogoIds(db);
                const live = yield* query("candidates", () =>
                    db
                        .select({ id: transactions.id, updatedAt: transactions.updatedAt })
                        .from(transactions)
                        .where(inArray(transactions.id, [...ids]))
                );
                let moved = false;
                for (const row of live) {
                    if (candidates.get(row.id) === row.updatedAt.getTime()) {
                        candidates.set(row.id, at);
                        moved = true;
                    }
                }
                if (moved) {
                    yield* writeCandidates(db, candidates);
                }
            })
        );
    }
);

export const refreshLogoCandidate = Effect.fn("LogoBackfillState.refreshLogoCandidate")(function* refreshLogoCandidate(
    db: Database,
    id: string,
    at: number
) {
    yield* refreshLogoCandidates(db, [id], at);
});

export const isLiveLogoCandidate = Effect.fn("LogoBackfillState.isLiveLogoCandidate")(function* isLiveLogoCandidate(
    db: Database,
    id: string
) {
    const [row] = yield* query("candidates", () =>
        db
            .select({ updatedAt: transactions.updatedAt })
            .from(transactions)
            .where(inArray(transactions.id, [id]))
    );
    if (row == null) {
        return false;
    }
    const candidates = yield* candidateLogoIds(db);
    const dismissed = yield* dismissedLogoIds(db);
    return candidates.get(id) === row.updatedAt.getTime() && !dismissed.has(id);
});

// Matches the backfill's `WINDOW_MS`; an older candidate is never read.
export const LOGO_CANDIDATE_KEEP_MS = 14 * 24 * 60 * 60 * 1000;

export function isLogoCandidate(row: {
    emoji?: string | null;
    icon?: string | null;
    imageKey?: string | null;
    imageUri?: string | null;
    note?: string | null;
}): boolean {
    const bare = row.icon == null && row.emoji == null && row.imageUri == null && row.imageKey == null;
    return bare && (row.note ?? "").trim().length > 0;
}

const RETRY_DEADLINE_KEEP_MS = 14 * 24 * 60 * 60 * 1000;

// An expired deadline is kept: it marks the name as tried before, so never-tried names go first.
export const readRetryDeadlines = Effect.fn("LogoBackfillState.readRetryDeadlines")(function* readRetryDeadlines(
    db: SpendDb,
    now: number
) {
    const stamped = yield* readStamped(db, META_KEYS.logoBackfillRetries);
    return new Map(Object.entries(stamped).filter(([, until]) => now - until < RETRY_DEADLINE_KEEP_MS));
});

export const writeRetryDeadlines = Effect.fn("LogoBackfillState.writeRetryDeadlines")(function* writeRetryDeadlines(
    db: SpendDb,
    deadlines: Map<string, number>
) {
    yield* exclusive.withPermits(1)(
        setMeta(db, META_KEYS.logoBackfillRetries, JSON.stringify(Object.fromEntries(deadlines)))
    );
});
