import { and, eq, inArray, isNull } from "drizzle-orm";

import type { Database } from "@/db/client";
import { tags, transactionTags } from "@/db/schema";
import { withTransaction } from "@/db/transaction";
import { newId } from "@/domain/ids";
import { findTagByName, normalizeTagName, tagLinkDiff } from "@/domain/tags";

import { restoreStamp } from "./sync-engine-core";

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

export const tagsRepo = {
    /**
     * Links go too: a live link to a tombstoned tag reads as tagged and renders nothing, and resurrects on a device
     * that has not pulled the tag's tombstone yet.
     */
    async deleteTag(db: Database, id: string): Promise<void> {
        const now = new Date();
        await withTransaction(db, async () => {
            await db
                .update(transactionTags)
                .set({ deletedAt: now, updatedAt: now })
                .where(and(eq(transactionTags.tagId, id), isNull(transactionTags.deletedAt)));
            await db
                .update(tags)
                .set({ ...TOMBSTONED_TAG, deletedAt: now, updatedAt: now })
                .where(and(eq(tags.id, id), isNull(tags.deletedAt)));
        });
    },
    /** Matches first, so "Work" and "work" never become two tags that look the same. */
    async ensureTag(db: Database, name: string): Promise<string | null> {
        const clean = normalizeTagName(name);
        if (clean === "") {
            return null;
        }
        const existing = findTagByName(await liveTagsQuery(db), clean);
        if (existing) {
            return existing.id;
        }
        const id = newId();
        await db.insert(tags).values({
            color: null,
            deletedAt: null,
            id,
            name: clean,
            sortOrder: 0,
            updatedAt: new Date(),
        });
        return id;
    },

    async renameTag(db: Database, id: string, name: string): Promise<void> {
        const clean = normalizeTagName(name);
        if (clean === "") {
            return;
        }
        await db.update(tags).set({ name: clean, updatedAt: new Date() }).where(eq(tags.id, id));
    },

    /** A detached link is revived, not re-inserted: the pair is unique, and peers already know its identity. */
    async setTagsFor(db: Database, transactionId: string, tagIds: readonly string[]): Promise<void> {
        await withTransaction(db, () => tagsRepo.writeTagsFor(db, transactionId, tagIds));
    },

    async writeTagsFor(db: Database, transactionId: string, tagIds: readonly string[]): Promise<void> {
        const now = new Date();
        const rows = await tagIdsForQuery(db, transactionId);
        const current = rows.map((row) => row.tagId);
        const { attach, detach } = tagLinkDiff(current, tagIds);
        if (detach.length > 0) {
            await db
                .update(transactionTags)
                .set({ deletedAt: now, updatedAt: now })
                .where(
                    and(eq(transactionTags.transactionId, transactionId), inArray(transactionTags.tagId, [...detach]))
                );
        }
        /* oxlint-disable no-await-in-loop -- expo-sqlite's withTransactionAsync shares one connection, so statements issued concurrently inside the callback interleave with the transaction boundary */
        for (const tagId of attach) {
            const retired = await db
                .select({
                    deletedAt: transactionTags.deletedAt,
                    id: transactionTags.id,
                    restoredAt: transactionTags.restoredAt,
                })
                .from(transactionTags)
                .where(and(eq(transactionTags.transactionId, transactionId), eq(transactionTags.tagId, tagId)))
                .limit(1);
            if (retired[0]) {
                await db
                    .update(transactionTags)
                    .set({ deletedAt: null, restoredAt: restoreStamp(retired[0], now), updatedAt: now })
                    .where(eq(transactionTags.id, retired[0].id));
                continue;
            }
            await db.insert(transactionTags).values({
                deletedAt: null,
                id: newId(),
                tagId,
                transactionId,
                updatedAt: now,
            });
        }
        /* oxlint-enable no-await-in-loop */
    },
};
