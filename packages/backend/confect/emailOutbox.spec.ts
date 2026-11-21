import { FunctionSpec, GroupSpec } from "@confect/core";
import * as Schema from "effect/Schema";

import { Id } from "./_generated/id";
import outboundEmails from "./_generated/tables/outboundEmails";
import type { settled } from "./emailOutbox";
import { OutboundEmail } from "./tables/outboundEmails";

export default GroupSpec.make()
    .addFunction(
        FunctionSpec.internalMutation({
            args: () => OutboundEmail.fields,
            name: "enqueue",
            returns: () => Schema.Boolean,
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
