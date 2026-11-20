import { parseReceipt } from "@outlayr/money/receipt";
import type { StoredReceipt } from "@outlayr/money/receipt";

import type { Attachment, RecordBooks, SplitPart } from "./ledger-db";

export const MAX_FILES = 10;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const FILE_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;

const PDF = /\.pdf$/iu;

export type FileKind = "image" | "pdf";

export interface EntryFile {
    attachment: Attachment;
    kind: FileKind;
    /** Null while the device that attached it has not uploaded the bytes yet. */
    key: string | null;
    receipt: StoredReceipt | null;
}

const bySortOrder = (a: { sortOrder: number }, b: { sortOrder: number }) => a.sortOrder - b.sortOrder;

const live = <Row extends { deletedAt: number | null; sortOrder: number; transactionId: string }>(
    rows: readonly Row[],
    entryId: string
) => rows.filter((row) => row.transactionId === entryId && row.deletedAt === null).toSorted(bySortOrder);

export const liveSplits = (books: RecordBooks, entryId: string): SplitPart[] => live(books.splits, entryId);

export const liveAttachments = (books: RecordBooks, entryId: string): Attachment[] => live(books.attachments, entryId);

// The phone's scan keeps its photo as the entry's first image, so that file is the receipt the lines came from.
export function entryFiles(books: RecordBooks, entryId: string, receiptText: string | null | undefined): EntryFile[] {
    const receipt = parseReceipt(receiptText);
    const files = liveAttachments(books, entryId).map((attachment): EntryFile => ({
        attachment,
        key: attachment.imageKey,
        kind: PDF.test(attachment.imageKey ?? attachment.name ?? "") ? "pdf" : "image",
        receipt: null,
    }));
    const scanned = receipt === null ? -1 : files.findIndex((file) => file.kind === "image");
    return files.map((file, index) => (index === scanned ? { ...file, receipt } : file));
}
