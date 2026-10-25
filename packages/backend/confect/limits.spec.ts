import { FunctionSpec, GroupSpec } from "@confect/core";
import * as Schema from "effect/Schema";

const Bucket = Schema.Struct({
    capacity: Schema.Number,
    kind: Schema.Literals(["token bucket", "fixed window"]),
    period: Schema.Number,
    rate: Schema.Number,
    ts: Schema.Number,
    value: Schema.Number,
});

export default GroupSpec.make().addFunction(
    FunctionSpec.publicQuery({
        name: "mine",
        args: () => ({}),
        returns: () =>
            Schema.Union([
                Schema.Null,
                Schema.Struct({
                    captures: Bucket,
                    csvImport: Schema.NullOr(Bucket),
                    enrichment: Bucket,
                    pro: Schema.Boolean,
                    receiptScan: Bucket,
                    voiceEntry: Bucket,
                }),
            ]),
    })
);
