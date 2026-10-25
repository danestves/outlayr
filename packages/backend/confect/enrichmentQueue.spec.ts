import { FunctionSpec, GroupSpec } from "@confect/core";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import { Id } from "./_generated/id";
import enrichmentJobs from "./_generated/tables/enrichmentJobs";
import type { settled, work } from "./enrichmentQueue";
import { EnrichmentResult } from "./lib/enrichmentResult";

export default GroupSpec.make()
    .addFunction(
        FunctionSpec.publicMutation({
            args: () => ({
                aiConsent: Schema.optional(Schema.Number),
                groundedLookup: Schema.Boolean,
                ...Struct.pick(enrichmentJobs.Fields.fields, [
                    "categoryTree",
                    "currency",
                    "income",
                    "localId",
                    "locale",
                    "name",
                    "regionCode",
                ]),
            }),
            name: "enqueue",
            returns: () => Schema.Boolean,
        })
    )
    .addFunction(
        FunctionSpec.internalQuery({
            args: () => ({ jobId: Id("enrichmentJobs") }),
            name: "job",
            returns: () => Schema.NullOr(enrichmentJobs.Doc),
        })
    )
    .addFunction(FunctionSpec.convexInternalAction<typeof work>()("work"))
    .addFunction(
        FunctionSpec.internalMutation({
            args: () => ({ jobId: Id("enrichmentJobs"), result: Schema.NullOr(EnrichmentResult) }),
            name: "finish",
            returns: () => Schema.Null,
        })
    )
    .addFunction(FunctionSpec.convexInternalMutation<typeof settled>()("settled"))
    .addFunction(
        FunctionSpec.publicQuery({
            args: () => ({}),
            name: "results",
            returns: () =>
                Schema.Array(
                    Schema.Struct({
                        ...Struct.pick(enrichmentJobs.Fields.fields, ["localId", "name"]),
                        result: Schema.NullOr(EnrichmentResult),
                    })
                ),
        })
    )
    .addFunction(
        FunctionSpec.publicMutation({
            args: () => ({ localIds: Schema.Array(Schema.String) }),
            name: "ack",
            returns: () => Schema.Null,
        })
    );
