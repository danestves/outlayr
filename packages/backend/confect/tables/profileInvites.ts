import { Table } from "@confect/core";
import * as Schema from "effect/Schema";

import { SharedProfileLook } from "../lib/syncTables";

export default Table.make(() =>
    Schema.Struct({
        claimedAt: Schema.NullOr(Schema.Number),
        code: Schema.String,
        createdAt: Schema.Number,
        expiresAt: Schema.Number,
        look: SharedProfileLook,
        ownerId: Schema.String,
        profileId: Schema.String,
    })
)
    .index("by_code", ["code"])
    .index("by_profileId_and_claimedAt", ["profileId", "claimedAt"])
    .index("by_ownerId", ["ownerId"]);
