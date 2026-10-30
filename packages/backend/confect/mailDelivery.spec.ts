import { FunctionSpec, GroupSpec } from "@confect/core";
import * as Schema from "effect/Schema";

import { LegalDocument } from "./legal";
import { Entitlement } from "./mail.spec";

export default GroupSpec.make()
    .addFunction(
        FunctionSpec.internalAction({
            name: "sendWelcome",
            args: () => ({ userId: Schema.String }),
            returns: () => Schema.Null,
        })
    )
    .addFunction(
        FunctionSpec.internalAction({
            name: "sendPro",
            args: () => ({ ...Entitlement, familyShared: Schema.Boolean, userId: Schema.String }),
            returns: () => Schema.Null,
        })
    )
    .addFunction(
        FunctionSpec.internalAction({
            name: "notifyPolicy",
            args: () => ({ cursor: Schema.optional(Schema.String), document: LegalDocument }),
            returns: () => Schema.Struct({ failed: Schema.Number, sent: Schema.Number }),
        })
    );
