import { Table } from "@confect/core";
import * as Schema from "effect/Schema";

import { mainBudgetFields, replicated } from "../lib/syncTables";

// Singleton by convention only, for the same reason `budgets` is.
export default Table.make(() => Schema.Struct({ ...replicated, ...mainBudgetFields }))
    .index("by_user_and_seq", ["userId", "seq"])
    .index("by_user_and_localId", ["userId", "localId"]);
