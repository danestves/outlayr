import { FunctionSpec, GroupSpec } from "@confect/core";
import * as Schema from "effect/Schema";

import { OpeningCell, ProfileId, PulledRow, PushRow, SyncedTableName } from "./sync";

export default GroupSpec.make()
    .addFunction(
        FunctionSpec.publicMutation({
            name: "push",
            args: () => ({
                deviceId: Schema.String,
                profileId: Schema.optional(ProfileId),
                rows: Schema.Array(PushRow),
            }),
            returns: () => Schema.Struct({ accepted: Schema.Number, nextSeq: Schema.Number, skipped: Schema.Number }),
        })
    )
    .addFunction(
        FunctionSpec.publicQuery({
            name: "pullSince",
            args: () => ({
                cursor: Schema.Number,
                limit: Schema.optional(Schema.Number),
                profileId: Schema.optional(ProfileId),
                tables: Schema.optional(Schema.Array(SyncedTableName)),
            }),
            returns: () =>
                Schema.Struct({ cursor: Schema.Number, hasMore: Schema.Boolean, rows: Schema.Array(PulledRow) }),
        })
    )
    .addFunction(
        FunctionSpec.publicQuery({
            name: "pullRecent",
            args: () => ({
                profileId: Schema.optional(ProfileId),
                since: Schema.Number,
                tables: Schema.Array(SyncedTableName),
            }),
            returns: () =>
                Schema.NullOr(
                    Schema.Struct({
                        opening: Schema.Array(OpeningCell),
                        rows: Schema.Array(PulledRow),
                        since: Schema.Number,
                    })
                ),
        })
    )
    .addFunction(
        FunctionSpec.publicQuery({
            name: "currentSeq",
            args: () => ({ profileId: Schema.optional(ProfileId) }),
            returns: () => Schema.Number,
        })
    );
