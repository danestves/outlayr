import { FunctionSpec, GroupSpec } from "@confect/core";
import * as Schema from "effect/Schema";

import { Id } from "./_generated/id";

const DueReminder = Schema.Struct({
    auth: Schema.String,
    day: Schema.String,
    endpoint: Schema.String,
    id: Id("webPushSubscriptions"),
    locale: Schema.String,
    p256dh: Schema.String,
});

export default GroupSpec.make()
    .addFunction(
        FunctionSpec.publicQuery({
            name: "config",
            args: () => ({}),
            returns: () => Schema.Struct({ publicKey: Schema.NullOr(Schema.String) }),
        })
    )
    .addFunction(
        FunctionSpec.publicQuery({
            name: "mine",
            args: () => ({ endpoint: Schema.String }),
            returns: () => Schema.NullOr(Schema.Struct({ dailyMinute: Schema.Number })),
        })
    )
    .addFunction(
        FunctionSpec.publicMutation({
            name: "save",
            args: () => ({
                auth: Schema.String,
                dailyMinute: Schema.Number,
                endpoint: Schema.String,
                locale: Schema.String,
                p256dh: Schema.String,
                timeZone: Schema.String,
            }),
            returns: () => Schema.Null,
        })
    )
    .addFunction(
        FunctionSpec.publicMutation({
            name: "remove",
            args: () => ({ endpoint: Schema.String }),
            returns: () => Schema.Null,
        })
    )
    .addFunction(
        FunctionSpec.internalQuery({ name: "due", args: () => ({}), returns: () => Schema.Array(DueReminder) })
    )
    .addFunction(
        FunctionSpec.internalMutation({
            name: "markSent",
            args: () => ({ day: Schema.String, id: Id("webPushSubscriptions") }),
            returns: () => Schema.Null,
        })
    )
    .addFunction(
        FunctionSpec.internalMutation({
            name: "drop",
            args: () => ({ id: Id("webPushSubscriptions") }),
            returns: () => Schema.Null,
        })
    )
    .addFunction(FunctionSpec.internalAction({ name: "sendDue", args: () => ({}), returns: () => Schema.Null }));
