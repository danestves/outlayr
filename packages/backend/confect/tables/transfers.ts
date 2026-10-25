import { Table } from "@confect/core";
import * as Schema from "effect/Schema";

import { replicated, transferFields } from "../lib/syncTables";

export default Table.make(() => Schema.Struct({ ...replicated, ...transferFields }))
    .index("by_user_and_seq", ["userId", "seq"])
    .index("by_user_and_localId", ["userId", "localId"])
    .index("by_user_and_deletedAt_and_date", ["userId", "deletedAt", "date"]);
