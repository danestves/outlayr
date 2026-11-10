import type { CardFeeInput } from "@outlayr/money/card-fee";

import type { Database } from "@/db/client";
import { posthog } from "@/lib/posthog";
import type { AutologSource } from "@/lib/queue-file";

import { suggestedCardFee } from "./card-fees-core";

interface FiledPurchase {
    account: { currency: string; id: string } | null;
    categoryId: string | null;
    currency: string | null;
    income: boolean;
    merchant: string;
}

export function usualCardFee(db: Database, entry: FiledPurchase): CardFeeInput | null {
    return entry.income ? null : suggestedCardFee(db, entry);
}

interface SavedEntry {
    income: boolean;
    mode: "create" | "edit";
    inApp?: { has_split: boolean; is_subscription: boolean };
    source: AutologSource | "form" | "onboarding" | "scan" | "voice";
}

export function captureEntrySaved(saved: SavedEntry): void {
    posthog?.capture("transaction_saved", {
        ...saved.inApp,
        mode: saved.mode,
        source: saved.source,
        transaction_type: saved.income ? "income" : "expense",
    });
}
