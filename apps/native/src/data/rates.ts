import type { RateLookup } from "@outlayr/money/rates";
import { and, desc, eq, inArray, lte, sql } from "drizzle-orm";
import { createSelectSchema } from "drizzle-orm/effect-schema";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { getMeta } from "@/data/app-meta-core";
import type { SpendDb } from "@/data/budget-spent";
import { bumpRatesRevision } from "@/data/rates-revision";
import type { Database } from "@/db/client";
import { appMeta, exchangeRates } from "@/db/schema";
import { transaction } from "@/db/transaction";
import { chunkRows } from "@/lib/chunk";
import type { CloudError } from "@/lib/cloud-error";

export const RATES_THROTTLE_MS = 43_200_000;

// SQLite caps a statement at 32,766 bound params and a rate row binds 6, so at most 5,461 rows; 2,000 leaves margin.
export const RATE_ROWS_PER_CHUNK = 2000;

const LAST_PULL_KEY = "lastRatesPullAt";

export const RateWireRow = createSelectSchema(exchangeRates);

export type RateWireRow = typeof RateWireRow.Type;

const decodeRateWireRows = Schema.decodeUnknownEffect(Schema.Array(RateWireRow));

export interface PullRatesPage {
    nextCursor?: number | null;
    rows: readonly RateWireRow[];
    windowStart: string;
}

export type PullRatesFn = (args?: { cursor?: number }) => Effect.Effect<PullRatesPage, CloudError>;

const RatesOperation = Schema.Literals(["fetch", "replace", "apply", "lookup"]);

export class RatesError extends Schema.TaggedError<RatesError>()("RatesError", {
    cause: Schema.Defect(),
    operation: RatesOperation,
}) {
    override get message(): string {
        return `Rates ${this.operation} failed`;
    }
}

const attempt = <A>(operation: typeof RatesOperation.Type, run: () => PromiseLike<A>) =>
    Effect.tryPromise({ catch: (cause) => new RatesError({ cause, operation }), try: run });

// A backward clock jump puts the last pull in the future; that counts as expired, and the pull re-anchors the stamp.
export function isThrottled(last: number | null, now: number): boolean {
    if (last === null) {
        return false;
    }
    const elapsed = now - last;
    if (elapsed < 0) {
        return false;
    }
    return elapsed < RATES_THROTTLE_MS;
}

const lastPullAt = Effect.fn("Rates.lastPullAt")(function* lastPullAt(db: Database) {
    const raw = yield* getMeta(db, LAST_PULL_KEY);
    if (raw === null) {
        return null;
    }
    const last = Number.parseInt(raw, 10);
    return Number.isNaN(last) ? null : last;
});

function toRateRow({ date, fetchedAt, quote, rate, rateType, source }: RateWireRow) {
    return { date, fetchedAt, quote, rate, rateType, source };
}

const fetchPage = (pull: PullRatesFn, cursor: number | undefined) =>
    pull(cursor === undefined ? undefined : { cursor }).pipe(
        Effect.mapError((cause) => new RatesError({ cause, operation: "fetch" }))
    );

const fetchAllRates = Effect.fn("Rates.fetchAllRates")(function* fetchAllRates(pull: PullRatesFn) {
    const all: RateWireRow[] = [];
    let cursor: number | undefined;
    for (;;) {
        // Each page's nextCursor is the only way to address the next one, so the walk cannot be parallelised.
        const page = yield* fetchPage(pull, cursor);
        const rows = yield* decodeRateWireRows(page.rows).pipe(
            Effect.mapError((cause) => new RatesError({ cause, operation: "fetch" }))
        );
        all.push(...rows);
        const next = page.nextCursor;
        if (next === null || next === undefined) {
            return all;
        }
        cursor = next;
    }
});

