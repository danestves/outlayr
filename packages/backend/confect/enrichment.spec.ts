import { FunctionSpec, GroupSpec } from "@confect/core";
import * as Schema from "effect/Schema";

/** A privacy boundary: only the merchant name and the user's category names leave the device. */
export const suggestArgs = {
    /** `AI_CONSENT_VERSION`; anything else reads the shared merchant list but never reaches a provider. */
    aiConsent: Schema.optional(Schema.Number),
    background: Schema.optional(Schema.Boolean),
    categoryTree: Schema.Array(Schema.Struct({ children: Schema.Array(Schema.String), name: Schema.String })),
    /** A code, never an amount: it survives travel where `regionCode` would mislead. */
    currency: Schema.optional(Schema.String),
    /** Dual-authority: a forged `true` needs the synced `appMeta` row to agree; `false` always blocks. */
    groundedLookup: Schema.Boolean,
    income: Schema.Boolean,
    knowledgeOnly: Schema.optional(Schema.Boolean),
    locale: Schema.optional(Schema.String),
    name: Schema.String,
    /** The device region, which `locale` cannot stand in for. */
    regionCode: Schema.optional(Schema.String),
};

export const Suggestion = Schema.Struct({
    categoryName: Schema.NullOr(Schema.String),
    domain: Schema.NullOr(Schema.String),
    emoji: Schema.NullOr(Schema.String),
    /** The client must not cache this as a final null result. */
    grounding: Schema.Boolean,
    isNewCategory: Schema.Boolean,
    merchantName: Schema.NullOr(Schema.String),
    /** Set only when the suggestion belongs under an existing category. */
    parentCategoryName: Schema.NullOr(Schema.String),
    tags: Schema.Array(Schema.String),
});

export type Suggestion = typeof Suggestion.Type;

export default GroupSpec.make()
    .addFunction(
        FunctionSpec.internalQuery({ args: () => ({}), name: "groundedConsent", returns: () => Schema.Boolean })
    )
    .addFunction(FunctionSpec.publicAction({ args: () => suggestArgs, name: "suggest", returns: () => Suggestion }));
