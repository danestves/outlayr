import { inArray } from "drizzle-orm";
import { z } from "zod";

import type { Database } from "@/db/client";
import { transactions } from "@/db/schema";

import { getMeta, META_KEYS, setMeta } from "./app-meta-core";
import type { SpendDb } from "./budget-spent";

const DISMISSAL_LIMIT = 200;

// Each write is a read-modify-write of one JSON value and saves overlap (Wallet drain, form save), so they chain. A
// holder only awaits its own statements, so a caller inside `withTransaction` can't deadlock one outside it.
let chain: Promise<unknown> = Promise.resolve();

function serialized<T>(task: () => Promise<T>): Promise<T> {
    const next = chain.then(task, task);
    chain = next.catch(() => undefined);
    return next;
}

const idList = z.array(z.string());

async function readIds(db: SpendDb, key: string): Promise<string[]> {
    const raw = await getMeta(db, key);
    if (!raw) {
        return [];
    }
    try {
        const parsed = idList.safeParse(JSON.parse(raw));
        return parsed.success ? parsed.data : [];
    } catch {
        return [];
    }
}

// A removed logo and one that never arrived both leave every identity column null; without this list the backfill
// puts back the image the user just removed.
export async function dismissedLogoIds(db: SpendDb): Promise<Set<string>> {
    return new Set(await readIds(db, META_KEYS.logoDismissals));
}

export function forgetLogoDismissal(db: SpendDb, id: string): Promise<void> {
    return serialized(async () => {
        const ids = await dismissedLogoIds(db);
        if (ids.delete(id)) {
            await setMeta(db, META_KEYS.logoDismissals, JSON.stringify([...ids]));
        }
    });
}

export function rememberLogoDismissal(db: SpendDb, id: string): Promise<void> {
    return serialized(async () => {
        const ids = await dismissedLogoIds(db);
        ids.delete(id);
        const kept = [...ids, id].slice(-DISMISSAL_LIMIT);
        await setMeta(db, META_KEYS.logoDismissals, JSON.stringify(kept));
    });
}

const stampedIds = z.record(z.string(), z.number().finite());

async function readStamped(db: SpendDb, key: string): Promise<Record<string, number>> {
    const raw = await getMeta(db, key);
    if (!raw) {
        return {};
    }
    try {
        const parsed = stampedIds.safeParse(JSON.parse(raw));
        return parsed.success ? parsed.data : {};
    } catch {
        return {};
    }
}

// Only a row whose `updatedAt` still matches this device's bare write is ours: a synced or peer-edited row is the
// other device's to paint, and a logo removed over there must not reappear here.
export async function candidateLogoIds(db: SpendDb): Promise<Map<string, number>> {
    return new Map(Object.entries(await readStamped(db, META_KEYS.logoCandidates)));
}

export function rememberLogoCandidates(db: SpendDb, ids: readonly string[], at: number, keepMs: number): Promise<void> {
    return serialized(async () => {
        const candidates = await candidateLogoIds(db);
        for (const id of ids) {
            candidates.set(id, at);
        }
        for (const [candidate, stamped] of candidates) {
            if (at - stamped > keepMs) {
                candidates.delete(candidate);
            }
        }
        await setMeta(db, META_KEYS.logoCandidates, JSON.stringify(Object.fromEntries(candidates)));
    });
}

export async function rememberLogoCandidate(db: SpendDb, id: string, at: number, keepMs: number): Promise<void> {
    await rememberLogoCandidates(db, [id], at, keepMs);
}

// Every local path that bumps a row's `updatedAt` without giving it an identity must call this BEFORE its write, in the
// same transaction, or the row reads as a peer's edit and is never painted. Rows are read live: a peer's edit can land
// after the caller's snapshot, so only a stamp matching the row as it is now moves.
export function refreshLogoCandidates(db: Database, ids: readonly string[], at: number): Promise<void> {
    if (ids.length === 0) {
        return Promise.resolve();
    }
    return serialized(async () => {
        const candidates = await candidateLogoIds(db);
        const live = await db
            .select({ id: transactions.id, updatedAt: transactions.updatedAt })
            .from(transactions)
            .where(inArray(transactions.id, [...ids]));
        let moved = false;
        for (const row of live) {
            if (candidates.get(row.id) === row.updatedAt.getTime()) {
                candidates.set(row.id, at);
                moved = true;
            }
        }
        if (moved) {
            await setMeta(db, META_KEYS.logoCandidates, JSON.stringify(Object.fromEntries(candidates)));
        }
    });
}

export async function refreshLogoCandidate(db: Database, id: string, at: number): Promise<void> {
    await refreshLogoCandidates(db, [id], at);
}

export async function isLiveLogoCandidate(db: Database, id: string): Promise<boolean> {
    const [row] = await db
        .select({ updatedAt: transactions.updatedAt })
        .from(transactions)
        .where(inArray(transactions.id, [id]));
    if (row == null) {
        return false;
    }
    const candidates = await candidateLogoIds(db);
    const dismissed = await dismissedLogoIds(db);
    return candidates.get(id) === row.updatedAt.getTime() && !dismissed.has(id);
}

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
export async function readRetryDeadlines(db: SpendDb, now: number): Promise<Map<string, number>> {
    const stamped = await readStamped(db, META_KEYS.logoBackfillRetries);
    return new Map(Object.entries(stamped).filter(([, until]) => now - until < RETRY_DEADLINE_KEEP_MS));
}

export function writeRetryDeadlines(db: SpendDb, deadlines: Map<string, number>): Promise<void> {
    return serialized(() => setMeta(db, META_KEYS.logoBackfillRetries, JSON.stringify(Object.fromEntries(deadlines))));
}
