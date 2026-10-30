import { PICKABLE_CURRENCY_CODES } from "@outlayr/money/catalog";
import { utcDateString } from "@outlayr/money/dates";
import type { MarketRateType } from "@outlayr/money/rates";

export const PRUNE_BATCH_SIZE = 200;

// Back-to-back batches cross the deployment's per-second write budget, since each delete also rewrites two indexes.
const PRUNE_BATCH_INTERVAL_MS = 1000;

export const PRUNE_MAX_RETRIES = 4;
const PRUNE_RETRY_BASE_MS = 5000;

type PruneBatchOutcome = { cursor: string; failed: false; isDone: boolean } | { failed: true };

interface PruneStep {
    cursor: string | null;
    delayMs: number;
    retries: number;
}

export function nextPruneStep(
    outcome: PruneBatchOutcome,
    current: { cursor: string | null; retries: number }
): PruneStep | null {
    if (outcome.failed) {
        // A failed batch rolled its deletes back, so the retry resumes at the SAME cursor.
        if (current.retries >= PRUNE_MAX_RETRIES) {
            return null;
        }
        return {
            cursor: current.cursor,
            delayMs: PRUNE_RETRY_BASE_MS * 2 ** current.retries,
            retries: current.retries + 1,
        };
    }
    if (outcome.isDone) {
        return null;
    }
    return { cursor: outcome.cursor, delayMs: PRUNE_BATCH_INTERVAL_MS, retries: 0 };
}

export const RATES_WINDOW_DAYS = 90;
export const MS_PER_DAY = 86_400_000;
export const OLDEST_CALLER_INSTANT_MS = 2 * RATES_WINDOW_DAYS * MS_PER_DAY;

// `pullRates` serves and `pruneStale` keeps the same set only while both derive the boundary here. Never inline it.
export function ratesWindowStart(at: number): string {
    return utcDateString(at - RATES_WINDOW_DAYS * MS_PER_DAY);
}

// `31` for every month: dates sort lexically, so `2026-02-31` bounds February though it is not a date.
export function monthEndBound(date: string): string {
    return `${date.slice(0, 8)}31`;
}

interface RatePair {
    quote: string;
    rateType: MarketRateType;
}

export const ANCHOR_PAIR_CATALOG: readonly RatePair[] = [
    ...PICKABLE_CURRENCY_CODES.filter((code) => code !== "USD").map((code) => ({
        quote: code,
        rateType: "official" as const,
    })),
    { quote: "VES", rateType: "eur_reference" },
    { quote: "VES", rateType: "binance" },
];

export const MONTHLY_ANCHOR_LIMIT = 240;

// 12 x (90 window days + same-day row + 240 monthly anchors) = 3,972 docs per page, under Convex's 16,384 ceiling.
export const PAIRS_PER_PAGE = 12;

export const RECENT_ROWS_LIMIT = 1000;
export const CATALOG_PAIR_KEYS = new Set(ANCHOR_PAIR_CATALOG.map(({ quote, rateType }) => `${quote}:${rateType}`));
