import type { InstallmentDraft } from "@outlayr/money/installment-draft";

import type { TranslateFn } from "@/i18n/context";

const PERCENT = 100;

export function termsSubtitle(t: TranslateFn, draft: Pick<InstallmentDraft, "count" | "upfront">): string {
    if ("share" in draft.upfront && draft.upfront.share > 0) {
        return t("installments.new.terms.withUpfront", {
            count: draft.count,
            share: Math.round(draft.upfront.share * PERCENT),
        });
    }
    return t("installments.new.terms.plain", { count: draft.count });
}
