import { and, eq, inArray, isNull } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import type { Database } from "@/db/client";
import { categories, transactions } from "@/db/schema";
import { merchantKey } from "@/domain/merchant-resolver";
import type { CloudError } from "@/lib/cloud-error";
import type { LogoOutcome, MerchantImageRequest } from "@/lib/logo-fetch";

import { getMeta, META_KEYS, setMeta } from "./app-meta-core";
import { ensureCategoryByName, presetForName } from "./categories-core";
import { rememberMerchant } from "./merchant-book-core";
import { tagIdsForQuery, tagsRepo } from "./tags-core";

export interface EnrichmentAnswer {
    categoryName: string | null;
    domain: string | null;
    emoji: string | null;
    isNewCategory: boolean;
    merchantName: string | null;
    parentCategoryName: string | null;
    tags: readonly string[];
}

export interface AnsweredJob {
    localId: string;
    name: string;
    result: EnrichmentAnswer | null;
}

export interface EnrichmentJobRequest {
    categoryTree: { children: string[]; name: string }[];
    currency?: string;
    groundedLookup: boolean;
    income: boolean;
    localId: string;
    locale?: string;
    name: string;
    regionCode?: string;
}

export interface SendDeps {
    enqueue: (request: EnrichmentJobRequest) => Effect.Effect<boolean, CloudError>;
    groundedLookup: boolean;
    locale?: string;
    regionCode?: string;
}

export interface ApplyDeps {
    discard: (imageUri: string) => void;
    fetchImage: (request: MerchantImageRequest) => Effect.Effect<LogoOutcome>;
    persist: (bytes: Uint8Array) => Effect.Effect<{ imageColor: string | null; imageUri: string }, unknown>;
}

export const MIN_KEY_LENGTH = 3;
const MAX_OUTBOX = 100;
const decodeOutbox = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.mutable(Schema.Array(Schema.String))));

const EnrichmentQueueOperation = Schema.Literals(["apply", "send"]);

export class EnrichmentQueueError extends Schema.TaggedError<EnrichmentQueueError>()("EnrichmentQueueError", {
    cause: Schema.Defect(),
    operation: EnrichmentQueueOperation,
}) {
    override get message(): string {
        return `Enrichment ${this.operation} failed`;
    }
}

const attempt = <A>(operation: typeof EnrichmentQueueOperation.Type, run: () => PromiseLike<A>) =>
    Effect.tryPromise({ catch: (cause) => new EnrichmentQueueError({ cause, operation }), try: run });

const readOutbox = Effect.fn("EnrichmentQueue.readOutbox")(function* readOutbox(db: Database) {
    const raw = yield* getMeta(db, META_KEYS.enrichmentOutbox);
    const ids: string[] = Option.getOrElse(decodeOutbox(raw ?? "[]"), () => []);
    return ids;
});

const writeOutbox = (db: Database, ids: readonly string[]) =>
    setMeta(db, META_KEYS.enrichmentOutbox, JSON.stringify(ids.slice(-MAX_OUTBOX)));

export const queueEnrichment = Effect.fn("EnrichmentQueue.queueEnrichment")(function* queueEnrichment(
    db: Database,
    id: string
) {
    const queued = yield* readOutbox(db);
    if (!queued.includes(id)) {
        yield* writeOutbox(db, [...queued, id]);
    }
});

const categoryTree = Effect.fn("EnrichmentQueue.categoryTree")(function* categoryTree(db: Database, income: boolean) {
    const rows = yield* attempt("send", () =>
        db
            .select({ id: categories.id, name: categories.name, parentId: categories.parentId })
            .from(categories)
            .where(and(eq(categories.income, income), isNull(categories.deletedAt)))
    );
    const tree: EnrichmentJobRequest["categoryTree"] = rows.flatMap((parent) =>
        parent.parentId == null && parent.name != null
            ? [
                  {
                      children: rows.flatMap((child) =>
                          child.parentId === parent.id && child.name != null ? [child.name] : []
                      ),
                      name: parent.name,
                  },
              ]
            : []
    );
    return tree;
});

export const sendQueuedEnrichment = Effect.fn("EnrichmentQueue.sendQueuedEnrichment")(function* sendQueuedEnrichment(
    db: Database,
    deps: SendDeps
) {
    const queued = yield* readOutbox(db);
    if (queued.length === 0) {
        return 0;
    }
    const rows = yield* attempt("send", () =>
        db
            .select({
                currency: transactions.currency,
                deletedAt: transactions.deletedAt,
                id: transactions.id,
                income: transactions.income,
                note: transactions.note,
            })
            .from(transactions)
            .where(inArray(transactions.id, queued))
    );
    const settled = new Set<string>();
    // A failed send means the device is offline or signed out, and every later send would fail the same way.
    for (const id of queued) {
        const row = rows.find((candidate) => candidate.id === id);
        if (row == null || row.deletedAt != null || merchantKey(row.note).length < MIN_KEY_LENGTH) {
            settled.add(id);
            continue;
        }
        const sent = yield* categoryTree(db, row.income).pipe(
            Effect.flatMap((tree) =>
                deps
                    .enqueue({
                        categoryTree: tree,
                        currency: row.currency ?? undefined,
                        groundedLookup: deps.groundedLookup,
                        income: row.income,
                        localId: row.id,
                        locale: deps.locale,
                        name: row.note.trim(),
                        regionCode: deps.regionCode,
                    })
                    .pipe(Effect.mapError((cause) => new EnrichmentQueueError({ cause, operation: "send" })))
            ),
            Effect.as(true),
            Effect.catchTags({ EnrichmentQueueError: () => Effect.succeed(false) })
        );
        if (!sent) {
            break;
        }
        settled.add(id);
    }
    const current = yield* readOutbox(db);
    yield* writeOutbox(
        db,
        current.filter((id) => !settled.has(id))
    );
    return settled.size;
});

