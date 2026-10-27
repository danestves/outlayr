import { Table } from "@confect/core";
import * as Schema from "effect/Schema";

import { Id } from "../_generated/id";

// Only written without R2 credentials, because Convex storage allocates its own id. Reads route per key, so
// pre-R2 photos keep resolving. No `userId`: `ownsPhotoKey` checks the owner the key carries.
export default Table.make(() =>
    Schema.Struct({
        key: Schema.String,
        storageId: Id("_storage"),
    })
)
    .index("by_key", ["key"])
    .index("by_storageId", ["storageId"]);
