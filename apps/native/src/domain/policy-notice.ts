import type { PolicyNotice } from "@outlayr/backend/confect/legal";

export function pendingNotice(
    notices: readonly PolicyNotice[],
    seenAt: Readonly<Record<PolicyNotice["document"], number>>
): PolicyNotice | null {
    return notices.reduce<PolicyNotice | null>(
        (oldest, notice) =>
            notice.effectiveAtMs > seenAt[notice.document] &&
            (oldest === null || notice.effectiveAtMs < oldest.effectiveAtMs)
                ? notice
                : oldest,
        null
    );
}
