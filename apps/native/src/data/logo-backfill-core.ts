import { and, desc, eq, gte, inArray, isNull, ne, notExists, sql } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { Database } from "@/db/client";
import { appMeta, transactions } from "@/db/schema";
import { getCachedEnrichment } from "@/domain/enrichment-cache";
import type { RemoteEnrichmentResult } from "@/domain/enrichment-cache";
import { merchantKey, resolveMerchant } from "@/domain/merchant-resolver";
import type { LogoOutcome, MerchantImageRequest } from "@/lib/logo-fetch";

import { META_KEYS } from "./app-meta-core";
import { candidateLogoIds, dismissedLogoIds, readRetryDeadlines, writeRetryDeadlines } from "./logo-backfill-state";

const LogoBackfillOperation = Schema.Literals(["paint", "pending", "persist", "resolve"]);

export class LogoBackfillError extends Schema.TaggedError<LogoBackfillError>()("LogoBackfillError", {
    cause: Schema.Defect(),
    operation: LogoBackfillOperation,
}) {
    override get message(): string {
        return `Logo backfill ${this.operation} failed`;
    }
}

const attempt = <A>(operation: typeof LogoBackfillOperation.Type, run: () => PromiseLike<A>) =>
    Effect.tryPromise({ catch: (cause) => new LogoBackfillError({ cause, operation }), try: run });

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
    fetchImage: (request: MerchantImageRequest) => Effect.Effect<LogoOutcome>;
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
const pendingGroups = Effect.fn("LogoBackfill.pendingGroups")(function* pendingGroups(db: Database, now: number) {
    const rows = yield* attempt("pending", () =>
        db
            .select({
                currency: transactions.currency,
                id: transactions.id,
                income: transactions.income,
                note: transactions.note,
                updatedAt: transactions.updatedAt,
            })
            .from(transactions)
            .where(and(bare(), ne(transactions.note, ""), gte(transactions.date, new Date(now - WINDOW_MS))))
            .orderBy(desc(transactions.date))
    );
    const candidates = yield* candidateLogoIds(db);
    const dismissed = yield* dismissedLogoIds(db);

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
});

// The UPDATE reads the dismissal list itself, so a logo removed by hand mid-lookup can't slip between check and write.
const paintRow = Effect.fn("LogoBackfill.paintRow")(function* paintRow(
    db: Database,
    row: PendingRow,
    logo: { imageColor: string | null; imageUri: string }
) {
    const sameCurrency =
        row.currency === null ? isNull(transactions.currency) : eq(transactions.currency, row.currency);
    // Ids carry no quotes, so the quoted id is exactly one JSON array element.
    const notDismissed = notExists(
        db
            .select({ key: appMeta.key })
            .from(appMeta)
            .where(and(eq(appMeta.key, META_KEYS.logoDismissals), sql`instr(${appMeta.value}, ${`"${row.id}"`}) > 0`))
    );
    const painted = yield* attempt("paint", () =>
        db
            .update(transactions)
            // Never behind the row's own clock, or a row lifted ahead by account adoption loses sync's last-writer
            // check.
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
            .returning({ id: transactions.id })
    );
    return painted.length;
});

