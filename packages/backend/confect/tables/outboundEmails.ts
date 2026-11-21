import { Table } from "@confect/core";
import { LANGUAGES } from "@outlayr/email/language";
import * as Schema from "effect/Schema";

import { Id } from "../_generated/id";

export const Notice = Schema.Struct({
    keys: Schema.Array(Schema.String),
    language: Schema.Literals(LANGUAGES),
    userId: Schema.String,
});

export const OutboundEmail = Schema.Struct({
    expiresAt: Schema.optional(Schema.Number),
    html: Schema.optional(Schema.String),
    notice: Schema.optional(Notice),
    replyTo: Schema.optional(Schema.String),
    subject: Schema.String,
    text: Schema.String,
    to: Schema.String,
});

export default Table.make(() =>
    Schema.Struct({ ...OutboundEmail.fields, expiry: Schema.optional(Id("_scheduled_functions")) })
).index("by_notice", ["notice.userId"]);
