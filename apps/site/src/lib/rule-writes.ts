import { bulkEdited, toCategory } from "./bulk-writes";
import type { Ledger } from "./dashboard-series-ledger";
import type { EntryValues } from "./entry-writes";
import type { CommitRow } from "./ledger-committer";
import type { Tag, TagBooks, TagLink } from "./ledger-db";
import type { CategoryKinds, Change, RuleEntry } from "./rules";

export const TAG_NAME_LIMIT = 24;

export const normalizeTagName = (raw: string) =>
    raw.replace(/^#+/, "").trim().replaceAll(/\s+/g, " ").slice(0, TAG_NAME_LIMIT);

const tagKey = (name: string) => normalizeTagName(name).toLocaleLowerCase();

export const liveTags = (books: TagBooks) =>
    books.tags
        .filter((tag) => tag.deletedAt === null && tag.name !== "")
        .toSorted((a, b) => tagKey(a.name).localeCompare(tagKey(b.name)));

export const findTag = (tags: readonly Tag[], name: string) =>
    tags.find((tag) => tag.deletedAt === null && tagKey(tag.name) === tagKey(name));

export const createdTag = (id: string, name: string, at: number): CommitRow => ({
    deletedAt: null,
    fields: { color: null, name: normalizeTagName(name), sortOrder: 0 },
    localId: id,
    table: "tags",
    updatedAt: at,
});

export const categoryKinds = (books: Ledger["books"]): CategoryKinds =>
    new Map(books.categories.filter((row) => row.deletedAt === null).map((row) => [row.localId, row.income]));

export function ruleEntries(ledger: Pick<Ledger, "books" | "currency" | "rows">, tags: TagBooks): RuleEntry[] {
    const { books } = ledger;
    const live = new Set(liveTags(tags).map((tag) => tag.localId));
    const tagged = new Map<string, Set<string>>();
    for (const link of tags.links) {
        if (link.deletedAt !== null || !live.has(link.tagId)) {
            continue;
        }
        const set = tagged.get(link.transactionId);
        if (set) {
            set.add(link.tagId);
        } else {
            tagged.set(link.transactionId, new Set([link.tagId]));
        }
    }
    const financed = new Set(
        books.installmentPlans.filter((plan) => plan.deletedAt === null).map((plan) => plan.transactionId)
    );
    const none: ReadonlySet<string> = new Set();
    const shown = new Map(ledger.rows.map((row) => [row.id, row]));
    return books.transactions
        .flatMap((row) => {
            const line = shown.get(row.localId);
            const plain =
                row.deletedAt === null &&
                row.feeForId == null &&
                row.transferId == null &&
                row.installmentId == null &&
                !financed.has(row.localId);
            return line && plain
                ? [
                      {
                          amount: row.amount,
                          at: row.date,
                          categoryId: row.categoryId,
                          currency: row.currency ?? ledger.currency,
                          day: line.day,
                          details: row.details ?? "",
                          id: row.localId,
                          imageKey: row.imageKey ?? null,
                          income: row.income,
                          note: row.note,
                          tagIds: tagged.get(row.localId) ?? none,
                          worth: line.amount,
                      },
                  ]
                : [];
        })
        .toSorted((a, b) => b.at - a.at);
}

export const newLink = (transactionId: string, tagId: string, at: number): CommitRow => ({
    deletedAt: null,
    fields: { tagId, transactionId },
    localId: crypto.randomUUID(),
    table: "transactionTags",
    updatedAt: at,
});

type SeenLink = Pick<TagLink, "deletedAt" | "localId" | "restoredAt" | "tagId" | "transactionId" | "updatedAt">;

export function linkRows(
    links: readonly SeenLink[],
    changes: readonly { entry: Pick<RuleEntry, "id">; tagIds: readonly string[] }[],
    at: number
): CommitRow[] {
    const known = new Map(links.map((link) => [`${link.transactionId}|${link.tagId}`, link]));
    return changes.flatMap(({ entry, tagIds }) =>
        tagIds.map((tagId): CommitRow => {
            const retired = known.get(`${entry.id}|${tagId}`);
            if (!retired) {
                return newLink(entry.id, tagId, at);
            }
            const era = Math.max(retired.deletedAt ?? 0, retired.restoredAt ?? 0);
            return {
                deletedAt: null,
                fields: { tagId, transactionId: entry.id },
                localId: retired.localId,
                restoredAt: Math.max(at, era + 1),
                table: "transactionTags",
                updatedAt: Math.max(at, retired.updatedAt + 1),
            };
        })
    );
}

export function appliedRun(
    ledger: Ledger,
    tags: TagBooks,
    changes: readonly Change[],
    feeNoteOf: (values: EntryValues) => string,
    at = Date.now()
) {
    const kinds = categoryKinds(ledger.books);
    const byCategory = new Map<string, string[]>();
    for (const { categoryId, entry } of changes) {
        if (categoryId !== null) {
            byCategory.set(categoryId, [...(byCategory.get(categoryId) ?? []), entry.id]);
        }
    }
    const rows: CommitRow[] = [];
    let moved = 0;
    for (const [categoryId, ids] of byCategory) {
        const income = kinds.get(categoryId);
        if (income === undefined) {
            continue;
        }
        const edited = bulkEdited(ledger, ids, toCategory(categoryId, income), feeNoteOf, at);
        rows.push(...edited.rows);
        moved += edited.count;
    }
    const links = linkRows(tags.links, changes, at);
    return { moved, rows: [...rows, ...links], tagged: links.length };
}
