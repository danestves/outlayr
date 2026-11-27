import { FunctionSpec, GroupSpec } from "@confect/core";
import * as Schema from "effect/Schema";

import { Id } from "./_generated/id";
import { Entitlement } from "./mail.spec";

export default GroupSpec.makeNode()
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
            name: "notifyPolicy",
            args: () => ({ cursor: Schema.optional(Schema.String) }),
            returns: () => Schema.Struct({ failed: Schema.Number, sent: Schema.Number }),
        })
    )
    .addFunction(
        FunctionSpec.internalNodeAction({
            name: "deliver",
            args: () => ({ emailId: Id("outboundEmails") }),
            returns: () => Schema.NullOr(Schema.String),
        })
    );