// The pass awaits the network between groups; a row renamed or deleted meanwhile must not have its old name sent.
const stillPending = Effect.fn("LogoBackfill.stillPending")(function* stillPending(db: Database, group: MerchantGroup) {
    const live = yield* attempt("pending", () =>
        db
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
});

type DomainAnswer =
    | { domain: string; kind: "domain"; spentRemote: boolean }
    | { kind: "none"; retryIn: number; spentRemote: boolean }
    | { kind: "later" }
    | { kind: "withdrawn" };

// Nothing is written back to the session cache: the empty shape `suggest` returns when signed out or rate-limited
// would poison the form's next lookup of the same name.
const resolveDomain = Effect.fn("LogoBackfill.resolveDomain")(function* resolveDomain(
    group: MerchantGroup,
    deps: LogoBackfillDeps,
    remoteLeft: number
) {
    const curated = resolveMerchant(group.key)?.domain ?? null;
    if (curated !== null) {
        const answer: DomainAnswer = { domain: curated, kind: "domain", spentRemote: false };
        return answer;
    }
    const cached = getCachedEnrichment(group.key, group.currency ?? undefined);
    if (cached.hit && cached.value?.domain != null) {
        const answer: DomainAnswer = { domain: cached.value.domain, kind: "domain", spentRemote: false };
        return answer;
    }
    // Never asked, so not a miss: turning smart fill on should find it on the very next pass.
    const { enrich } = deps;
    if (enrich === null || remoteLeft <= 0) {
        const answer: DomainAnswer = { kind: "later" };
        return answer;
    }
    const asked = yield* attempt("resolve", () =>
        enrich({ currency: group.currency, income: group.income, name: group.note.trim() })
    ).pipe(
        Effect.map((sent) => ({ failed: false as const, sent })),
        Effect.catchTags({ LogoBackfillError: () => Effect.succeed({ failed: true as const }) })
    );
    if (asked.failed) {
        const answer: DomainAnswer = { kind: "none", retryIn: RETRY_GROUNDING_MS, spentRemote: true };
        return answer;
    }
    const { sent } = asked;
    if (sent === null) {
        const answer: DomainAnswer = { kind: "withdrawn" };
        return answer;
    }
    const { groundedLookup, result } = sent;
    if (result.domain != null) {
        const answer: DomainAnswer = { domain: result.domain, kind: "domain", spentRemote: true };
        return answer;
    }
    if (result.grounding === true) {
        const answer: DomainAnswer = { kind: "none", retryIn: RETRY_GROUNDING_MS, spentRemote: true };
        return answer;
    }
    // The all-null shape is also what a signed-out, rate-limited or failed call answers, so only a classified name
    // that had web search is a real miss.
    const definitive = result.categoryName !== null && groundedLookup;
    const answer: DomainAnswer = {
        kind: "none",
        retryIn: definitive ? RETRY_MISS_MS : RETRY_INDETERMINATE_MS,
        spentRemote: true,
    };
    return answer;
});

export const attachMissingLogos = Effect.fn("LogoBackfill.attachMissingLogos")(function* attachMissingLogos(
    db: Database,
    deps: LogoBackfillDeps
) {
    const now = deps.now ?? Date.now();
    const pending = yield* pendingGroups(db, now);
    const retryAfter = yield* readRetryDeadlines(db, now);
    // Oldest deadline first, or the newest rows' misses take the budget every pass and older rows age out unasked.
    const groups = pending
        .filter((group) => (retryAfter.get(group.id) ?? 0) <= now)
        .sort((a, b) => (retryAfter.get(a.id) ?? 0) - (retryAfter.get(b.id) ?? 0));
    let remoteLeft = REMOTE_BUDGET;
    let fetchesLeft = FETCH_LIMIT;
    let painted = 0;

    // The remote and fetch budgets are running counts, so the groups have to be resolved one at a time.
    for (const group of groups) {
        if (fetchesLeft <= 0 || deps.cancelled?.()) {
            break;
        }
        if (!(yield* stillPending(db, group))) {
            continue;
        }
        if (deps.cancelled?.()) {
            break;
        }
        const answer = yield* resolveDomain(group, deps, remoteLeft);
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
        if (!(yield* stillPending(db, group))) {
            continue;
        }
        if (deps.cancelled?.()) {
            break;
        }
        fetchesLeft -= 1;
        const { domain } = answer;
        const outcome = yield* deps.fetchImage({ domain, name: group.note.trim() });
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
            const logo = yield* attempt("persist", () => deps.persist(outcome.bytes)).pipe(
                Effect.catchTags({ LogoBackfillError: () => Effect.succeed(null) })
            );
            if (logo === null) {
                continue;
            }
            const took = yield* (deps.cancelled?.() ? Effect.succeed(0) : paintRow(db, row, logo)).pipe(
                Effect.tapError(() =>
                    Effect.sync(() => {
                        deps.discard?.(logo.imageUri);
                    })
                )
            );
            if (took === 0) {
                deps.discard?.(logo.imageUri);
            }
            painted += took;
        }
    }

    if (!deps.cancelled?.()) {
        yield* writeRetryDeadlines(db, retryAfter);
    }
    return painted;
});
