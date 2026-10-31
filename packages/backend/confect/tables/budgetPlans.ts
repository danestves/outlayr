import { Table } from "@confect/core";
import * as Schema from "effect/Schema";

import { budgetPlanFields, replicated } from "../lib/syncTables";

export default Table.make(() => Schema.Struct({ ...replicated, ...budgetPlanFields }))
    .index("by_user_and_seq", ["userId", "seq"])
    .index("by_user_and_localId", ["userId", "localId"]);
