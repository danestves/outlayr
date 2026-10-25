import { and, asc, eq, inArray, isNull } from "drizzle-orm";

import type { Database } from "@/db/client";
import { transactionAttachments } from "@/db/schema";
import { newId } from "@/domain/ids";

import { photoExtension, photoFileName } from "./photo-store-core";

export const MAX_ATTACHMENTS = 10;

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export interface AttachmentDraft {
    id: string | null;
    imageKey: string | null;
    imageUri: string | null;
    name: string | null;
}

export type AttachmentKind = "image" | "pdf";

export function attachmentKind({ imageKey, imageUri }: Pick<AttachmentDraft, "imageKey" | "imageUri">): AttachmentKind {
    const source = imageUri ?? imageKey ?? "";
    return photoExtension(photoFileName(source)) === ".pdf" ? "pdf" : "image";
}

export function attachmentsForQuery(db: Database, transactionId: string) {
    return db
        .select({
            id: transactionAttachments.id,
            imageKey: transactionAttachments.imageKey,
            imageUri: transactionAttachments.imageUri,
            name: transactionAttachments.name,
        })
        .from(transactionAttachments)
        .where(and(eq(transactionAttachments.transactionId, transactionId), isNull(transactionAttachments.deletedAt)))
        .orderBy(asc(transactionAttachments.sortOrder));
}

export const attachmentsRepo = {
    async writeFor(
        db: Database,
        transactionId: string,
        drafts: readonly AttachmentDraft[],
        now: Date = new Date()
    ): Promise<void> {
        const kept = new Set(drafts.flatMap((draft) => (draft.id === null ? [] : [draft.id])));
        const live = await db
            .select({ id: transactionAttachments.id })
            .from(transactionAttachments)
            .where(
                and(eq(transactionAttachments.transactionId, transactionId), isNull(transactionAttachments.deletedAt))
            );
        const removed = live.map((row) => row.id).filter((id) => !kept.has(id));
        if (removed.length > 0) {
            await db
                .update(transactionAttachments)
                .set({ deletedAt: now, updatedAt: now })
                .where(inArray(transactionAttachments.id, removed));
        }
        const added = drafts.flatMap((draft, sortOrder) =>
            draft.id === null && draft.imageUri !== null
                ? [
                      {
                          deletedAt: null,
                          id: newId(),
                          imageKey: null,
                          imageUri: draft.imageUri,
                          name: draft.name,
                          sortOrder,
                          transactionId,
                          updatedAt: now,
                      },
                  ]
                : []
        );
        if (added.length > 0) {
            await db.insert(transactionAttachments).values(added);
        }
    },
};
