import type { RateLookup } from "@outlayr/money/rates";
import { and, desc, eq, inArray, lte, sql } from "drizzle-orm";

import { getMeta } from "@/data/app-meta-core";
import type { SpendDb } from "@/data/budget-spent";
import { bumpRatesRevision } from "@/data/rates-revision";
import type { Database } from "@/db/client";
import { appMeta, exchangeRates } from "@/db/schema";
import { withTransaction } from "@/db/transaction";
import { chunkRows } from "@/lib/chunk";

export const RATES_THROTTLE_MS = 43_200_000;

// SQLite caps a statement at 32,766 bound params and a rate row binds 6, so at most 5,461 rows; 2,000 leaves margin.
export const RATE_ROWS_PER_CHUNK = 2000;

const LAST_PULL_KEY = "lastRatesPullAt";

export interface RateWireRow {
    date: string;
    fetchedAt: number;
    quote: string;
    rate: number;
    rateType: string;
    source: string;
}

export interface PullRatesPage {
    nextCursor?: number | null;
    rows: RateWireRow[];
    windowStart: string;
}

export type PullRatesFn = (args?: { cursor?: number }) => Promise<PullRatesPage>;

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

async function lastPullAt(db: Database): Promise<number | null> {
    const raw = await getMeta(db, LAST_PULL_KEY);
    if (raw === null) {
        return null;
    }
    const last = Number.parseInt(raw, 10);
    return Number.isNaN(last) ? null : last;
}

function toRateRow({ date, fetchedAt, quote, rate, rateType, source }: RateWireRow) {
    return { date, fetchedAt, quote, rate, rateType, source };
}

async function fetchAllRates(pull: PullRatesFn): Promise<RateWireRow[]> {
    const all: RateWireRow[] = [];
    let cursor: number | undefined;
    for (;;) {
        // oxlint-disable-next-line no-await-in-loop -- each page's nextCursor is the only way to address the next one, so the walk cannot be parallelised
        const page = await pull(cursor === undefined ? undefined : { cursor });
        all.push(...page.rows);
        const next = page.nextCursor;
        if (next === null || next === undefined) {
            return all;
        }
        cursor = next;
    }
}

// One transaction, so no read sees a half-cleared table. An EMPTY snapshot is a no-op: a stale cache beats an empty.
export async function pullRatesIfDue(
    db: Database,
    pull: PullRatesFn,
    options: { force?: boolean; now?: number } = {}
): Promise<boolean> {
    const now = options.now ?? Date.now();
    if (!options.force && isThrottled(await lastPullAt(db), now)) {
        return false;
    }

    const rows = await fetchAllRates(pull);
    if (rows.length === 0) {
        return false;
    }

    const mapped = rows.map(toRateRow);

    await withTransaction(db, async () => {
        await db.delete(exchangeRates);
        for (const part of chunkRows(mapped, RATE_ROWS_PER_CHUNK)) {
            // oxlint-disable-next-line no-await-in-loop -- these inserts share the one open withTransaction connection, which serialises statements anyway
            await db.insert(exchangeRates).values(part);
        }
        await db
            .insert(appMeta)
            .values({ key: LAST_PULL_KEY, value: String(now) })
            .onConflictDoUpdate({
                set: { value: String(now) },
                target: appMeta.key,
            });
    });

    // After the commit: a screen invalidated mid-transaction would re-read rows a rollback is about to remove.
    bumpRatesRevision();

    return true;
}

function rateKey({ date, quote, rateType }: Pick<RateWireRow, "date" | "quote" | "rateType">): string {
    return `${quote}:${rateType}:${date}`;
}

// Bumps only when a `rate` moved or arrived: a re-stamped `fetchedAt` alone keeps an open form's "as of" until remount.
export async function applyRecentRates(db: Database, rows: RateWireRow[]): Promise<boolean> {
    if (rows.length === 0) {
        return false;
    }

    let moved = false;
    await withTransaction(db, async () => {
        const stored = await db
            .select()
            .from(exchangeRates)
            .where(inArray(exchangeRates.date, [...new Set(rows.map((row) => row.date))]));
        const storedByKey = new Map(stored.map((row) => [rateKey(row), row]));
        const changed = rows.filter((row) => {
            const held = storedByKey.get(rateKey(row));
            return held?.rate !== row.rate || held.fetchedAt !== row.fetchedAt || held.source !== row.source;
        });
        if (changed.length === 0) {
            return;
        }
        await db
            .insert(exchangeRates)
            .values(changed.map(toRateRow))
            .onConflictDoUpdate({
                set: {
                    fetchedAt: sql`excluded.fetchedAt`,
                    rate: sql`excluded.rate`,
                    source: sql`excluded.source`,
                },
                target: [exchangeRates.quote, exchangeRates.rateType, exchangeRates.date],
            });
        moved = changed.some((row) => storedByKey.get(rateKey(row))?.rate !== row.rate);
    });

    if (!moved) {
        return false;
    }

    bumpRatesRevision();

    return true;
}

// "Newest row on or before this date" covers the weekend and holiday gaps in the ECB feed.
export function localRateLookup(db: SpendDb): RateLookup {
    return async (quote, rateType, date) => {
        const rows = await db
            .select({ date: exchangeRates.date, rate: exchangeRates.rate })
            .from(exchangeRates)
            .where(
                and(eq(exchangeRates.quote, quote), eq(exchangeRates.rateType, rateType), lte(exchangeRates.date, date))
            )
            .orderBy(desc(exchangeRates.date))
            .limit(1);
        const [row] = rows;
        return row ? { date: row.date, rate: row.rate } : null;
    };
}
