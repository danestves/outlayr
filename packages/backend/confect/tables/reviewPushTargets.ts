import { Table } from "@confect/core";
import * as Schema from "effect/Schema";

import { ApnsEnvironment } from "./captureKeys";

export default Table.make(() =>
    Schema.Struct({
        alertedAt: Schema.optional(Schema.Number),
        deviceId: Schema.String,
        environment: ApnsEnvironment,
        token: Schema.String,
        userId: Schema.String,
    })
).index("by_user_and_device", ["userId", "deviceId"]);
