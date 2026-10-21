import { and, desc, eq, gte, inArray, isNull, ne, notExists, sql } from "drizzle-orm";

import type { Database } from "@/db/client";
import { appMeta, transactions } from "@/db/schema";
import { getCachedEnrichment } from "@/domain/enrichment-cache";
import type { RemoteEnrichmentResult } from "@/domain/enrichment-cache";
import { merchantKey, resolveMerchant } from "@/domain/merchant-resolver";
import type { LogoOutcome, MerchantImageRequest } from "@/lib/logo-fetch";

import { META_KEYS } from "./app-meta-core";
import { candidateLogoIds, dismissedLogoIds, readRetryDeadlines, writeRetryDeadlines } from "./logo-backfill-state";

const WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
const FETCH_LIMIT = 12;
// The form's own lookups share this per-user bucket (8, refilling 30/hour); draining it costs the user their next one.
const REMOTE_BUDGET = 3;
const RETRY_MISS_MS = 6 * 60 * 60 * 1000;
const RETRY_GROUNDING_MS = 2 * 60 * 1000;
const RETRY_INDETERMINATE_MS = 30 * 60 * 1000;

export interface LogoBackfillDeps {
    /**
     * Resolving null means consent was withdrawn: the pass stops and nothing else is sent. `groundedLookup` is read
     * at send time, since a no-domain answer is only a real miss if web search ran on that request.
     */
    enrich:
        | ((args: {
              currency: string | null;
              income: boolean;
              name: string;
          }) => Promise<{ groundedLookup: boolean; result: RemoteEnrichmentResult } | null>)
        | null;
    cancelled?: () => boolean;
    discard?: (imageUri: string) => void;
    fetchImage: (request: MerchantImageRequest) => Promise<LogoOutcome>;
    now?: number;
    persist: (bytes: Uint8Array) => Promise<{ imageColor: string | null; imageUri: string }>;
}

interface PendingRow {
    currency: string | null;
    id: string;
    note: string;
    updatedAt: Date;
}

interface MerchantGroup {
    currency: string | null;
    id: string;
    income: boolean;
    key: string;
    note: string;
    rows: PendingRow[];
}

// A colour alone is a choice too: the picker tints the tile without a glyph, and an image would draw over it.
function bare() {
    return and(
        isNull(transactions.deletedAt),
        isNull(transactions.imageUri),
        isNull(transactions.imageKey),
        isNull(transactions.icon),
        isNull(transactions.emoji),
        isNull(transactions.customColor)
    );
}

// Grouped by merchant AND currency: a same-named business in two countries must not share one resolved logo.
async function pendingGroups(db: Database, now: number): Promise<MerchantGroup[]> {
    const rows = await db
        .select({
            currency: transactions.currency,
            id: transactions.id,
            income: transactions.income,
            note: transactions.note,
            updatedAt: transactions.updatedAt,
        })
        .from(transactions)
        .where(and(bare(), ne(transactions.note, ""), gte(transactions.date, new Date(now - WINDOW_MS))))
        .orderBy(desc(transactions.date));
    const candidates = await candidateLogoIds(db);
    const dismissed = await dismissedLogoIds(db);

    const groups = new Map<string, MerchantGroup>();
    for (const row of rows) {
        const key = merchantKey(row.note);
        // A row whose `updatedAt` moved past this device's last bare write (a peer's sync edit) is no longer ours to
        // paint. The stamp is windowed too, or a future-dated pending charge would stay eligible while bare.
        const stamp = candidates.get(row.id);
        if (
            key.length === 0 ||
            stamp === undefined ||
            stamp !== row.updatedAt.getTime() ||
            now - stamp > WINDOW_MS ||
            dismissed.has(row.id)
        ) {
            continue;
        }
        const id = `${key}|${row.currency ?? ""}`;
        const group = groups.get(id);
        const pending: PendingRow = { currency: row.currency, id: row.id, note: row.note, updatedAt: row.updatedAt };
        if (group) {
            group.rows.push(pending);
        } else {
            groups.set(id, { currency: row.currency, id, income: row.income, key, note: row.note, rows: [pending] });
        }
    }
    return [...groups.values()];
}

// The UPDATE reads the dismissal list itself, so a logo removed by hand mid-lookup can't slip between check and write.
async function paintRow(db: Database, row: PendingRow, logo: { imageColor: string | null; imageUri: string }) {
    const sameCurrency =
        row.currency === null ? isNull(transactions.currency) : eq(transactions.currency, row.currency);
    // Ids carry no quotes, so the quoted id is exactly one JSON array element.
    const notDismissed = notExists(
        db
            .select({ key: appMeta.key })
            .from(appMeta)
            .where(and(eq(appMeta.key, META_KEYS.logoDismissals), sql`instr(${appMeta.value}, ${`"${row.id}"`}) > 0`))
    );
    const painted = await db
        .update(transactions)
        // Never behind the row's own clock, or a row lifted ahead by account adoption loses sync's last-writer check.
        .set({
            imageColor: logo.imageColor,
            imageUri: logo.imageUri,
            updatedAt: new Date(Math.max(Date.now(), row.updatedAt.getTime() + 1)),
        })
        .where(
            and(
                eq(transactions.id, row.id),
                eq(transactions.note, row.note),
                eq(transactions.updatedAt, row.updatedAt),
                sameCurrency,
                bare(),
                notDismissed
            )
        )
        .returning({ id: transactions.id });
    return painted.length;
}

