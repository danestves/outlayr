import * as Schema from "effect/Schema";

export const RecurrenceUnit = Schema.Literals(["day", "week", "month", "year"]);

export type RecurrenceUnit = typeof RecurrenceUnit.Type;

export const VoiceRecurrence = Schema.Struct({ every: Schema.Number, unit: RecurrenceUnit });

export type VoiceRecurrence = typeof VoiceRecurrence.Type;

const draftBase = {
    amount: Schema.Number,
    currency: Schema.NullOr(Schema.String),
    date: Schema.String,
    details: Schema.NullOr(Schema.String),
};

export const VoiceEntryDraft = Schema.Struct({
    ...draftBase,
    accountName: Schema.NullOr(Schema.String),
    categoryName: Schema.NullOr(Schema.String),
    domain: Schema.NullOr(Schema.String),
    income: Schema.Boolean,
    kind: Schema.Literal("entry"),
    merchant: Schema.String,
    parentCategoryName: Schema.optional(Schema.NullOr(Schema.String)),
    recurrence: Schema.NullOr(VoiceRecurrence),
});

export type VoiceEntryDraft = typeof VoiceEntryDraft.Type;

export const VoiceTransferDraft = Schema.Struct({
    ...draftBase,
    fromAccountName: Schema.NullOr(Schema.String),
    kind: Schema.Literal("transfer"),
    toAccountName: Schema.NullOr(Schema.String),
});

export type VoiceTransferDraft = typeof VoiceTransferDraft.Type;

export const VoiceDraft = Schema.Union([VoiceEntryDraft, VoiceTransferDraft]);

export type VoiceDraft = typeof VoiceDraft.Type;

export const QUOTE_FIELDS = ["amount", "merchant", "category", "account", "date", "schedule"] as const;

export const VoiceQuote = Schema.Struct({ field: Schema.Literals(QUOTE_FIELDS), text: Schema.String });

export type VoiceQuote = typeof VoiceQuote.Type;

export const ProposedDraft = Schema.Struct({
    draft: Schema.Union([VoiceEntryDraft, VoiceTransferDraft, Schema.Null]),
    quotes: Schema.optional(Schema.Array(VoiceQuote)),
});

export type ProposedDraft = typeof ProposedDraft.Type;
