import type { PolicyNotice } from "@outlayr/backend/confect/legal";

type LegalDocument = PolicyNotice["document"];

export interface PendingDocument {
    document: LegalDocument;
    effectiveAtMs: number;
    notices: readonly PolicyNotice[];
}

const DOCUMENTS: readonly LegalDocument[] = ["privacy", "terms"];

export function pendingDocuments(
    notices: readonly PolicyNotice[],
    seenAt: Readonly<Record<LegalDocument, number>>
): PendingDocument[] {
    return DOCUMENTS.flatMap((document) => {
        const pending = notices
            .filter((notice) => notice.document === document && notice.effectiveAtMs > seenAt[document])
            .sort((a, b) => a.effectiveAtMs - b.effectiveAtMs);
        const newest = pending.at(-1);
        return newest ? [{ document, effectiveAtMs: newest.effectiveAtMs, notices: pending }] : [];
    });
}
