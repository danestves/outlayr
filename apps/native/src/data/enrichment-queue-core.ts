import { and, eq, inArray, isNull } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { Database } from "@/db/client";
import { categories, transactions } from "@/db/schema";
import { merchantKey } from "@/domain/merchant-resolver";
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
    enqueue: (request: EnrichmentJobRequest) => Promise<boolean>;
    groundedLookup: boolean;
    locale?: string;
    regionCode?: string;
}

export interface ApplyDeps {
    discard: (imageUri: string) => void;
    fetchImage: (request: MerchantImageRequest) => Promise<LogoOutcome>;
    persist: (bytes: Uint8Array) => Promise<{ imageColor: string | null; imageUri: string }>;
}

export const MIN_KEY_LENGTH = 3;
const MAX_OUTBOX = 100;
const decodeOutbox = Schema.decodeUnknownSync(
    Schema.mutable(Schema.Array(Schema.String)).pipe(Schema.catchDecoding(() => Effect.succeedSome([])))
);

async function readOutbox(db: Database): Promise<string[]> {
    const raw = await getMeta(db, META_KEYS.enrichmentOutbox);
    try {
        return decodeOutbox(JSON.parse(raw ?? "[]"));
    } catch {
        return [];
    }
}

async function writeOutbox(db: Database, ids: readonly string[]): Promise<void> {
    await setMeta(db, META_KEYS.enrichmentOutbox, JSON.stringify(ids.slice(-MAX_OUTBOX)));
}

export async function queueEnrichment(db: Database, id: string): Promise<void> {
    const queued = await readOutbox(db);
    if (!queued.includes(id)) {
        await writeOutbox(db, [...queued, id]);
    }
}

async function categoryTree(db: Database, income: boolean): Promise<EnrichmentJobRequest["categoryTree"]> {
    const rows = await db
        .select({ id: categories.id, name: categories.name, parentId: categories.parentId })
        .from(categories)
        .where(and(eq(categories.income, income), isNull(categories.deletedAt)));
    return rows.flatMap((parent) =>
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
}

export async function sendQueuedEnrichment(db: Database, deps: SendDeps): Promise<number> {
    const queued = await readOutbox(db);
    if (queued.length === 0) {
        return 0;
    }
    const rows = await db
        .select({
            currency: transactions.currency,
            deletedAt: transactions.deletedAt,
            id: transactions.id,
            income: transactions.income,
            note: transactions.note,
        })
        .from(transactions)
        .where(inArray(transactions.id, queued));
    const settled = new Set<string>();
    /* oxlint-disable no-await-in-loop -- a failed send means the device is offline or signed out, and every later send would fail the same way */
    for (const id of queued) {
        const row = rows.find((candidate) => candidate.id === id);
        if (row == null || row.deletedAt != null || merchantKey(row.note).length < MIN_KEY_LENGTH) {
            settled.add(id);
            continue;
        }
        try {
            await deps.enqueue({
                categoryTree: await categoryTree(db, row.income),
                currency: row.currency ?? undefined,
                groundedLookup: deps.groundedLookup,
                income: row.income,
                localId: row.id,
                locale: deps.locale,
                name: row.note.trim(),
                regionCode: deps.regionCode,
            });
        } catch {
            break;
        }
        settled.add(id);
    }
    /* oxlint-enable no-await-in-loop */
    const current = await readOutbox(db);
    await writeOutbox(
        db,
        current.filter((id) => !settled.has(id))
    );
    return settled.size;
}

function bare(row: typeof transactions.$inferSelect): boolean {
    return (
        row.imageUri == null && row.imageKey == null && row.icon == null && row.emoji == null && row.customColor == null
    );
}

async function readRow(db: Database, id: string) {
    const [row] = await db
        .select()
        .from(transactions)
        .where(and(eq(transactions.id, id), isNull(transactions.deletedAt)))
        .limit(1);
    return row ?? null;
}

async function parentIdFor(db: Database, income: boolean, name: string | null): Promise<string | null> {
    if (name == null) {
        return null;
    }
    const [parent] = await db
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
        .limit(1);
    return parent?.id ?? null;
}

async function fetchLogo(
    deps: ApplyDeps,
    domain: string | null,
    name: string
): Promise<{ imageColor: string | null; imageUri: string } | null> {
    if (domain == null) {
        return null;
    }
    const outcome = await deps.fetchImage({ domain, name });
    return outcome.kind === "logo" ? await deps.persist(outcome.bytes) : null;
}

export async function applyEnrichmentAnswer(db: Database, job: AnsweredJob, deps: ApplyDeps): Promise<void> {
    const answer = job.result;
    const before = answer == null ? null : await readRow(db, job.localId);
    if (answer == null || before == null) {
        return;
    }
    await rememberMerchant(db, job.name, before.currency, { ...answer, emoji: answer.emoji, tags: [...answer.tags] });
    const renamed =
        before.note === job.name &&
        answer.merchantName != null &&
        merchantKey(answer.merchantName) !== merchantKey(before.note)
            ? answer.merchantName
            : null;
    const logo = bare(before) ? await fetchLogo(deps, answer.domain, renamed ?? before.note) : null;
    let categoryId: string | null = null;
    if (before.categoryId == null && answer.categoryName != null) {
        const style = presetForName(answer.categoryName);
        categoryId = await ensureCategoryByName(db, answer.categoryName, before.income, style.icon, style.color, {
            emoji: answer.emoji,
            parentId: await parentIdFor(db, before.income, answer.parentCategoryName),
        });
    }

    const row = await readRow(db, job.localId);
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
        await db
            .update(transactions)
            .set({ ...patch, updatedAt: new Date(Math.max(Date.now(), row.updatedAt.getTime() + 1)) })
            .where(eq(transactions.id, row.id));
    }
    const tagged = row == null ? [] : await tagIdsForQuery(db, row.id);
    if (row != null && answer.tags.length > 0 && tagged.length === 0) {
        const tagIds: string[] = [];
        for (const name of answer.tags) {
            // oxlint-disable-next-line no-await-in-loop -- `ensureTag` matches before inserting with no unique constraint behind it, so two names that normalize to the same tag would each insert a row if these ran concurrently.
            const tagId = await tagsRepo.ensureTag(db, name);
            if (tagId != null && !tagIds.includes(tagId)) {
                tagIds.push(tagId);
            }
        }
        await tagsRepo.setTagsFor(db, row.id, tagIds);
    }
}
