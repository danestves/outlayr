import { and, eq, inArray, isNull } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { Database } from "@/db/client";
import { tags, transactionTags } from "@/db/schema";
import { transaction } from "@/db/transaction";
import { newId } from "@/domain/ids";
import { findTagByName, normalizeTagName, tagLinkDiff } from "@/domain/tags";

import { restoreStamp } from "./sync-engine-core";

const TagsOperation = Schema.Literals(["delete", "ensure", "rename", "write"]);

export class TagsError extends Schema.TaggedError<TagsError>()("TagsError", {
    cause: Schema.Defect(),
    operation: TagsOperation,
}) {
    override get message(): string {
        return `Tags ${this.operation} failed`;
    }
}

const failedAt = (operation: typeof TagsOperation.Type) => (cause: unknown) => new TagsError({ cause, operation });

const query = <A>(operation: typeof TagsOperation.Type, run: () => PromiseLike<A>) =>
    Effect.tryPromise({ catch: failedAt(operation), try: run });

export interface TagRow {
    color: string | null;
    id: string;
    name: string;
    sortOrder: number;
}

/** Blanked like every other tombstone, so a stale device has no name left to render. */
const TOMBSTONED_TAG = {
    color: null,
    name: "",
    sortOrder: 0,
} as const;

export function liveTagsQuery(db: Database) {
    return db
        .select({
            color: tags.color,
            id: tags.id,
            name: tags.name,
            sortOrder: tags.sortOrder,
        })
        .from(tags)
        .where(isNull(tags.deletedAt));
}

export function tagIdsForQuery(db: Database, transactionId: string) {
    return db
        .select({ tagId: transactionTags.tagId })
        .from(transactionTags)
        .where(and(eq(transactionTags.transactionId, transactionId), isNull(transactionTags.deletedAt)));
}

const writeTagsFor = Effect.fn("Tags.writeTagsFor")(function* writeTagsFor(
    db: Database,
    transactionId: string,
    tagIds: readonly string[]
) {
    const now = new Date();
    const rows = yield* query("write", () => tagIdsForQuery(db, transactionId));
    const current = rows.map((row) => row.tagId);
    const { attach, detach } = tagLinkDiff(current, tagIds);
    if (detach.length > 0) {
        yield* query("write", () =>
            db
                .update(transactionTags)
                .set({ deletedAt: now, updatedAt: now })
                .where(
                    and(eq(transactionTags.transactionId, transactionId), inArray(transactionTags.tagId, [...detach]))
                )
        );
    }
    // expo-sqlite's withTransactionAsync shares one connection, so statements issued concurrently inside the callback
    // interleave with the transaction boundary.
    for (const tagId of attach) {
        const retired = yield* query("write", () =>
            db
                .select({
                    deletedAt: transactionTags.deletedAt,
                    id: transactionTags.id,
                    restoredAt: transactionTags.restoredAt,
                })
                .from(transactionTags)
                .where(and(eq(transactionTags.transactionId, transactionId), eq(transactionTags.tagId, tagId)))
                .limit(1)
        );
        const [revivable] = retired;
        if (revivable) {
            yield* query("write", () =>
                db
                    .update(transactionTags)
                    .set({ deletedAt: null, restoredAt: restoreStamp(revivable, now), updatedAt: now })
                    .where(eq(transactionTags.id, revivable.id))
            );
            continue;
        }
        yield* query("write", () =>
            db.insert(transactionTags).values({
                deletedAt: null,
                id: newId(),
                tagId,
                transactionId,
                updatedAt: now,
            })
        );
    }
});

export const tagsRepo = {
    /**
     * Links go too: a live link to a tombstoned tag reads as tagged and renders nothing, and resurrects on a device
     * that has not pulled the tag's tombstone yet.
     */
    deleteTag: Effect.fn("Tags.deleteTag")(function* deleteTag(db: Database, id: string) {
        const now = new Date();
        yield* transaction(
            db,
            Effect.gen(function* write() {
                yield* query("delete", () =>
                    db
                        .update(transactionTags)
                        .set({ deletedAt: now, updatedAt: now })
                        .where(and(eq(transactionTags.tagId, id), isNull(transactionTags.deletedAt)))
                );
                yield* query("delete", () =>
                    db
                        .update(tags)
                        .set({ ...TOMBSTONED_TAG, deletedAt: now, updatedAt: now })
                        .where(and(eq(tags.id, id), isNull(tags.deletedAt)))
                );
            }),
            failedAt("delete")
        );
    }),

    /** Matches first, so "Work" and "work" never become two tags that look the same. */
    ensureTag: Effect.fn("Tags.ensureTag")(function* ensureTag(db: Database, name: string) {
        const clean = normalizeTagName(name);
        if (clean === "") {
            return null;
        }
        const existing = findTagByName(yield* query("ensure", () => liveTagsQuery(db)), clean);
        if (existing) {
            return existing.id;
        }
        const id = newId();
        yield* query("ensure", () =>
            db.insert(tags).values({
                color: null,
                deletedAt: null,
                id,
                name: clean,
                sortOrder: 0,
                updatedAt: new Date(),
            })
        );
        return id;
    }),

    renameTag: Effect.fn("Tags.renameTag")(function* renameTag(db: Database, id: string, name: string) {
        const clean = normalizeTagName(name);
        if (clean === "") {
            return;
        }
        yield* query("rename", () =>
            db.update(tags).set({ name: clean, updatedAt: new Date() }).where(eq(tags.id, id))
        );
    }),

    /** A detached link is revived, not re-inserted: the pair is unique, and peers already know its identity. */
    setTagsFor: Effect.fn("Tags.setTagsFor")(function* setTagsFor(
        db: Database,
        transactionId: string,
        tagIds: readonly string[]
    ) {
        yield* transaction(db, writeTagsFor(db, transactionId, tagIds), failedAt("write"));
    }),

    writeTagsFor,
};
