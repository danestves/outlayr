import { FunctionSpec, GroupSpec } from "@confect/core";
import * as Schema from "effect/Schema";

import { Id } from "./_generated/id";
import { LabelSuggestion } from "./csvImport.spec";

export const PDF_CONTENT_TYPE = "application/pdf";

// Measured on a local Convex backend: a 10 MB file and 600 pages parse, 2000 pages exhaust the 64 MB isolate.
export const MAX_PDF_BYTES = 10 * 1024 * 1024;

export const UploadStatus = Schema.Literals(["ok", "unauthenticated", "notEntitled", "rateLimited"]);

export const UploadTicket = Schema.Struct({
    status: UploadStatus,
    url: Schema.NullOr(Schema.String),
});

export const pdfImportArgs = {
    aiConsent: Schema.optional(Schema.Number),
    categoryTree: Schema.Array(Schema.Struct({ children: Schema.Array(Schema.String), name: Schema.String })),
    /** Dual-authority consent gate: see `enrichment.spec.ts:suggestArgs`. */
    groundedLookup: Schema.optional(Schema.Boolean),
    regionCode: Schema.optional(Schema.String),
    shareAnalytics: Schema.optional(Schema.Boolean),
    storageId: Id("_storage"),
    /** `YYYY-MM-DD` in the device's local calendar, so a statement's yearless dates resolve. */
    today: Schema.String,
};

export const StatementRow = Schema.Struct({
    /** Negative is money out. */
    amount: Schema.Number,
    /** ISO 4217, upper case. Null when the statement prints none. */
    currency: Schema.NullOr(Schema.String),
    /** `YYYY-MM-DD`. */
    date: Schema.String,
    label: Schema.String,
});

export type StatementRow = typeof StatementRow.Type;

export const PdfImportStatus = Schema.Literals([
    "ok",
    "unauthenticated",
    "notConfigured",
    "notEntitled",
    "rateLimited",
    "invalid",
    "invalidResponse",
    "providerError",
    "extractionFailed",
]);

export type PdfImportStatus = typeof PdfImportStatus.Type;

export const PdfImportResult = Schema.Struct({
    /** Some labels went unclassified: the client asks `csvImport` about the rest. */
    degraded: Schema.optional(Schema.Boolean),
    rows: Schema.NullOr(Schema.Array(StatementRow)),
    status: PdfImportStatus,
    suggestions: Schema.NullOr(Schema.Array(LabelSuggestion)),
});

export type PdfImportResult = typeof PdfImportResult.Type;

export default GroupSpec.make()
    .addFunction(FunctionSpec.publicMutation({ args: () => ({}), name: "requestUpload", returns: () => UploadTicket }))
    .addFunction(
        FunctionSpec.internalQuery({
            args: () => ({ storageId: Id("_storage") }),
            name: "uploadContentType",
            returns: () => Schema.NullOr(Schema.String),
        })
    )
    .addFunction(
        FunctionSpec.internalMutation({
            args: () => ({ from: Schema.Number, to: Schema.Number }),
            name: "sweepUploads",
            returns: () => Schema.Null,
        })
    )
    .addFunction(
        FunctionSpec.publicAction({ args: () => pdfImportArgs, name: "extract", returns: () => PdfImportResult })
    );