// The pass awaits the network between groups; a row renamed or deleted meanwhile must not have its old name sent.
async function stillPending(db: Database, group: MerchantGroup): Promise<boolean> {
    const live = await db
        .select({
            currency: transactions.currency,
            id: transactions.id,
            note: transactions.note,
            updatedAt: transactions.updatedAt,
        })
        .from(transactions)
        .where(
            and(
                inArray(
                    transactions.id,
                    group.rows.map((row) => row.id)
                ),
                bare()
            )
        );
    return group.rows.some((row) =>
        live.some(
            (current) =>
                current.id === row.id &&
                current.note === row.note &&
                current.currency === row.currency &&
                current.updatedAt.getTime() === row.updatedAt.getTime()
        )
    );
}

type DomainAnswer =
    | { domain: string; kind: "domain"; spentRemote: boolean }
    | { kind: "none"; retryIn: number; spentRemote: boolean }
    | { kind: "later" }
    | { kind: "withdrawn" };

// Nothing is written back to the session cache: the empty shape `suggest` returns when signed out or rate-limited
// would poison the form's next lookup of the same name.
async function resolveDomain(group: MerchantGroup, deps: LogoBackfillDeps, remoteLeft: number): Promise<DomainAnswer> {
    const curated = resolveMerchant(group.key)?.domain ?? null;
    if (curated !== null) {
        return { domain: curated, kind: "domain", spentRemote: false };
    }
    const cached = getCachedEnrichment(group.key, group.currency ?? undefined);
    if (cached.hit && cached.value?.domain != null) {
        return { domain: cached.value.domain, kind: "domain", spentRemote: false };
    }
    // Never asked, so not a miss: turning smart fill on should find it on the very next pass.
    if (deps.enrich === null || remoteLeft <= 0) {
        return { kind: "later" };
    }
    let sent: { groundedLookup: boolean; result: RemoteEnrichmentResult } | null;
    try {
        sent = await deps.enrich({ currency: group.currency, income: group.income, name: group.note.trim() });
    } catch {
        return { kind: "none", retryIn: RETRY_GROUNDING_MS, spentRemote: true };
    }
    if (sent === null) {
        return { kind: "withdrawn" };
    }
    const { groundedLookup, result } = sent;
    if (result.domain != null) {
        return { domain: result.domain, kind: "domain", spentRemote: true };
    }
    if (result.grounding === true) {
        return { kind: "none", retryIn: RETRY_GROUNDING_MS, spentRemote: true };
    }
    // The all-null shape is also what a signed-out, rate-limited or failed call answers, so only a classified name
    // that had web search is a real miss.
    const definitive = result.categoryName !== null && groundedLookup;
    return {
        kind: "none",
        retryIn: definitive ? RETRY_MISS_MS : RETRY_INDETERMINATE_MS,
        spentRemote: true,
    };
}

export async function attachMissingLogos(db: Database, deps: LogoBackfillDeps): Promise<number> {
    const now = deps.now ?? Date.now();
    const pending = await pendingGroups(db, now);
    const retryAfter = await readRetryDeadlines(db, now);
    // Oldest deadline first, or the newest rows' misses take the budget every pass and older rows age out unasked.
    const groups = pending
        .filter((group) => (retryAfter.get(group.id) ?? 0) <= now)
        .sort((a, b) => (retryAfter.get(a.id) ?? 0) - (retryAfter.get(b.id) ?? 0));
    let remoteLeft = REMOTE_BUDGET;
    let fetchesLeft = FETCH_LIMIT;
    let painted = 0;

    /* oxlint-disable no-await-in-loop -- the remote and fetch budgets are running counts, so the groups have to be resolved one at a time */
    for (const group of groups) {
        if (fetchesLeft <= 0 || deps.cancelled?.()) {
            break;
        }
        if (!(await stillPending(db, group))) {
            continue;
        }
        if (deps.cancelled?.()) {
            break;
        }
        const answer = await resolveDomain(group, deps, remoteLeft);
        if (answer.kind === "withdrawn") {
            break;
        }
        if (answer.kind === "later") {
            continue;
        }
        if (answer.spentRemote) {
            remoteLeft -= 1;
        }
        if (answer.kind === "none") {
            retryAfter.set(group.id, now + answer.retryIn);
            continue;
        }
        if (!(await stillPending(db, group))) {
            continue;
        }
        if (deps.cancelled?.()) {
            break;
        }
        fetchesLeft -= 1;
        const outcome = await deps.fetchImage({ domain: answer.domain, name: group.note.trim() });
        if (outcome.kind !== "logo") {
            // "none" also covers timeouts and offline; the logo cache remembers real misses, so retrying is cheap.
            retryAfter.set(group.id, now + RETRY_INDETERMINATE_MS);
            continue;
        }
        // One file per row: a photo is owned by the row naming it, so deleting one row never orphans another's image.
        for (const row of group.rows) {
            if (deps.cancelled?.()) {
                break;
            }
            let logo: { imageColor: string | null; imageUri: string };
            try {
                logo = await deps.persist(outcome.bytes);
            } catch {
                continue;
            }
            let took = 0;
            try {
                took = deps.cancelled?.() ? 0 : await paintRow(db, row, logo);
            } catch (error) {
                deps.discard?.(logo.imageUri);
                throw error;
            }
            if (took === 0) {
                deps.discard?.(logo.imageUri);
            }
            painted += took;
        }
    }
    /* oxlint-enable no-await-in-loop */

    if (!deps.cancelled?.()) {
        await writeRetryDeadlines(db, retryAfter);
    }
    return painted;
}
