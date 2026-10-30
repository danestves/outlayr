import * as Schema from "effect/Schema";

const Changes = Schema.Array(Schema.Struct({ detail: Schema.optional(Schema.String), label: Schema.String }));

export const PolicyNotice = Schema.Struct({
    changes: Schema.Struct({ en: Changes, es: Changes, fr: Changes, pt: Changes }),
    document: Schema.Literals(["privacy", "terms"]),
    effectiveAtMs: Schema.Number,
});

export type PolicyNotice = typeof PolicyNotice.Type;

export function pendingNotice(notices: readonly PolicyNotice[], seenAt: number): PolicyNotice | null {
    return notices.reduce<PolicyNotice | null>(
        (oldest, notice) =>
            notice.effectiveAtMs > seenAt && (oldest === null || notice.effectiveAtMs < oldest.effectiveAtMs)
                ? notice
                : oldest,
        null
    );
}
