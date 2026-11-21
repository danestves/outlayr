import { FunctionSpec, GroupSpec } from "@confect/core";
import * as Schema from "effect/Schema";

import { Id } from "./_generated/id";
import outboundEmails from "./_generated/tables/outboundEmails";
import type { settled } from "./emailOutbox";
import { Notice } from "./tables/outboundEmails";

export default GroupSpec.make()
    .addFunction(
        FunctionSpec.internalMutation({
            args: () => ({
                html: Schema.optional(Schema.String),
                notice: Schema.optional(Notice),
                replyTo: Schema.optional(Schema.String),
                subject: Schema.String,
                text: Schema.String,
                to: Schema.String,
            }),
            name: "enqueue",
            returns: () => Schema.Null,
        })
    )
    .addFunction(
        FunctionSpec.internalQuery({
            args: () => ({ emailId: Id("outboundEmails") }),
            name: "email",
            returns: () => Schema.NullOr(outboundEmails.Doc),
        })
    )
    .addFunction(FunctionSpec.convexInternalMutation<typeof settled>()("settled"));
