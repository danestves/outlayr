import { Table } from "@confect/core";
import * as Schema from "effect/Schema";

export const ApnsEnvironment = Schema.Literals(["development", "production"]);

export const PushTarget = Schema.Struct({ environment: ApnsEnvironment, secret: Schema.String, token: Schema.String });

export default Table.make(() =>
    Schema.Struct({
        deviceId: Schema.String,
        keyHash: Schema.String,
        push: Schema.optional(PushTarget),
        userId: Schema.String,
    })
)
    .index("by_keyHash", ["keyHash"])
    .index("by_user_and_device", ["userId", "deviceId"]);
