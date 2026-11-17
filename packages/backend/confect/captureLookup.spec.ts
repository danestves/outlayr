import { FunctionSpec, GroupSpec } from "@confect/core";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { Id } from "./_generated/id";
import enrichmentJobs from "./_generated/tables/enrichmentJobs";
import { EnrichmentResult } from "./lib/enrichmentResult";

export const MIN_KEY_LENGTH = 32;
export const MAX_KEY_LENGTH = 128;
export const MAX_ID_LENGTH = 64;

export const CaptureRequest = Schema.Struct({
    aiConsent: Schema.optional(Schema.Number),
    captureId: Schema.String,
    groundedLookup: Schema.Boolean,
    ...Struct.pick(enrichmentJobs.Fields.fields, [
        "categoryTree",
        "currency",
        "income",
        "locale",
        "name",
        "regionCode",
        "shareAnalytics",
    ]),
});

export const Opened = Schema.Union([
    Schema.Struct({ kind: Schema.Literal("unknownKey") }),
    Schema.Struct({ kind: Schema.Literal("refused") }),
    Schema.Struct({ job: enrichmentJobs.Doc, kind: Schema.Literal("open") }),
]);

export default GroupSpec.make()
    .addFunction(
        FunctionSpec.publicMutation({
            args: () => ({ deviceId: Schema.String, key: Schema.String }),
            name: "register",
            returns: () => Schema.Boolean,
        })
    )
    .addFunction(
        FunctionSpec.publicMutation({
            args: () => ({ deviceId: Schema.String }),
            name: "revoke",
            returns: () => Schema.Null,
        })
    )
    .addFunction(
        FunctionSpec.internalMutation({
            args: () => ({ ...CaptureRequest.fields, keyHash: Schema.String }),
            name: "open",
            returns: () => Opened,
        })
    )
    .addFunction(
        FunctionSpec.internalMutation({
            args: () => ({
                final: Schema.Boolean,
                jobId: Id("enrichmentJobs"),
                result: Schema.NullOr(EnrichmentResult),
            }),
            name: "settle",
            returns: () => Schema.Null,
        })
    );
