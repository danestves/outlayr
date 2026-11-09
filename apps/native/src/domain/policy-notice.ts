import type { PolicyNotice } from "@outlayr/backend/confect/legal";

const RETIRED_NOTICE_MS = Date.UTC(2026, 10, 16);
const LAST_NOTICE_BEFORE_RETIRED_MS = Date.UTC(2026, 10, 2);

function seenThrough(notices: readonly PolicyNotice[], document: PolicyNotice["document"], seenMs: number): number {
    const retired =
        seenMs === RETIRED_NOTICE_MS &&
        !notices.some((notice) => notice.document === document && notice.effectiveAtMs === seenMs);
    return retired ? LAST_NOTICE_BEFORE_RETIRED_MS : seenMs;
}

type Changes = PolicyNotice["changes"]["en"];

const mergeChanges = (newer: Changes, older: Changes): Changes => [
    ...newer,
    ...older.filter(({ label }) => !newer.some((change) => change.label === label)),
];

export function pendingNotices(
    notices: readonly PolicyNotice[],
    seenAt: Readonly<Record<PolicyNotice["document"], number>>
): PolicyNotice[] {
    const unseen = notices
        .filter((notice) => notice.effectiveAtMs > seenThrough(notices, notice.document, seenAt[notice.document]))
        .sort((a, b) => b.effectiveAtMs - a.effectiveAtMs);
    const merged = new Map<PolicyNotice["document"], PolicyNotice>();
    for (const notice of unseen) {
        const newer = merged.get(notice.document);
        merged.set(
            notice.document,
            newer === undefined
                ? notice
                : {
                      ...newer,
                      changes: {
                          en: mergeChanges(newer.changes.en, notice.changes.en),
                          es: mergeChanges(newer.changes.es, notice.changes.es),
                          fr: mergeChanges(newer.changes.fr, notice.changes.fr),
                          pt: mergeChanges(newer.changes.pt, notice.changes.pt),
                      },
                  }
        );
    }
    return [...merged.values()].sort((a, b) => a.document.localeCompare(b.document));
}
