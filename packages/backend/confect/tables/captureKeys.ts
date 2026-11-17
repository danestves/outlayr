import { Table } from "@confect/core";
import * as Schema from "effect/Schema";

export default Table.make(() =>
    Schema.Struct({
        deviceId: Schema.String,
        keyHash: Schema.String,
        userId: Schema.String,
    })
)
    .index("by_keyHash", ["keyHash"])
    .index("by_user_and_device", ["userId", "deviceId"]);