// One transaction, so no read sees a half-cleared table. An EMPTY snapshot is a no-op: a stale cache beats an empty.
export const pullRatesIfDue = Effect.fn("Rates.pullRatesIfDue")(function* pullRatesIfDue(
    db: Database,
    pull: PullRatesFn,
    options: { force?: boolean; now?: number } = {}
) {
    const now = options.now ?? Date.now();
    if (!options.force && isThrottled(yield* lastPullAt(db), now)) {
        return false;
    }

    const rows = yield* fetchAllRates(pull);
    if (rows.length === 0) {
        return false;
    }

    const mapped = rows.map(toRateRow);

    yield* transaction(
        db,
        Effect.gen(function* replace() {
            yield* attempt("replace", () => db.delete(exchangeRates));
            for (const part of chunkRows(mapped, RATE_ROWS_PER_CHUNK)) {
                // These inserts share the one open transaction connection, which serialises statements anyway.
                yield* attempt("replace", () => db.insert(exchangeRates).values(part));
            }
            yield* attempt("replace", () =>
                db
                    .insert(appMeta)
                    .values({ key: LAST_PULL_KEY, value: String(now) })
                    .onConflictDoUpdate({
                        set: { value: String(now) },
                        target: appMeta.key,
                    })
            );
        }),
        (cause) => new RatesError({ cause, operation: "replace" })
    );

    // After the commit: a screen invalidated mid-transaction would re-read rows a rollback is about to remove.
    bumpRatesRevision();

    return true;
});

function rateKey({ date, quote, rateType }: Pick<RateWireRow, "date" | "quote" | "rateType">): string {
    return `${quote}:${rateType}:${date}`;
}

// Bumps only when a `rate` moved or arrived: a re-stamped `fetchedAt` alone keeps an open form's "as of" until remount.
export const applyRecentRates = Effect.fn("Rates.applyRecentRates")(function* applyRecentRates(
    db: Database,
    rows: RateWireRow[]
) {
    if (rows.length === 0) {
        return false;
    }

    let moved = false;
    yield* transaction(
        db,
        Effect.gen(function* apply() {
            const stored = yield* attempt("apply", () =>
                db
                    .select()
                    .from(exchangeRates)
                    .where(inArray(exchangeRates.date, [...new Set(rows.map((row) => row.date))]))
            );
            const storedByKey = new Map(stored.map((row) => [rateKey(row), row]));
            const changed = rows.filter((row) => {
                const held = storedByKey.get(rateKey(row));
                return held?.rate !== row.rate || held.fetchedAt !== row.fetchedAt || held.source !== row.source;
            });
            if (changed.length === 0) {
                return;
            }
            yield* attempt("apply", () =>
                db
                    .insert(exchangeRates)
                    .values(changed.map(toRateRow))
                    .onConflictDoUpdate({
                        set: {
                            fetchedAt: sql`excluded.fetchedAt`,
                            rate: sql`excluded.rate`,
                            source: sql`excluded.source`,
                        },
                        target: [exchangeRates.quote, exchangeRates.rateType, exchangeRates.date],
                    })
            );
            moved = changed.some((row) => storedByKey.get(rateKey(row))?.rate !== row.rate);
        }),
        (cause) => new RatesError({ cause, operation: "apply" })
    );

    if (!moved) {
        return false;
    }

    bumpRatesRevision();

    return true;
});

// "Newest row on or before this date" covers the weekend and holiday gaps in the ECB feed.
export function localRateLookup(db: SpendDb): RateLookup<RatesError> {
    return (quote, rateType, date) =>
        attempt("lookup", () =>
            db
                .select({ date: exchangeRates.date, rate: exchangeRates.rate })
                .from(exchangeRates)
                .where(
                    and(
                        eq(exchangeRates.quote, quote),
                        eq(exchangeRates.rateType, rateType),
                        lte(exchangeRates.date, date)
                    )
                )
                .orderBy(desc(exchangeRates.date))
                .limit(1)
        ).pipe(Effect.map(([row]) => (row ? { date: row.date, rate: row.rate } : null)));
}
