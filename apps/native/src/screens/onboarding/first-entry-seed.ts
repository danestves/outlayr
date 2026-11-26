import type { Href } from "expo-router";

import type { ResolvedReceipt } from "@/domain/receipt-scan";

export type FirstEntrySeed = Partial<Record<"amount" | "categoryId" | "merchant", string>>;

export function firstEntryHref(draft: ResolvedReceipt, currency: string): Href {
    const params: FirstEntrySeed = {};
    if (draft.income) {
        return { params, pathname: "/onboarding/first-entry" };
    }
    if (draft.currency === currency && !draft.currencyUnresolved && draft.amount > 0) {
        params.amount = String(draft.amount);
    }
    if (draft.categoryId !== null) {
        params.categoryId = draft.categoryId;
    }
    if (draft.merchant !== "") {
        params.merchant = draft.merchant;
    }
    return { params: { ...params }, pathname: "/onboarding/first-entry" };
}
