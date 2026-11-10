import { serializeReceipt } from "@/domain/receipt-items";
import type { ResolvedReceipt } from "@/domain/receipt-scan";
import type { ResolvedVoiceEntry } from "@/domain/voice-entry";
import type { EntryDraft } from "@/state/entry-commit";

export function voiceEntryDraft(spoken: ResolvedVoiceEntry, categoryId: string): EntryDraft {
    const { recurrence } = spoken;
    return {
        accountId: spoken.accountId,
        amount: spoken.amount,
        categoryId,
        currency: spoken.currency,
        date: spoken.date,
        details: spoken.details,
        income: spoken.income,
        merchant: spoken.merchant,
        schedule:
            recurrence === null
                ? null
                : { coefficient: recurrence.coefficient, endDate: null, leadDays: null, type: recurrence.type },
    };
}

export function scanEntryDraft(receipt: ResolvedReceipt, categoryId: string): EntryDraft {
    return {
        accountId: receipt.accountId,
        amount: receipt.amount,
        categoryId,
        currency: receipt.currency,
        date: receipt.date,
        details: null,
        income: receipt.income,
        merchant: receipt.merchant,
        receipt: serializeReceipt(receipt),
        schedule: null,
    };
}
