import { Table } from "@confect/core";
import * as Schema from "effect/Schema";

import { outsideMoveFields, replicated } from "../lib/syncTables";

export default Table.make(() => Schema.Struct({ ...replicated, ...outsideMoveFields }))
    .index("by_user_and_seq", ["userId", "seq"])
    .index("by_user_and_localId", ["userId", "localId"]);
