import { Table } from "@confect/core";
import * as Schema from "effect/Schema";

import { budgetFields, replicated } from "../lib/syncTables";

// SQLite keeps `categoryId` unique but Convex cannot: two offline devices can each create one; the client merges.
export default Table.make(() => Schema.Struct({ ...replicated, ...budgetFields }))
    .index("by_user_and_seq", ["userId", "seq"])
    .index("by_user_and_localId", ["userId", "localId"]);
