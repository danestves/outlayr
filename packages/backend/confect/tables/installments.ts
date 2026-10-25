import { Table } from "@confect/core";
import * as Schema from "effect/Schema";

import { installmentFields, replicated } from "../lib/syncTables";

// Paid status is derived on the device, never stored.
export default Table.make(() => Schema.Struct({ ...replicated, ...installmentFields }))
    .index("by_user_and_seq", ["userId", "seq"])
    .index("by_user_and_localId", ["userId", "localId"]);
