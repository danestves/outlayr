import { Table } from "@confect/core";
import * as Schema from "effect/Schema";

import { replicated, transactionSplitFields } from "../lib/syncTables";

// No rows means the entry is attributed wholly to its own `categoryId`.
export default Table.make(() => Schema.Struct({ ...replicated, ...transactionSplitFields }))
    .index("by_user_and_seq", ["userId", "seq"])
    .index("by_user_and_localId", ["userId", "localId"]);
