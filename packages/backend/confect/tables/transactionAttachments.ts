import { Table } from "@confect/core";
import * as Schema from "effect/Schema";

import { replicated, transactionAttachmentFields } from "../lib/syncTables";

export default Table.make(() => Schema.Struct({ ...replicated, ...transactionAttachmentFields }))
    .index("by_user_and_seq", ["userId", "seq"])
    .index("by_user_and_localId", ["userId", "localId"])
    .index("by_user_and_imageKey", ["userId", "imageKey"]);
