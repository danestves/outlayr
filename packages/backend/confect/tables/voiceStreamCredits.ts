import { Table } from "@confect/core";
import * as Schema from "effect/Schema";

// One row is one counted capture that `speakText` may still spend on the thread.
export default Table.make(() => Schema.Struct({ threadId: Schema.String })).index("by_threadId", ["threadId"]);
