import { Table } from "@confect/core";
import * as Schema from "effect/Schema";

import { Id } from "../_generated/id";
import { ProposedDraft } from "../lib/voiceDraft";

export default Table.make(() =>
    Schema.Struct({
        order: Schema.Number,
        proposed: Schema.optional(ProposedDraft),
        reply: Schema.optional(Schema.String),
        said: Schema.String,
        threadId: Id("voiceThreads"),
    })
).index("by_threadId_and_order", ["threadId", "order"]);
