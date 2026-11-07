import type { PolicyNotice } from "@outlayr/backend/confect/legal";

const RETIRED_NOTICE_MS = Date.UTC(2026, 10, 16);
const LAST_NOTICE_BEFORE_RETIRED_MS = Date.UTC(2026, 10, 2);

function seenThrough(notices: readonly PolicyNotice[], document: PolicyNotice["document"], seenMs: number): number {
    const retired =
        seenMs === RETIRED_NOTICE_MS &&
        !notices.some((notice) => notice.document === document && notice.effectiveAtMs === seenMs);
    return retired ? LAST_NOTICE_BEFORE_RETIRED_MS : seenMs;
}

export function pendingNotices(
    notices: readonly PolicyNotice[],
    seenAt: Readonly<Record<PolicyNotice["document"], number>>
): PolicyNotice[] {
    const unseen = notices.filter(
        (notice) => notice.effectiveAtMs > seenThrough(notices, notice.document, seenAt[notice.document])
    );
    const oldestMs = Math.min(...unseen.map((notice) => notice.effectiveAtMs));
    return unseen
        .filter((notice) => notice.effectiveAtMs === oldestMs)
        .sort((a, b) => a.document.localeCompare(b.document));
}
