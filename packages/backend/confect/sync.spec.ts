import { FunctionSpec, GroupSpec } from "@confect/core";
import * as Schema from "effect/Schema";

import { PulledRow, PushRow, SyncedTableName } from "./sync";

export default GroupSpec.make()
    .addFunction(
        FunctionSpec.publicMutation({
            name: "push",
            args: () => ({ deviceId: Schema.String, rows: Schema.Array(PushRow) }),
            returns: () => Schema.Struct({ accepted: Schema.Number, nextSeq: Schema.Number, skipped: Schema.Number }),
        })
    )
    .addFunction(
        FunctionSpec.publicQuery({
            name: "pullSince",
            args: () => ({
                cursor: Schema.Number,
                limit: Schema.optional(Schema.Number),
                tables: Schema.optional(Schema.Array(SyncedTableName)),
            }),
            returns: () =>
                Schema.Struct({ cursor: Schema.Number, hasMore: Schema.Boolean, rows: Schema.Array(PulledRow) }),
        })
    )
    .addFunction(
        FunctionSpec.publicQuery({
            name: "currentSeq",
            args: () => ({}),
            returns: () => Schema.Number,
        })
    );
