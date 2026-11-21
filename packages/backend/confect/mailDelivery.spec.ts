import { FunctionSpec, GroupSpec } from "@confect/core";
import * as Schema from "effect/Schema";

import { Entitlement } from "./mail.spec";

const OutgoingEmail = {
    html: Schema.optional(Schema.String),
    replyTo: Schema.optional(Schema.String),
    subject: Schema.String,
    text: Schema.String,
    to: Schema.String,
};

export default GroupSpec.makeNode()
    .addFunction(
        FunctionSpec.internalNodeAction({
            name: "send",
            args: () => OutgoingEmail,
            returns: () => Schema.Null,
        })
    )
    .addFunction(
        FunctionSpec.internalNodeAction({
            name: "sendWelcome",
            args: () => ({ userId: Schema.String }),
            returns: () => Schema.Null,
        })
    )
    .addFunction(
        FunctionSpec.internalNodeAction({
            name: "sendPro",
            args: () => ({ ...Entitlement, familyShared: Schema.Boolean, userId: Schema.String }),
            returns: () => Schema.Null,
        })
    )
    .addFunction(
        FunctionSpec.internalNodeAction({
            name: "sendTrialReminder",
            args: () => ({ userId: Schema.String }),
            returns: () => Schema.Null,
        })
    )
    .addFunction(
        FunctionSpec.internalNodeAction({
            name: "notifyPolicy",
            args: () => ({ cursor: Schema.optional(Schema.String) }),
            returns: () => Schema.Struct({ failed: Schema.Number, sent: Schema.Number }),
        })
    );
