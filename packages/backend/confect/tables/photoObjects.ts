import { Table } from "@confect/core";
import * as Schema from "effect/Schema";

import { Id } from "../_generated/id";

// Legacy only: rows written before the storage component. Component objects are addressed by key, so nothing here
// is written any more, but a read or delete still resolves through these rows. No `userId`: `ownsPhotoKey` checks
// the owner the key carries.
export default Table.make(() =>
    Schema.Struct({
        key: Schema.String,
        storageId: Id("_storage"),
    })
)
    .index("by_key", ["key"])
    .index("by_storageId", ["storageId"]);
