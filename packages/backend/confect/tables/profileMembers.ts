import { Table } from "@confect/core";
import * as Schema from "effect/Schema";

import { SharedProfileLook } from "../lib/syncTables";

// A row outlives the membership (`leftAt`) so a removed member's device is refused instead of syncing into an
// empty ledger of its own under the same profile id.
export default Table.make(() =>
    Schema.Struct({
        joinedAt: Schema.Number,
        leftAt: Schema.NullOr(Schema.Number),
        look: SharedProfileLook,
        memberId: Schema.String,
        ownerId: Schema.String,
        profileId: Schema.String,
    })
)
    .index("by_profileId_and_memberId", ["profileId", "memberId"])
    .index("by_profileId_and_leftAt", ["profileId", "leftAt"])
    .index("by_memberId_and_leftAt", ["memberId", "leftAt"])
    .index("by_ownerId_and_leftAt", ["ownerId", "leftAt"]);
