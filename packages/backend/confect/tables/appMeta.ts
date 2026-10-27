import { Table } from "@confect/core";
import * as Schema from "effect/Schema";

import { appMetaFields } from "../lib/syncTables";

// `key` is the row identity in place of `localId`, and keys are never deleted, hence no tombstone.
// Only account-scoped keys sync; the "This device" settings and `firstLaunch` stay local by design.
export default Table.make(() =>
    Schema.Struct({
        deviceId: Schema.String,
        key: Schema.String,
        seq: Schema.Number,
        updatedAt: Schema.Number,
        userId: Schema.String,
        ...appMetaFields,
    })
)
    .index("by_user_and_seq", ["userId", "seq"])
    .index("by_user_and_key", ["userId", "key"]);
