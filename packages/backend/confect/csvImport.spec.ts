import { FunctionSpec, GroupSpec } from "@confect/core";
import * as Schema from "effect/Schema";

/** A privacy boundary asserted by test: no raw file, row set, amount, date or per-row data. */
export const csvImportArgs = {
    aiConsent: Schema.optional(Schema.Number),
    categoryTree: Schema.Array(Schema.Struct({ children: Schema.Array(Schema.String), name: Schema.String })),
    /** Dual-authority consent gate: see `enrichment.spec.ts:suggestArgs`. */
    groundedLookup: Schema.optional(Schema.Boolean),
    labels: Schema.Array(Schema.String),
    regionCode: Schema.optional(Schema.String),
};

export const LabelSuggestion = Schema.Struct({
    categoryName: Schema.String,
    domain: Schema.NullOr(Schema.String),
    label: Schema.String,
});

export type LabelSuggestion = typeof LabelSuggestion.Type;

export const CsvImportStatus = Schema.Literals([
    "ok",
    "unauthenticated",
    "notConfigured",
    "rateLimited",
    "notEntitled",
    "invalid",
    "providerError",
    "invalidResponse",
]);

export type CsvImportStatus = typeof CsvImportStatus.Type;

export const CsvImportResult = Schema.Struct({
    degraded: Schema.optional(Schema.Boolean),
    status: CsvImportStatus,
    suggestions: Schema.NullOr(Schema.Array(LabelSuggestion)),
});

export type CsvImportResult = typeof CsvImportResult.Type;

export default GroupSpec.make().addFunction(
    FunctionSpec.publicAction({ args: () => csvImportArgs, name: "csvImport", returns: () => CsvImportResult })
);
