import type { PolicyNotice } from "@outlayr/backend/confect/legal";

export function pendingNotices(
    notices: readonly PolicyNotice[],
    seenAt: Readonly<Record<PolicyNotice["document"], number>>
): PolicyNotice[] {
    const unseen = notices.filter((notice) => notice.effectiveAtMs > seenAt[notice.document]);
    const oldestMs = Math.min(...unseen.map((notice) => notice.effectiveAtMs));
    return unseen
        .filter((notice) => notice.effectiveAtMs === oldestMs)
        .sort((a, b) => a.document.localeCompare(b.document));
}