function bare(row: typeof transactions.$inferSelect): boolean {
    return (
        row.imageUri == null && row.imageKey == null && row.icon == null && row.emoji == null && row.customColor == null
    );
}

const readRow = Effect.fn("EnrichmentQueue.readRow")(function* readRow(db: Database, id: string) {
    const [row] = yield* attempt("apply", () =>
        db
            .select()
            .from(transactions)
            .where(and(eq(transactions.id, id), isNull(transactions.deletedAt)))
            .limit(1)
    );
    return row ?? null;
});

const parentIdFor = Effect.fn("EnrichmentQueue.parentIdFor")(function* parentIdFor(
    db: Database,
    income: boolean,
    name: string | null
) {
    if (name == null) {
        return null;
    }
    const [parent] = yield* attempt("apply", () =>
        db
            .select({ id: categories.id })
            .from(categories)
            .where(
                and(
                    eq(categories.income, income),
                    eq(categories.name, name),
                    isNull(categories.parentId),
                    isNull(categories.deletedAt)
                )
            )
            .limit(1)
    );
    return parent?.id ?? null;
});

const fetchLogo = Effect.fn("EnrichmentQueue.fetchLogo")(function* fetchLogo(
    deps: ApplyDeps,
    domain: string | null,
    name: string
) {
    if (domain == null) {
        return null;
    }
    const outcome = yield* deps.fetchImage({ domain, name });
    if (outcome.kind !== "logo") {
        return null;
    }
    return yield* deps
        .persist(outcome.bytes)
        .pipe(Effect.mapError((cause) => new EnrichmentQueueError({ cause, operation: "apply" })));
});

export const applyEnrichmentAnswer = Effect.fn("EnrichmentQueue.applyEnrichmentAnswer")(function* applyEnrichmentAnswer(
    db: Database,
    job: AnsweredJob,
    deps: ApplyDeps
) {
    const answer = job.result;
    const before = answer == null ? null : yield* readRow(db, job.localId);
    if (answer == null || before == null) {
        return;
    }
    yield* rememberMerchant(db, job.name, before.currency, {
        ...answer,
        emoji: answer.emoji,
        tags: [...answer.tags],
    });
    const renamed =
        before.note === job.name &&
        answer.merchantName != null &&
        merchantKey(answer.merchantName) !== merchantKey(before.note)
            ? answer.merchantName
            : null;
    const logo = bare(before) ? yield* fetchLogo(deps, answer.domain, renamed ?? before.note) : null;
    let categoryId: string | null = null;
    if (before.categoryId == null && answer.categoryName != null) {
        const { categoryName } = answer;
        const style = presetForName(categoryName);
        const parentId = yield* parentIdFor(db, before.income, answer.parentCategoryName);
        categoryId = yield* ensureCategoryByName(db, categoryName, before.income, style.icon, style.color, {
            emoji: answer.emoji,
            parentId,
        });
    }

    const row = yield* readRow(db, job.localId);
    const patch: Partial<typeof transactions.$inferInsert> = {};
    if (row != null && renamed != null && row.note === job.name) {
        patch.note = renamed;
        patch.details = row.details ?? job.name;
    }
    if (row != null && categoryId != null && row.categoryId == null) {
        patch.categoryId = categoryId;
    }
    const painted = row != null && logo != null && bare(row);
    if (painted) {
        patch.imageColor = logo.imageColor;
        patch.imageUri = logo.imageUri;
    }
    if (logo != null && !painted) {
        deps.discard(logo.imageUri);
    }
    if (row != null && Object.keys(patch).length > 0) {
        yield* attempt("apply", () =>
            db
                .update(transactions)
                .set({ ...patch, updatedAt: new Date(Math.max(Date.now(), row.updatedAt.getTime() + 1)) })
                .where(eq(transactions.id, row.id))
        );
    }
    const tagged = row == null ? [] : yield* attempt("apply", () => tagIdsForQuery(db, row.id));
    if (row != null && answer.tags.length > 0 && tagged.length === 0) {
        const tagIds: string[] = [];
        // `ensureTag` matches before inserting with no unique constraint behind it, so two names that normalize to
        // the same tag would each insert a row if these ran concurrently.
        for (const name of answer.tags) {
            const tagId = yield* tagsRepo.ensureTag(db, name);
            if (tagId != null && !tagIds.includes(tagId)) {
                tagIds.push(tagId);
            }
        }
        yield* tagsRepo.setTagsFor(db, row.id, tagIds);
    }
});
