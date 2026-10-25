import { Table } from "@confect/core";
import * as Schema from "effect/Schema";

import { replicated, transactionColumns } from "../lib/syncTables";

// `by_user_and_imageKey` exists so photos.releaseUnreferenced can ask whether any row still names an object.
// `amount` is float64 on both sides (SQLite REAL), so it round-trips bit for bit. `amountUsd` and the rate
// fields are frozen at write and move only with `amount`, `currency` and `date`; nothing here recomputes them.
export default Table.make(() => Schema.Struct({ ...replicated, ...transactionColumns }))
    .index("by_user_and_seq", ["userId", "seq"])
    .index("by_user_and_localId", ["userId", "localId"])
    .index("by_user_and_imageKey", ["userId", "imageKey"])
    .index("by_user_and_deletedAt_and_date", ["userId", "deletedAt", "date"])
    .index("by_user_and_deletedAt_and_recurringType", ["userId", "deletedAt", "recurringType"]);
